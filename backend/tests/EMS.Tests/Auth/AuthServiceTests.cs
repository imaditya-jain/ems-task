using EMS.Application.Auth.Dtos;
using EMS.Application.Auth.Interfaces;
using EMS.Application.Auth.Services;
using EMS.Application.Auth.Settings;
using EMS.Application.Common.Exceptions;
using EMS.Domain.Entities;
using EMS.Tests.Helpers;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace EMS.Tests.Auth;

public class AuthServiceTests
{
    private readonly IUserRepository _users = Substitute.For<IUserRepository>();
    private readonly IPasswordHasher _hasher = Substitute.For<IPasswordHasher>();
    private readonly ITokenService _tokens = Substitute.For<ITokenService>();
    private readonly AuthService _sut;

    public AuthServiceTests()
    {
        _tokens.GenerateAccessToken(Arg.Any<User>()).Returns("access-token");
        _tokens.GenerateRefreshToken(Arg.Any<User>()).Returns("refresh-token");
        _tokens.HashToken(Arg.Any<string>()).Returns(call => "hash:" + call.Arg<string>());

        _sut = new AuthService(_users, _hasher, _tokens, Options.Create(new JwtSettings { RefreshTokenDays = 7 }));
    }

    // ---- login ---------------------------------------------------------------------------------

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsUserAndTokens_AndStoresOnlyTheRefreshTokenHash()
    {
        var user = TestData.User();
        _users.GetByEmailAsync("admin@corp.com").Returns(user);
        _hasher.Verify("secret", user.PasswordHash).Returns(true);

        var result = await _sut.LoginAsync(new LoginRequest { Email = "admin@corp.com", Password = "secret" });

        Assert.Equal("access-token", result.Tokens.AccessToken);
        Assert.Equal("refresh-token", result.Tokens.RefreshToken);
        Assert.Equal("hash:refresh-token", user.RefreshTokenHash);
        Assert.NotEqual("refresh-token", user.RefreshTokenHash);
        Assert.True(user.RefreshTokenExpiresAt > DateTime.UtcNow.AddDays(6));
        await _users.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task Login_NormalisesEmail_BeforeLookup()
    {
        var user = TestData.User();
        _users.GetByEmailAsync("admin@corp.com").Returns(user);
        _hasher.Verify(Arg.Any<string>(), Arg.Any<string>()).Returns(true);

        await _sut.LoginAsync(new LoginRequest { Email = "  Admin@Corp.COM ", Password = "secret" });

        await _users.Received(1).GetByEmailAsync("admin@corp.com");
    }

    [Fact]
    public async Task Login_WithWrongPassword_ThrowsUnauthorized()
    {
        _users.GetByEmailAsync(Arg.Any<string>()).Returns(TestData.User());
        _hasher.Verify(Arg.Any<string>(), Arg.Any<string>()).Returns(false);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            _sut.LoginAsync(new LoginRequest { Email = "admin@corp.com", Password = "wrong" }));
    }

