using EMS.Application.Auth.Settings;
using EMS.Infrastructure.Auth;
using EMS.Tests.Helpers;
using Microsoft.Extensions.Options;

namespace EMS.Tests.Auth;

/// <summary>Uses the real JWT implementation (no mocks) to prove tokens are signed, scoped and tamper-proof.</summary>
public class TokenServiceTests
{
    private static JwtSettings Settings() => new()
    {
        AccessTokenSecret = "access-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
        RefreshTokenSecret = "refresh-secret-9876543210-zyxwvutsrqponmlkjihgfedcba",
        Issuer = "ems-test",
        Audience = "ems-test-web"
    };

    private static TokenService Create(JwtSettings? settings = null) => new(Options.Create(settings ?? Settings()));

    [Fact]
    public async Task RefreshToken_RoundTrips_ToTheUserId()
    {
        var sut = Create();
        var token = sut.GenerateRefreshToken(TestData.User(id: 42));

        Assert.Equal(42, await sut.ValidateRefreshTokenAsync(token));
    }

    [Fact]
    public async Task AccessToken_IsNotAcceptedAsARefreshToken()
    {
        var sut = Create();
        var accessToken = sut.GenerateAccessToken(TestData.User(id: 7));

        Assert.Null(await sut.ValidateRefreshTokenAsync(accessToken));
    }

    [Fact]
    public async Task TamperedToken_IsRejected()
    {
        var sut = Create();
        var token = sut.GenerateRefreshToken(TestData.User());
        var tampered = token[..^3] + (token.EndsWith("abc") ? "xyz" : "abc");

        Assert.Null(await sut.ValidateRefreshTokenAsync(tampered));
    }

    [Fact]
    public async Task Token_SignedWithAnotherSecret_IsRejected()
    {
        var other = Settings();
        other.RefreshTokenSecret = "a-completely-different-refresh-secret-0123456789";
        var forged = Create(other).GenerateRefreshToken(TestData.User());

        Assert.Null(await Create().ValidateRefreshTokenAsync(forged));
    }

    [Fact]
    public async Task ExpiredToken_IsRejected()
    {
        var settings = Settings();
        settings.RefreshTokenDays = -1; // already expired when issued
        var sut = Create(settings);

        Assert.Null(await sut.ValidateRefreshTokenAsync(sut.GenerateRefreshToken(TestData.User())));
    }

    [Fact]
    public async Task Garbage_IsRejected()
    {
        Assert.Null(await Create().ValidateRefreshTokenAsync("not.a.jwt"));
    }

    [Fact]
    public void EveryRefreshToken_IsUnique_EvenForTheSameUserInTheSameSecond()
    {
        var sut = Create();
        var user = TestData.User();

        Assert.NotEqual(sut.GenerateRefreshToken(user), sut.GenerateRefreshToken(user));
    }

    [Fact]
    public void HashToken_IsDeterministic_64HexChars_AndNeverTheRawToken()
    {
        var sut = Create();

        var hash = sut.HashToken("some-token");

        Assert.Equal(hash, sut.HashToken("some-token"));
        Assert.Equal(64, hash.Length);
        Assert.Matches("^[0-9A-F]{64}$", hash);
        Assert.NotEqual(hash, sut.HashToken("other-token"));
    }
}

public class BCryptPasswordHasherTests
{
    private readonly BCryptPasswordHasher _sut = new();

    [Fact]
    public void Hash_VerifiesOnlyTheOriginalPassword()
    {
        var hash = _sut.Hash("Correct#Horse1");

        Assert.True(_sut.Verify("Correct#Horse1", hash));
        Assert.False(_sut.Verify("correct#horse1", hash));
    }

    [Fact]
    public void Hash_IsSalted_SoTheSamePasswordGivesDifferentHashes()
    {
        Assert.NotEqual(_sut.Hash("same"), _sut.Hash("same"));
    }

    [Fact]
    public void Hash_DoesNotContainThePlainPassword()
    {
        Assert.DoesNotContain("plain-secret", _sut.Hash("plain-secret"));
    }
}
