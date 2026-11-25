using EMS.Application.Employees.Dtos;
using EMS.Application.Employees.Interfaces;
using EMS.Domain.Entities;
using EMS.Domain.Enums;
using EMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EMS.Infrastructure.Repositories;

public class EmployeeRepository(AppDbContext context) : IEmployeeRepository
{
    public async Task<(List<Employee> Items, int TotalCount)> GetPagedAsync(EmployeeQuery query, CancellationToken ct = default)
    {
        var employees = context.Employees.AsNoTracking().Include(e => e.Department).AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search;
            employees = employees.Where(e =>
                e.FirstName.Contains(term) || e.LastName.Contains(term) ||
                e.Email.Contains(term) || e.EmployeeCode.Contains(term) ||
                e.Designation.Contains(term));
        }

        if (query.DepartmentId is not null)
            employees = employees.Where(e => e.DepartmentId == query.DepartmentId);

        if (query.Status is not null)
            employees = employees.Where(e => e.Status == query.Status);

        var total = await employees.CountAsync(ct);

        employees = ApplySorting(employees, query.SortBy, query.Descending);

        var items = await employees
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    // Whitelisted sort columns: user input never reaches the query as a raw column name.
    // Id is the tie-breaker so paging stays stable.
    private static IQueryable<Employee> ApplySorting(IQueryable<Employee> query, string? sortBy, bool descending) =>
        (sortBy?.ToLowerInvariant(), descending) switch
        {
            ("code", false) => query.OrderBy(e => e.EmployeeCode).ThenBy(e => e.Id),
            ("code", true) => query.OrderByDescending(e => e.EmployeeCode).ThenBy(e => e.Id),
            ("department", false) => query.OrderBy(e => e.Department.Name).ThenBy(e => e.Id),
            ("department", true) => query.OrderByDescending(e => e.Department.Name).ThenBy(e => e.Id),
            ("joiningdate", false) => query.OrderBy(e => e.JoiningDate).ThenBy(e => e.Id),
            ("joiningdate", true) => query.OrderByDescending(e => e.JoiningDate).ThenBy(e => e.Id),
            ("salary", false) => query.OrderBy(e => e.Salary).ThenBy(e => e.Id),
            ("salary", true) => query.OrderByDescending(e => e.Salary).ThenBy(e => e.Id),
            (_, true) => query.OrderByDescending(e => e.FirstName).ThenByDescending(e => e.LastName).ThenBy(e => e.Id),
            _ => query.OrderBy(e => e.FirstName).ThenBy(e => e.LastName).ThenBy(e => e.Id)
        };

    public Task<Employee?> GetByIdAsync(int id, CancellationToken ct = default) =>
        context.Employees.Include(e => e.Department).FirstOrDefaultAsync(e => e.Id == id, ct);

    public Task<List<Employee>> GetByIdsAsync(IEnumerable<int> ids, CancellationToken ct = default)
    {
        var idList = ids.ToList();
        return context.Employees.Where(e => idList.Contains(e.Id)).ToListAsync(ct);
    }

    public Task<bool> EmployeeCodeExistsAsync(string code, int? excludeId, CancellationToken ct = default) =>
        context.Employees.AnyAsync(e => e.EmployeeCode == code && e.Id != excludeId, ct);

    public Task<bool> EmailExistsAsync(string email, int? excludeId, CancellationToken ct = default) =>
        context.Employees.AnyAsync(e => e.Email == email && e.Id != excludeId, ct);

    public async Task<HashSet<string>> GetExistingCodesAsync(IEnumerable<string> codes, CancellationToken ct = default)
    {
        var list = codes.Distinct().ToList();
        var found = await context.Employees.Where(e => list.Contains(e.EmployeeCode))
            .Select(e => e.EmployeeCode).ToListAsync(ct);
        return new HashSet<string>(found, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<HashSet<string>> GetExistingEmailsAsync(IEnumerable<string> emails, CancellationToken ct = default)
    {
        var list = emails.Distinct().ToList();
        var found = await context.Employees.Where(e => list.Contains(e.Email))
            .Select(e => e.Email).ToListAsync(ct);
        return new HashSet<string>(found, StringComparer.OrdinalIgnoreCase);
    }

    public Task<List<Employee>> GetActiveOptionsAsync(string? search, CancellationToken ct = default)
    {
        var query = context.Employees.AsNoTracking().Where(e => e.Status == EmployeeStatus.Active);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(e => e.FirstName.Contains(search) || e.LastName.Contains(search) || e.EmployeeCode.Contains(search));

        return query.OrderBy(e => e.FirstName).ThenBy(e => e.LastName).ThenBy(e => e.Id).ToListAsync(ct);
    }

    public Task<bool> AnyInDepartmentAsync(int departmentId, CancellationToken ct = default) =>
        context.Employees.AnyAsync(e => e.DepartmentId == departmentId, ct);

    public async Task AddAsync(Employee employee, CancellationToken ct = default) =>
        await context.Employees.AddAsync(employee, ct);

    public Task AddRangeAsync(IEnumerable<Employee> employees, CancellationToken ct = default) =>
        context.Employees.AddRangeAsync(employees, ct);

    public void Remove(Employee employee) => context.Employees.Remove(employee);

    public void RemoveRange(IEnumerable<Employee> employees) => context.Employees.RemoveRange(employees);

    public Task SaveChangesAsync(CancellationToken ct = default) => context.SaveChangesAsync(ct);
}
