using System.Security.Claims;
using EMS.Api.Extensions;
using EMS.Application.Auth.Dtos;
using EMS.Application.Auth.Interfaces;
using EMS.Application.Auth.Settings;
using EMS.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace EMS.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController(IAuthService authService, IOptions<JwtSettings> jwtOptions) : ControllerBase
{
    private readonly JwtSettings _jwt = jwtOptions.Value;

    [HttpPost("login")]
    [EnableRateLimiting(ServiceCollectionExtensions.LoginRateLimitPolicy)]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken ct)
    {
        var result = await authService.LoginAsync(request, ct);
        AuthCookies.Set(HttpContext, result.Tokens, _jwt);

        return Ok(ApiResponse<object>.Ok(new { user = result.User }, "Logged in successfully."));
    }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        try
        {
            var result = await authService.RefreshAsync(Request.Cookies[AuthCookies.RefreshToken], ct);
            AuthCookies.Set(HttpContext, result.Tokens, _jwt);

            return Ok(ApiResponse<object>.Ok(new { user = result.User }, "Session refreshed."));
        }
        catch
        {
            // Any refresh failure leaves the browser with dead cookies, so remove them.
            AuthCookies.Clear(HttpContext);
            throw;
        }
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        await authService.LogoutAsync(Request.Cookies[AuthCookies.RefreshToken], ct);
        AuthCookies.Clear(HttpContext);

        return Ok(ApiResponse.Ok("Logged out successfully."));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue("sub")!);
        var user = await authService.GetCurrentUserAsync(userId, ct);

        return Ok(ApiResponse<object>.Ok(new { user }));
    }
}
