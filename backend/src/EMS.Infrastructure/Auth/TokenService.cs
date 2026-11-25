using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using EMS.Application.Auth.Interfaces;
using EMS.Application.Auth.Settings;
using EMS.Domain.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace EMS.Infrastructure.Auth;

public class TokenService(IOptions<JwtSettings> options) : ITokenService
{
    private readonly JwtSettings _jwt = options.Value;
    private readonly JsonWebTokenHandler _handler = new();

    public string GenerateAccessToken(User user) =>
        CreateToken(user, _jwt.AccessTokenSecret, DateTime.UtcNow.AddMinutes(_jwt.AccessTokenMinutes), includeRole: true);

    public string GenerateRefreshToken(User user) =>
        CreateToken(user, _jwt.RefreshTokenSecret, DateTime.UtcNow.AddDays(_jwt.RefreshTokenDays), includeRole: false);

    public async Task<int?> ValidateRefreshTokenAsync(string refreshToken)
    {
        var result = await _handler.ValidateTokenAsync(refreshToken, new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = _jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = _jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = BuildKey(_jwt.RefreshTokenSecret),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        });

        if (!result.IsValid) return null;

        var subject = result.ClaimsIdentity.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        return int.TryParse(subject, out var userId) ? userId : null;
    }

    /// <summary>Refresh tokens are high-entropy, so a fast SHA-256 is enough (no salt/work factor needed).</summary>
    public string HashToken(string token) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private string CreateToken(User user, string secret, DateTime expires, bool includeRole)
    {
        var claims = new Dictionary<string, object>
        {
            [JwtRegisteredClaimNames.Sub] = user.Id.ToString(),
            // jti makes every token unique, so a rotated refresh token always differs from the old one.
            [JwtRegisteredClaimNames.Jti] = Guid.NewGuid().ToString()
        };

        if (includeRole)
        {
            claims[JwtRegisteredClaimNames.Email] = user.Email;
            claims[ClaimTypes.Role] = user.Role.ToString();
        }

        return _handler.CreateToken(new SecurityTokenDescriptor
        {
            Issuer = _jwt.Issuer,
            Audience = _jwt.Audience,
            Claims = claims,
            Expires = expires,
            SigningCredentials = new SigningCredentials(BuildKey(secret), SecurityAlgorithms.HmacSha256)
        });
    }

    public static SymmetricSecurityKey BuildKey(string secret) => new(Encoding.UTF8.GetBytes(secret));
}
