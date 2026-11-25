using EMS.Application.Performance.Dtos;
using EMS.Application.Performance.Interfaces;
using EMS.Domain.Entities;
using EMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EMS.Infrastructure.Repositories;

public class PerformanceRepository(AppDbContext context) : IPerformanceRepository
{
    public async Task<(List<PerformanceReview> Items, int TotalCount)> GetPagedAsync(PerformanceQuery query, CancellationToken ct = default)
    {
        var reviews = context.PerformanceReviews.AsNoTracking()
            .Include(r => r.Employee).ThenInclude(e => e.Department)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search;
            reviews = reviews.Where(r =>
                r.Employee.FirstName.Contains(term) || r.Employee.LastName.Contains(term) || r.Employee.EmployeeCode.Contains(term));
        }

        if (query.DepartmentId is not null) reviews = reviews.Where(r => r.Employee.DepartmentId == query.DepartmentId);
        if (query.Year is not null) reviews = reviews.Where(r => r.Year == query.Year);
        if (query.Quarter is not null) reviews = reviews.Where(r => r.Quarter == query.Quarter);

        var total = await reviews.CountAsync(ct);

        var items = await reviews
            .OrderByDescending(r => r.Year).ThenByDescending(r => r.Quarter)
            .ThenBy(r => r.Employee.FirstName).ThenBy(r => r.Id)
            .Skip((query.Page - 1) * query.PageSize).Take(query.PageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public Task<PerformanceReview?> GetByIdAsync(int id, CancellationToken ct = default) =>
        context.PerformanceReviews
            .Include(r => r.Employee).ThenInclude(e => e.Department)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<bool> PeriodExistsAsync(int employeeId, int year, int quarter, int? excludeId, CancellationToken ct = default) =>
        context.PerformanceReviews.AnyAsync(
            r => r.EmployeeId == employeeId && r.Year == year && r.Quarter == quarter && r.Id != excludeId, ct);

    public async Task<List<PerformanceScoreRow>> GetScoreRowsAsync(int? departmentId, CancellationToken ct = default)
    {
        var reviews = context.PerformanceReviews.AsNoTracking().AsQueryable();
        if (departmentId is not null) reviews = reviews.Where(r => r.Employee.DepartmentId == departmentId);

        var rows = await reviews.Select(r => new
        {
            r.EmployeeId,
            r.Employee.EmployeeCode,
            r.Employee.FirstName,
            r.Employee.LastName,
            DepartmentName = r.Employee.Department.Name,
            r.Year,
            r.Quarter,
            r.QualityScore,
            r.ProductivityScore,
            r.TeamworkScore
        }).ToListAsync(ct);

        return rows.Select(r => new PerformanceScoreRow(
            r.EmployeeId, r.EmployeeCode, $"{r.FirstName} {r.LastName}", r.DepartmentName,
            r.Year, r.Quarter, r.QualityScore, r.ProductivityScore, r.TeamworkScore)).ToList();
    }

    public async Task AddAsync(PerformanceReview review, CancellationToken ct = default) =>
        await context.PerformanceReviews.AddAsync(review, ct);

    public void Remove(PerformanceReview review) => context.PerformanceReviews.Remove(review);

    public Task SaveChangesAsync(CancellationToken ct = default) => context.SaveChangesAsync(ct);
}
