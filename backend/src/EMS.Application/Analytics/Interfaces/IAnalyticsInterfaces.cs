using EMS.Application.Analytics.Dtos;

namespace EMS.Application.Analytics.Interfaces;

public interface IAnalyticsRepository
{
    Task<OverviewCountsRow> GetOverviewCountsAsync(DateOnly monthStart, CancellationToken ct = default);
    Task<List<AttendanceDayCountRow>> GetAttendanceCountsAsync(DateOnly from, DateOnly to, int? departmentId, CancellationToken ct = default);
    Task<List<EmployeeJoinRow>> GetEmployeeJoinsAsync(CancellationToken ct = default);
    Task<List<AttendanceOffenderDto>> GetAttendanceOffendersAsync(DateOnly from, DateOnly to, int? departmentId, int take, CancellationToken ct = default);
}

public interface IAnalyticsService
{
    Task<OverviewDto> GetOverviewAsync(DateOnly? today, CancellationToken ct = default);
    Task<HiringTrendDto> GetHiringTrendAsync(int months, CancellationToken ct = default);
    Task<DepartmentGrowthDto> GetDepartmentGrowthAsync(int months, CancellationToken ct = default);
    Task<AttendancePatternDto> GetAttendancePatternsAsync(AttendancePatternQuery query, CancellationToken ct = default);
}
