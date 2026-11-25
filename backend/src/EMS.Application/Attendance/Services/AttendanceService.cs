using System.Globalization;
using EMS.Application.Attendance.Dtos;
using EMS.Application.Attendance.Interfaces;
using EMS.Application.Common.Exceptions;
using EMS.Application.Employees.Interfaces;
using EMS.Domain.Enums;
using AttendanceEntity = EMS.Domain.Entities.Attendance;

namespace EMS.Application.Attendance.Services;

public class AttendanceService(IAttendanceRepository attendance, IEmployeeRepository employees) : IAttendanceService
{
    public Task<List<DailyAttendanceRow>> GetDailySheetAsync(DailyAttendanceQuery query, CancellationToken ct = default)
    {
        var date = query.Date ?? Today();
        EnsureNotInFuture(date);

        return attendance.GetDailySheetAsync(date, query.DepartmentId, query.Search?.Trim(), ct);
    }

    /// <summary>Upsert: creates a record for employees not yet marked on that date, updates the rest.</summary>
    public async Task<int> MarkAsync(MarkAttendanceRequest request, CancellationToken ct = default)
    {
        var date = request.Date!.Value;
        EnsureNotInFuture(date);

        var inputs = request.Records
            .GroupBy(r => r.EmployeeId)
            .Select(g => g.Last()) // if an employee is sent twice, the last entry wins
            .ToList();
        var employeeIds = inputs.Select(r => r.EmployeeId).ToList();

        var activeEmployees = await attendance.GetActiveEmployeesAsync(employeeIds, ct);
        if (activeEmployees.Count != employeeIds.Count)
            throw new BadRequestException("One or more employees do not exist or are inactive.");

        var existing = (await attendance.GetForDateAsync(date, employeeIds, ct))
            .ToDictionary(a => a.EmployeeId);

        var toAdd = new List<AttendanceEntity>();

        foreach (var input in inputs)
        {
            var notes = string.IsNullOrWhiteSpace(input.Notes) ? null : input.Notes.Trim();

            if (existing.TryGetValue(input.EmployeeId, out var record))
            {
                record.Status = input.Status!.Value;
                record.Notes = notes;
            }
            else
            {
                toAdd.Add(new AttendanceEntity
                {
                    EmployeeId = input.EmployeeId,
                    Date = date,
                    Status = input.Status!.Value,
                    Notes = notes
                });
            }
        }

        await attendance.AddRangeAsync(toAdd, ct);
        await attendance.SaveChangesAsync(ct);

        return inputs.Count;
    }

    public async Task<MonthlyAttendanceDto> GetMonthlyAsync(int employeeId, string? month, CancellationToken ct = default)
    {
        _ = await employees.GetByIdAsync(employeeId, ct) ?? throw new NotFoundException("Employee not found.");

        var firstDay = ParseMonth(month);
        var lastDay = firstDay.AddMonths(1).AddDays(-1);

        var records = await attendance.GetForEmployeeAsync(employeeId, firstDay, lastDay, ct);

        int Count(AttendanceStatus s) => records.Count(r => r.Status == s);
        var summary = new AttendanceSummaryDto(
            Count(AttendanceStatus.Present), Count(AttendanceStatus.Absent), Count(AttendanceStatus.Late),
            Count(AttendanceStatus.HalfDay), Count(AttendanceStatus.Leave), records.Count);

        return new MonthlyAttendanceDto(
            firstDay.ToString("yyyy-MM", CultureInfo.InvariantCulture),
            records.Select(r => new AttendanceRecordDto(r.Date, r.Status.ToString(), r.Notes)).ToList(),
            summary);
    }

    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow);

    private static void EnsureNotInFuture(DateOnly date)
    {
        // Allow one day of slack so users ahead of UTC (e.g. India, UTC+5:30) can mark "today".
        if (date > Today().AddDays(1))
            throw new BadRequestException("Attendance cannot be marked for a future date.");
    }

    private static DateOnly ParseMonth(string? month)
    {
        if (string.IsNullOrWhiteSpace(month))
        {
            var today = Today();
            return new DateOnly(today.Year, today.Month, 1);
        }

        if (!DateOnly.TryParseExact(month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            throw new BadRequestException("Month must be in the format yyyy-MM.");

        return parsed;
    }
}
