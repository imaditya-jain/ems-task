using System.Text.Json;
using System.Text.RegularExpressions;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using EMS.Api.Extensions;
using EMS.Application.Auth.Settings;
using EMS.Application.Common.Models;
using EMS.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace EMS.Api.Extensions;

public static partial class ServiceCollectionExtensions
{
    public const string LoginRateLimitPolicy = "login";

    /// <summary>Controllers whose validation failures use the same { success, error } envelope as every other error.</summary>
    public static IServiceCollection AddApiControllers(this IServiceCollection services)
    {
        services.AddControllers()
            .AddJsonOptions(options =>
                // Enums travel as readable strings ("Female") instead of numbers.
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()))
            .ConfigureApiBehaviorOptions(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                // Keys like "Employees[2].Email" come from bulk imports; turn them into "Row 3: ..." messages.
                var entries = context.ModelState.Where(e => e.Value!.Errors.Count > 0).ToList();

                // When the body cannot be parsed MVC also adds a generic "request field is required" entry; drop it
                // if there is a more specific message.
                if (entries.Count > 1) entries.RemoveAll(e => e.Key is "" or "request");

                var errors = entries
                    .SelectMany(entry => entry.Value!.Errors.Select(e => FormatError(entry.Key, e.ErrorMessage)))
                    .Where(message => !string.IsNullOrWhiteSpace(message))
                    .Distinct()
                    .ToList();

                var first = errors.FirstOrDefault() ?? "Invalid request.";
                return new BadRequestObjectResult(ApiResponse.Fail(first, errors.Count > 1 ? errors : null));
            };
        });

        return services;
    }

    private static string FormatError(string key, string message)
    {
        // Raw System.Text.Json messages ("The JSON value could not be converted to ...") mean the client sent a
        // value of the wrong type or an unknown enum name.
        if (message.StartsWith("The JSON value could not be converted", StringComparison.Ordinal))
            message = $"Invalid value for '{key.Split('.').Last().TrimStart('$')}'.";

        var match = RowIndexPattern().Match(key);
        return match.Success ? $"Row {int.Parse(match.Groups[1].Value) + 1}: {message}" : message;
    }

    [GeneratedRegex(@"\[(\d+)\]")]
    private static partial Regex RowIndexPattern();

    /// <summary>JWT bearer auth that reads the access token from the httpOnly cookie instead of the Authorization header.</summary>
    public static IServiceCollection AddCookieJwtAuthentication(this IServiceCollection services)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();

        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtSettings>>((options, jwtOptions) =>
            {
                var jwt = jwtOptions.Value;

                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = TokenService.BuildKey(jwt.AccessTokenSecret),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                    NameClaimType = JwtRegisteredClaimNames.Sub,
                    RoleClaimType = System.Security.Claims.ClaimTypes.Role
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        context.Token = context.Request.Cookies[AuthCookies.AccessToken];
                        return Task.CompletedTask;
                    },
                    OnChallenge = async context =>
                    {
                        // Replace the default empty 401 with our JSON envelope.
                        context.HandleResponse();
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync(JsonSerializer.Serialize(
                            ApiResponse.Fail("Unauthorized."),
                            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
                    }
                };
            });

        services.AddAuthorization();
        return services;
    }

    /// <summary>Brute-force protection for the login endpoint: 5 attempts per minute per IP.</summary>
    public static IServiceCollection AddLoginRateLimiter(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = async (context, token) =>
            {
                context.HttpContext.Response.ContentType = "application/json";
                await context.HttpContext.Response.WriteAsync(JsonSerializer.Serialize(
                    ApiResponse.Fail("Too many attempts. Please try again in a minute."),
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }), token);
            };

            options.AddPolicy(LoginRateLimitPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 5,
                        Window = TimeSpan.FromMinutes(1),
                        QueueLimit = 0
                    }));
        });

        return services;
    }
}
