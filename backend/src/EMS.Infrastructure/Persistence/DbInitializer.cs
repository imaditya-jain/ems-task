using EMS.Application.Auth.Interfaces;
using EMS.Domain.Entities;
using EMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace EMS.Infrastructure.Persistence;

public static class DbInitializer
{
    /// <summary>Applies pending migrations (development convenience) and creates the first admin if none exists.</summary>
    public static async Task InitializeAsync(IServiceProvider services, bool applyMigrations)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;
        var logger = provider.GetRequiredService<ILogger<AppDbContext>>();

        if (applyMigrations)
            await provider.GetRequiredService<AppDbContext>().Database.MigrateAsync();

        var users = provider.GetRequiredService<IUserRepository>();
        if (await users.AnyAsync()) return;

        var config = provider.GetRequiredService<IConfiguration>();
        var email = config["Seed:AdminEmail"];
        var password = config["Seed:AdminPassword"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning("No users exist and Seed:AdminEmail / Seed:AdminPassword are not set. Skipping admin seed.");
            return;
        }

        var hasher = provider.GetRequiredService<IPasswordHasher>();
        await users.AddAsync(new User
        {
            FullName = "System Admin",
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = hasher.Hash(password),
            Role = UserRole.Admin
        });
        await users.SaveChangesAsync();

        logger.LogInformation("Seeded initial admin account {Email}.", email);
    }
}
