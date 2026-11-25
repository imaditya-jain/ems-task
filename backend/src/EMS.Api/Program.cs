using EMS.Api.Extensions;
using EMS.Api.Middleware;
using EMS.Application;
using EMS.Infrastructure;
using EMS.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApiControllers();
builder.Services.AddOpenApi();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddCookieJwtAuthentication();
builder.Services.AddLoginRateLimiter();

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
await DbInitializer.InitializeAsync(app.Services, applyMigrations: app.Environment.IsDevelopment());

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
