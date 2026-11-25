using EMS.Application.Auth.Interfaces;
using EMS.Application.Attendance.Interfaces;
using EMS.Application.Auth.Settings;
using EMS.Application.Departments.Interfaces;
using EMS.Application.Employees.Interfaces;
using EMS.Infrastructure.Auth;
using EMS.Infrastructure.Persistence;
using EMS.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EMS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is missing.");

        services.AddDbContext<AppDbContext>(options => options.UseMySQL(connectionString));

        services.AddOptions<JwtSettings>()
            .Bind(configuration.GetSection(JwtSettings.SectionName))
            .Validate(s => s.AccessTokenSecret.Length >= 32 && s.RefreshTokenSecret.Length >= 32,
                "Jwt secrets must be at least 32 characters.")
            .Validate(s => s.AccessTokenSecret != s.RefreshTokenSecret,
                "Access and refresh token secrets must be different.")
            .ValidateOnStart();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IDepartmentRepository, DepartmentRepository>();
        services.AddScoped<IEmployeeRepository, EmployeeRepository>();
        services.AddScoped<IAttendanceRepository, AttendanceRepository>();
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddSingleton<ITokenService, TokenService>();

        return services;
    }
}
