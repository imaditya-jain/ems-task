using EMS.Application.Auth.Interfaces;
using EMS.Domain.Entities;
using EMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EMS.Infrastructure.Repositories;

public class UserRepository(AppDbContext context) : IUserRepository
{
    public Task<User?> GetByIdAsync(int id, CancellationToken ct = default) =>
        context.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default) =>
        context.Users.FirstOrDefaultAsync(u => u.Email == email, ct);

    public Task<bool> AnyAsync(CancellationToken ct = default) => context.Users.AnyAsync(ct);

    public async Task AddAsync(User user, CancellationToken ct = default) =>
        await context.Users.AddAsync(user, ct);

    public Task SaveChangesAsync(CancellationToken ct = default) => context.SaveChangesAsync(ct);
}
