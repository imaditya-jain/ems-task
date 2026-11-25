using EMS.Application.Common.Models;
using EMS.Application.Performance.Dtos;
using EMS.Domain.Entities;

namespace EMS.Application.Performance.Interfaces;

public interface IPerformanceRepository
{
    Task<(List<PerformanceReview> Items, int TotalCount)> GetPagedAsync(PerformanceQuery query, CancellationToken ct = default);
    Task<PerformanceReview?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<bool> PeriodExistsAsync(int employeeId, int year, int quarter, int? excludeId, CancellationToken ct = default);
    Task<List<PerformanceScoreRow>> GetScoreRowsAsync(int? departmentId, CancellationToken ct = default);
    Task AddAsync(PerformanceReview review, CancellationToken ct = default);
    void Remove(PerformanceReview review);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IPerformanceService
{
    Task<PagedResult<PerformanceReviewDto>> GetPagedAsync(PerformanceQuery query, CancellationToken ct = default);
    Task<PerformanceReviewDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<PerformanceReviewDto> CreateAsync(PerformanceReviewRequest request, CancellationToken ct = default);
    Task<PerformanceReviewDto> UpdateAsync(int id, PerformanceReviewRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
    Task<PerformanceMetricsDto> GetMetricsAsync(PerformanceMetricsQuery query, CancellationToken ct = default);
}
