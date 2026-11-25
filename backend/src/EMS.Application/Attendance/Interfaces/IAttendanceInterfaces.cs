using EMS.Application.Attendance.Dtos;
using EMS.Domain.Entities;

namespace EMS.Application.Attendance.Interfaces;

public interface IAttendanceRepository
{
    /// <summary>All ACTIVE employees (matching the filters) with their attendance for the date, if any.</summary>
    Task<List<DailyAttendanceRow>> GetDailySheetAsync(DateOnly date, int? departmentId, string? search, CancellationToken ct = default);

    Task<List<Domain.Entities.Attendance>> GetForEmployeeAsync(int employeeId, DateOnly from, DateOnly to, CancellationToken ct = default);
    Task<List<Domain.Entities.Attendance>> GetForDateAsync(DateOnly date, IEnumerable<int> employeeIds, CancellationToken ct = default);
    Task<List<Employee>> GetActiveEmployeesAsync(IEnumerable<int> employeeIds, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<Domain.Entities.Attendance> records, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IAttendanceService
{
    Task<List<DailyAttendanceRow>> GetDailySheetAsync(DailyAttendanceQuery query, CancellationToken ct = default);
    Task<int> MarkAsync(MarkAttendanceRequest request, CancellationToken ct = default);
    Task<MonthlyAttendanceDto> GetMonthlyAsync(int employeeId, string? month, CancellationToken ct = default);
}
