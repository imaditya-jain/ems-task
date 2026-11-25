using EMS.Application.Auth.Dtos;
using EMS.Application.Auth.Interfaces;
using EMS.Application.Auth.Settings;
using EMS.Application.Common.Exceptions;
using EMS.Domain.Entities;
using Microsoft.Extensions.Options;

namespace EMS.Application.Auth.Services;

public class AuthService(
    IUserRepository users,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    IOptions<JwtSettings> jwtOptions) : IAuthService
{
    private readonly JwtSettings _jwt = jwtOptions.Value;

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await users.GetByEmailAsync(request.Email.Trim().ToLowerInvariant(), ct);

        // Same message for "no such user" and "wrong password" so accounts cannot be enumerated.
        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        var tokens = await IssueTokensAsync(user, ct);
        return new AuthResult(ToDto(user), tokens);
    }

    public async Task<AuthResult> RefreshAsync(string? refreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            throw new UnauthorizedException("Refresh token is missing.");

        var userId = await tokenService.ValidateRefreshTokenAsync(refreshToken)
                     ?? throw new UnauthorizedException("Invalid refresh token.");

        var user = await users.GetByIdAsync(userId, ct)
                   ?? throw new UnauthorizedException("Invalid refresh token.");

        // The token must be the latest one we issued. An old (already rotated) token means
        // it may have leaked, so the session is revoked entirely.
        var isCurrent = user.RefreshTokenHash == tokenService.HashToken(refreshToken)
                        && user.RefreshTokenExpiresAt > DateTime.UtcNow;

        if (!isCurrent)
        {
            await RevokeAsync(user, ct);
            throw new UnauthorizedException("Session expired. Please sign in again.");
        }

        var tokens = await IssueTokensAsync(user, ct);
        return new AuthResult(ToDto(user), tokens);
    }

    public async Task LogoutAsync(string? refreshToken, CancellationToken ct = default)
    {
        // Logout is forgiving: a missing/invalid token must never block clearing the cookies.
        if (string.IsNullOrWhiteSpace(refreshToken)) return;

        var userId = await tokenService.ValidateRefreshTokenAsync(refreshToken);
        if (userId is null) return;

        var user = await users.GetByIdAsync(userId.Value, ct);
        if (user is not null) await RevokeAsync(user, ct);
    }

    public async Task<UserDto> GetCurrentUserAsync(int userId, CancellationToken ct = default)
    {
        var user = await users.GetByIdAsync(userId, ct)
                   ?? throw new UnauthorizedException("User no longer exists.");

        return ToDto(user);
    }

    private async Task<TokenPair> IssueTokensAsync(User user, CancellationToken ct)
    {
        var accessToken = tokenService.GenerateAccessToken(user);
        var refreshToken = tokenService.GenerateRefreshToken(user);

        user.RefreshTokenHash = tokenService.HashToken(refreshToken);
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays);
        await users.SaveChangesAsync(ct);

        return new TokenPair(accessToken, refreshToken);
    }

    private async Task RevokeAsync(User user, CancellationToken ct)
    {
        user.RefreshTokenHash = null;
        user.RefreshTokenExpiresAt = null;
        await users.SaveChangesAsync(ct);
    }

    private static UserDto ToDto(User user) =>
        new(user.Id, user.FullName, user.Email, user.Role.ToString());
}
