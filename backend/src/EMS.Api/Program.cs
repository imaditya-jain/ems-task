using EMS.Api.Extensions;
using EMS.Api.Middleware;
using EMS.Application;
using EMS.Infrastructure;
using EMS.Infrastructure.Persistence;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

// Behind a reverse proxy (Nginx terminating TLS) the API only sees plain HTTP. Reading X-Forwarded-* lets
// Request.IsHttps (used for the Secure cookie flag) and the client IP (used by the login rate limiter) be correct.
// By default only proxies on the same machine (loopback) are trusted; add KnownProxies/KnownNetworks for others.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto);

builder.Services.AddApiControllers();
builder.Services.AddOpenApi();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddCookieJwtAuthentication();
builder.Services.AddLoginRateLimiter(Math.Max(builder.Configuration.GetValue("RateLimiting:LoginPermitLimit", 5), 1));

// Frontend talks to the API with httpOnly cookies, so credentials must be allowed
// and the origin list must be explicit (no wildcard).
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

var app = builder.Build();

// In production, migrations are applied explicitly with `dotnet ef database update`.
// Demo data is for development and automated tests only: the flag is ignored in Production.
await DbInitializer.InitializeAsync(
    app.Services,
    applyMigrations: app.Environment.IsDevelopment(),
    allowDemoData: !app.Environment.IsProduction());

app.UseForwardedHeaders();
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGet("/api/v1/health", () => Results.Ok(new { success = true, message = "API is running." }));

app.Run();
