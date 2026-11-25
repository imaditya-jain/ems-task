using EMS.Application.Common.Exceptions;
using EMS.Application.Common.Models;
using EMS.Application.Employees.Interfaces;
using EMS.Application.Performance.Dtos;
using EMS.Application.Performance.Interfaces;
using EMS.Domain.Entities;

namespace EMS.Application.Performance.Services;

public class PerformanceService(IPerformanceRepository reviews, IEmployeeRepository employees) : IPerformanceService
{
    private const int MaxPageSize = 100;
    private const int ListSize = 5;

    public async Task<PagedResult<PerformanceReviewDto>> GetPagedAsync(PerformanceQuery query, CancellationToken ct = default)
    {
        query.Page = Math.Max(query.Page, 1);
        query.PageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        query.Search = query.Search?.Trim();

        var (items, total) = await reviews.GetPagedAsync(query, ct);
        return new PagedResult<PerformanceReviewDto>(items.Select(ToDto).ToList(), query.Page, query.PageSize, total);
    }

    public async Task<PerformanceReviewDto> GetByIdAsync(int id, CancellationToken ct = default) =>
        ToDto(await FindOrThrowAsync(id, ct));

    public async Task<PerformanceReviewDto> CreateAsync(PerformanceReviewRequest request, CancellationToken ct = default)
    {
        var employee = await employees.GetByIdAsync(request.EmployeeId!.Value, ct)
                       ?? throw new BadRequestException("Selected employee does not exist.");

        EnsurePeriodIsNotInFuture(request.Year!.Value, request.Quarter!.Value);
        await EnsurePeriodIsFreeAsync(employee.Id, request.Year.Value, request.Quarter.Value, null, ct);

        var review = new PerformanceReview { Employee = employee };
        Apply(review, request);

        await reviews.AddAsync(review, ct);
        await reviews.SaveChangesAsync(ct);

        return ToDto(review);
    }

    public async Task<PerformanceReviewDto> UpdateAsync(int id, PerformanceReviewRequest request, CancellationToken ct = default)
    {
        var review = await FindOrThrowAsync(id, ct);

        // The employee a review belongs to cannot be changed: delete and re-create it instead.
        if (request.EmployeeId != review.EmployeeId)
            throw new BadRequestException("A review cannot be moved to a different employee.");

        EnsurePeriodIsNotInFuture(request.Year!.Value, request.Quarter!.Value);
        await EnsurePeriodIsFreeAsync(review.EmployeeId, request.Year.Value, request.Quarter.Value, id, ct);

        Apply(review, request);
        await reviews.SaveChangesAsync(ct);

        return ToDto(review);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        reviews.Remove(await FindOrThrowAsync(id, ct));
        await reviews.SaveChangesAsync(ct);
    }

    public async Task<PerformanceMetricsDto> GetMetricsAsync(PerformanceMetricsQuery query, CancellationToken ct = default)
    {
        var all = await reviews.GetScoreRowsAsync(query.DepartmentId, ct);

        var scoped = all
            .Where(r => query.Year is null || r.Year == query.Year)
            .Where(r => query.Quarter is null || r.Quarter == query.Quarter)
            .ToList();

        return new PerformanceMetricsDto(
            BuildSummary(scoped),
            BuildDistribution(scoped),
            scoped.GroupBy(r => r.DepartmentName)
                .Select(g => new DepartmentPerformanceDto(g.Key, g.Count(), Average(g.Select(r => r.Overall))))
                .OrderByDescending(d => d.AverageOverall).ThenBy(d => d.Department).ToList(),
            scoped.OrderByDescending(r => r.Overall).ThenBy(r => r.EmployeeName).Take(ListSize).Select(ToPerformer).ToList(),
            scoped.Where(r => r.Overall < 3m).OrderBy(r => r.Overall).ThenBy(r => r.EmployeeName).Take(ListSize).Select(ToPerformer).ToList(),
            all.GroupBy(r => (r.Year, r.Quarter)).OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Quarter)
                .Select(g => new PerformanceTrendPointDto($"{g.Key.Year} Q{g.Key.Quarter}", Average(g.Select(r => r.Overall)), g.Count()))
                .ToList());
    }

    private static PerformanceSummaryDto BuildSummary(List<PerformanceScoreRow> rows) =>
        new(rows.Count,
            Average(rows.Select(r => r.Overall)),
            Average(rows.Select(r => (decimal)r.Quality)),
            Average(rows.Select(r => (decimal)r.Productivity)),
            Average(rows.Select(r => (decimal)r.Teamwork)));

    private static List<RatingBucketDto> BuildDistribution(List<PerformanceScoreRow> rows)
    {
        var labels = new[] { "Needs Improvement", "Meets Expectations", "Exceeds Expectations", "Outstanding" };
        return labels
            .Select(label => new RatingBucketDto(label, rows.Count(r => PerformanceRating.Label(r.Overall) == label)))
            .ToList();
    }

    private static decimal Average(IEnumerable<decimal> values)
    {
        var list = values.ToList();
        return list.Count == 0 ? 0 : Math.Round(list.Average(), 2);
    }

    private static PerformerDto ToPerformer(PerformanceScoreRow r) =>
        new(r.EmployeeCode, r.EmployeeName, r.DepartmentName, $"{r.Year} Q{r.Quarter}", r.Overall);

    private async Task<PerformanceReview> FindOrThrowAsync(int id, CancellationToken ct) =>
        await reviews.GetByIdAsync(id, ct) ?? throw new NotFoundException("Performance review not found.");

    private async Task EnsurePeriodIsFreeAsync(int employeeId, int year, int quarter, int? excludeId, CancellationToken ct)
    {
        if (await reviews.PeriodExistsAsync(employeeId, year, quarter, excludeId, ct))
            throw new ConflictException($"This employee already has a review for {year} Q{quarter}.");
    }

    private static void EnsurePeriodIsNotInFuture(int year, int quarter)
    {
        var today = DateTime.UtcNow;
        var currentQuarter = (today.Month - 1) / 3 + 1;

        if (year > today.Year || (year == today.Year && quarter > currentQuarter))
            throw new BadRequestException("Reviews cannot be created for a future quarter.");
    }

    private static void Apply(PerformanceReview review, PerformanceReviewRequest request)
    {
        review.Year = request.Year!.Value;
        review.Quarter = request.Quarter!.Value;
        review.QualityScore = request.QualityScore!.Value;
        review.ProductivityScore = request.ProductivityScore!.Value;
        review.TeamworkScore = request.TeamworkScore!.Value;
        review.Comments = string.IsNullOrWhiteSpace(request.Comments) ? null : request.Comments.Trim();
    }

    private static PerformanceReviewDto ToDto(PerformanceReview r)
    {
        var overall = PerformanceRating.Overall(r.QualityScore, r.ProductivityScore, r.TeamworkScore);

        return new PerformanceReviewDto(
            r.Id, r.EmployeeId, r.Employee.EmployeeCode, $"{r.Employee.FirstName} {r.Employee.LastName}",
            r.Employee.Department.Name, r.Year, r.Quarter, r.QualityScore, r.ProductivityScore, r.TeamworkScore,
            overall, PerformanceRating.Label(overall), r.Comments, r.CreatedAt);
    }
}
