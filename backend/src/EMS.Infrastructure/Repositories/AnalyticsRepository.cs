using EMS.Application.Analytics.Dtos;
using EMS.Application.Analytics.Interfaces;
using EMS.Domain.Enums;
using EMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EMS.Infrastructure.Repositories;

public class AnalyticsRepository(AppDbContext context) : IAnalyticsRepository
{
    public async Task<OverviewCountsRow> GetOverviewCountsAsync(DateOnly monthStart, CancellationToken ct = default)
    {
        var employees = context.Employees.AsNoTracking();

        var total = await employees.CountAsync(ct);
        var active = await employees.CountAsync(e => e.Status == EmployeeStatus.Active, ct);
        var newHires = await employees.CountAsync(e => e.JoiningDate >= monthStart, ct);
        var payroll = await employees.Where(e => e.Status == EmployeeStatus.Active).SumAsync(e => (decimal?)e.Salary, ct) ?? 0;
        var departments = await context.Departments.CountAsync(ct);

        return new OverviewCountsRow(total, active, total - active, departments, newHires, payroll);
    }

    public async Task<List<AttendanceDayCountRow>> GetAttendanceCountsAsync(DateOnly from, DateOnly to, int? departmentId, CancellationToken ct = default)
    {
        var records = context.Attendances.AsNoTracking().Where(a => a.Date >= from && a.Date <= to);
        if (departmentId is not null) records = records.Where(a => a.Employee.DepartmentId == departmentId);

        var rows = await records
            .GroupBy(a => new { a.Date, a.Status })
            .Select(g => new { g.Key.Date, g.Key.Status, Count = g.Count() })
            .ToListAsync(ct);

        return rows.Select(r => new AttendanceDayCountRow(r.Date, r.Status.ToString(), r.Count)).ToList();
    }

    public Task<List<EmployeeJoinRow>> GetEmployeeJoinsAsync(CancellationToken ct = default) =>
        context.Employees.AsNoTracking()
            .Select(e => new EmployeeJoinRow(e.JoiningDate, e.Department.Name))
            .ToListAsync(ct);

    public async Task<List<AttendanceOffenderDto>> GetAttendanceOffendersAsync(DateOnly from, DateOnly to, int? departmentId, int take, CancellationToken ct = default)
    {
        var employees = context.Employees.AsNoTracking().AsQueryable();
        if (departmentId is not null) employees = employees.Where(e => e.DepartmentId == departmentId);

        var rows = await employees
            .Select(e => new
            {
                e.EmployeeCode,
                e.FirstName,
                e.LastName,
                DepartmentName = e.Department.Name,
                Late = e.Attendances.Count(a => a.Date >= from && a.Date <= to && a.Status == AttendanceStatus.Late),
                Absent = e.Attendances.Count(a => a.Date >= from && a.Date <= to && a.Status == AttendanceStatus.Absent)
            })
            .Where(x => x.Late + x.Absent > 0)
            .OrderByDescending(x => x.Late + x.Absent).ThenBy(x => x.FirstName)
            .Take(take)
            .ToListAsync(ct);

        return rows.Select(r => new AttendanceOffenderDto(
            r.EmployeeCode, $"{r.FirstName} {r.LastName}", r.DepartmentName, r.Late, r.Absent)).ToList();
    }
}
