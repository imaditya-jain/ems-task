using EMS.Application.Reports.Interfaces;
using EMS.Application.Reports.Models;
using EMS.Domain.Entities;
using EMS.Domain.Enums;
using EMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EMS.Infrastructure.Repositories;

/// <summary>Read-only queries that feed the reports. Nothing here is paged: a report contains every matching row.</summary>
public class ReportRepository(AppDbContext context) : IReportRepository
{
    public Task<List<Employee>> GetEmployeesAsync(int? departmentId, EmployeeStatus? status, CancellationToken ct = default)
    {
        var query = context.Employees.AsNoTracking().Include(e => e.Department).AsQueryable();

        if (departmentId is not null) query = query.Where(e => e.DepartmentId == departmentId);
        if (status is not null) query = query.Where(e => e.Status == status);

        return query
            .OrderBy(e => e.Department.Name).ThenBy(e => e.FirstName).ThenBy(e => e.LastName).ThenBy(e => e.Id)
            .ToListAsync(ct);
    }

    public Task<List<DepartmentStatsRow>> GetDepartmentStatsAsync(CancellationToken ct = default) =>
        context.Departments.AsNoTracking()
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentStatsRow(
                d.Name,
                d.Description,
                context.Employees.Count(e => e.DepartmentId == d.Id),
                context.Employees.Count(e => e.DepartmentId == d.Id && e.Status == EmployeeStatus.Active),
                context.Employees.Count(e => e.DepartmentId == d.Id && e.Status == EmployeeStatus.Inactive),
                context.Employees.Where(e => e.DepartmentId == d.Id).Sum(e => (decimal?)e.Salary) ?? 0))
            .ToListAsync(ct);

    public async Task<List<AttendanceTotalsRow>> GetAttendanceTotalsAsync(DateOnly from, DateOnly to, int? departmentId, CancellationToken ct = default)
    {
        var employees = context.Employees.AsNoTracking()
            // Active staff, plus anyone (e.g. a leaver) who has attendance inside the period.
            .Where(e => e.Status == EmployeeStatus.Active ||
                        e.Attendances.Any(a => a.Date >= from && a.Date <= to));

        if (departmentId is not null) employees = employees.Where(e => e.DepartmentId == departmentId);

        var rows = await employees
            .OrderBy(e => e.Department.Name).ThenBy(e => e.FirstName).ThenBy(e => e.LastName).ThenBy(e => e.Id)
            .Select(e => new
            {
                e.EmployeeCode,
                e.FirstName,
                e.LastName,
                DepartmentName = e.Department.Name,
                Present = e.Attendances.Count(a => a.Date >= from && a.Date <= to && a.Status == AttendanceStatus.Present),
                Late = e.Attendances.Count(a => a.Date >= from && a.Date <= to && a.Status == AttendanceStatus.Late),
                HalfDay = e.Attendances.Count(a => a.Date >= from && a.Date <= to && a.Status == AttendanceStatus.HalfDay),
                Leave = e.Attendances.Count(a => a.Date >= from && a.Date <= to && a.Status == AttendanceStatus.Leave),
                Absent = e.Attendances.Count(a => a.Date >= from && a.Date <= to && a.Status == AttendanceStatus.Absent)
            })
            .ToListAsync(ct);

        return rows
            .Select(r => new AttendanceTotalsRow(
                r.EmployeeCode, $"{r.FirstName} {r.LastName}", r.DepartmentName,
                r.Present, r.Late, r.HalfDay, r.Leave, r.Absent))
            .ToList();
    }
}
