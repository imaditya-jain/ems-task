using EMS.Application.Auth.Interfaces;
using EMS.Application.Auth.Services;
using EMS.Application.Departments.Interfaces;
using EMS.Application.Departments.Services;
using Microsoft.Extensions.DependencyInjection;

namespace EMS.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IDepartmentService, DepartmentService>();
        return services;
    }
}
