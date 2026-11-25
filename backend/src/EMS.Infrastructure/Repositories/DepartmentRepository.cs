using EMS.Application.Departments.Interfaces;
using EMS.Domain.Entities;
using EMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EMS.Infrastructure.Repositories;

public class DepartmentRepository(AppDbContext context) : IDepartmentRepository
{
    public Task<List<Department>> GetAllAsync(string? search, CancellationToken ct = default)
    {
        var query = context.Departments.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(d => d.Name.Contains(search));

        return query.OrderBy(d => d.Name).ToListAsync(ct);
    }

    public Task<Department?> GetByIdAsync(int id, CancellationToken ct = default) =>
        context.Departments.FirstOrDefaultAsync(d => d.Id == id, ct);

    public Task<bool> NameExistsAsync(string name, int? excludeId, CancellationToken ct = default) =>
        context.Departments.AnyAsync(d => d.Name == name && d.Id != excludeId, ct);

    public async Task AddAsync(Department department, CancellationToken ct = default) =>
        await context.Departments.AddAsync(department, ct);

    public void Remove(Department department) => context.Departments.Remove(department);

    public Task SaveChangesAsync(CancellationToken ct = default) => context.SaveChangesAsync(ct);
}