    [Fact]
    public async Task Login_UnknownUserAndWrongPassword_GiveTheSameMessage_SoAccountsCannotBeEnumerated()
    {
        _users.GetByEmailAsync("ghost@corp.com").Returns((User?)null);
        _users.GetByEmailAsync("admin@corp.com").Returns(TestData.User());
        _hasher.Verify(Arg.Any<string>(), Arg.Any<string>()).Returns(false);

        var unknown = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            _sut.LoginAsync(new LoginRequest { Email = "ghost@corp.com", Password = "x" }));
        var wrong = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            _sut.LoginAsync(new LoginRequest { Email = "admin@corp.com", Password = "x" }));

        Assert.Equal(unknown.Message, wrong.Message);
    }

    [Fact]
    public async Task Login_Failure_DoesNotIssueOrPersistTokens()
    {
        _users.GetByEmailAsync(Arg.Any<string>()).Returns(TestData.User());
        _hasher.Verify(Arg.Any<string>(), Arg.Any<string>()).Returns(false);

        await Assert.ThrowsAsync<UnauthorizedException>(() =>
            _sut.LoginAsync(new LoginRequest { Email = "admin@corp.com", Password = "bad" }));

        _tokens.DidNotReceive().GenerateAccessToken(Arg.Any<User>());
        await _users.DidNotReceive().SaveChangesAsync();
    }

    // ---- refresh -------------------------------------------------------------------------------

    private User UserWithActiveSession(string currentToken = "old-refresh")
    {
        var user = TestData.User();
        user.RefreshTokenHash = "hash:" + currentToken;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(3);
        _users.GetByIdAsync(user.Id).Returns(user);
        _tokens.ValidateRefreshTokenAsync(currentToken).Returns(user.Id);
        return user;
    }

    [Fact]
    public async Task Refresh_WithCurrentToken_RotatesTheRefreshToken()
    {
        var user = UserWithActiveSession();

        var result = await _sut.RefreshAsync("old-refresh");

        Assert.Equal("refresh-token", result.Tokens.RefreshToken);
        Assert.Equal("hash:refresh-token", user.RefreshTokenHash);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Refresh_WithoutToken_ThrowsUnauthorized(string? token)
    {
        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.RefreshAsync(token));
    }

    [Fact]
    public async Task Refresh_WithInvalidJwt_ThrowsUnauthorized()
    {
        _tokens.ValidateRefreshTokenAsync("garbage").Returns((int?)null);

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.RefreshAsync("garbage"));
    }

    [Fact]
    public async Task Refresh_WithAlreadyRotatedToken_RevokesTheWholeSession()
    {
        // The user's current token is "new-refresh"; the attacker/browser replays "old-refresh".
        var user = UserWithActiveSession("new-refresh");
        _tokens.ValidateRefreshTokenAsync("old-refresh").Returns(user.Id);

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.RefreshAsync("old-refresh"));

        Assert.Null(user.RefreshTokenHash);
        Assert.Null(user.RefreshTokenExpiresAt);
    }

    [Fact]
    public async Task Refresh_WhenStoredSessionHasExpired_ThrowsAndRevokes()
    {
        var user = UserWithActiveSession();
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddMinutes(-1);

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.RefreshAsync("old-refresh"));

        Assert.Null(user.RefreshTokenHash);
    }

    [Fact]
    public async Task Refresh_AfterLogout_ThrowsUnauthorized()
    {
        var user = UserWithActiveSession();
        user.RefreshTokenHash = null; // logout cleared it

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.RefreshAsync("old-refresh"));
    }

    [Fact]
    public async Task Refresh_ForDeletedUser_ThrowsUnauthorized()
    {
        _tokens.ValidateRefreshTokenAsync("orphan").Returns(99);
        _users.GetByIdAsync(99).Returns((User?)null);

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.RefreshAsync("orphan"));
    }

    // ---- logout --------------------------------------------------------------------------------

    [Fact]
    public async Task Logout_ClearsTheStoredRefreshToken()
    {
        var user = UserWithActiveSession();

        await _sut.LogoutAsync("old-refresh");

        Assert.Null(user.RefreshTokenHash);
        await _users.Received().SaveChangesAsync();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not-a-valid-token")]
    public async Task Logout_IsForgiving_WhenTokenIsMissingOrInvalid(string? token)
    {
        _tokens.ValidateRefreshTokenAsync(Arg.Any<string>()).Returns((int?)null);

        await _sut.LogoutAsync(token); // must not throw

        await _users.DidNotReceive().SaveChangesAsync();
    }

    // ---- current user --------------------------------------------------------------------------

    [Fact]
    public async Task GetCurrentUser_ReturnsSafeUserData()
    {
        _users.GetByIdAsync(1).Returns(TestData.User());

        var dto = await _sut.GetCurrentUserAsync(1);

        Assert.Equal("admin@corp.com", dto.Email);
        Assert.Equal("Admin", dto.Role);
    }

    [Fact]
    public async Task GetCurrentUser_WhenUserWasRemoved_ThrowsUnauthorized()
    {
        _users.GetByIdAsync(5).Returns((User?)null);

        await Assert.ThrowsAsync<UnauthorizedException>(() => _sut.GetCurrentUserAsync(5));
    }
}
