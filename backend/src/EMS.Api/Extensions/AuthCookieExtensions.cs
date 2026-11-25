using EMS.Application.Auth.Dtos;
using EMS.Application.Auth.Settings;

namespace EMS.Api.Extensions;

public static class AuthCookies
{
    public const string AccessToken = "accessToken";
    public const string RefreshToken = "refreshToken";

    // Refresh cookie is only sent to the auth endpoints, never to normal API calls.
    private const string RefreshPath = "/api/v1/auth";

    public static void Set(HttpContext context, TokenPair tokens, JwtSettings jwt)
    {
        context.Response.Cookies.Append(AccessToken, tokens.AccessToken,
            Options("/", TimeSpan.FromMinutes(jwt.AccessTokenMinutes), context));

        context.Response.Cookies.Append(RefreshToken, tokens.RefreshToken,
            Options(RefreshPath, TimeSpan.FromDays(jwt.RefreshTokenDays), context));
    }

    public static void Clear(HttpContext context)
    {
        context.Response.Cookies.Delete(AccessToken, Options("/", null, context));
        context.Response.Cookies.Delete(RefreshToken, Options(RefreshPath, null, context));
    }

    private static CookieOptions Options(string path, TimeSpan? maxAge, HttpContext context) => new()
    {
        HttpOnly = true,
        Secure = context.Request.IsHttps,
        SameSite = SameSiteMode.Strict,
        Path = path,
        MaxAge = maxAge
    };
}
