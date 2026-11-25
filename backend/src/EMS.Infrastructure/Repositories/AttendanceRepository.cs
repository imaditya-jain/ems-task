using EMS.Application.Attendance.Dtos;
using EMS.Application.Attendance.Interfaces;
using EMS.Domain.Entities;
using EMS.Domain.Enums;
using EMS.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EMS.Infrastructure.Repositories;

public class AttendanceRepository(AppDbContext context) : IAttendanceRepository
{
    public async Task<List<DailyAttendanceRow>> GetDailySheetAsync(DateOnly date, int? departmentId, string? search, CancellationToken ct = default)
    {
        var employees = context.Employees.AsNoTracking().Where(e => e.Status == EmployeeStatus.Active);

        if (departmentId is not null)
            employees = employees.Where(e => e.DepartmentId == departmentId);

        if (!string.IsNullOrWhiteSpace(search))
            employees = employees.Where(e =>
                e.FirstName.Contains(search) || e.LastName.Contains(search) || e.EmployeeCode.Contains(search));

        var rows = await employees
            .OrderBy(e => e.FirstName).ThenBy(e => e.LastName).ThenBy(e => e.Id)
            .Select(e => new
            {
                e.Id,
                e.EmployeeCode,
                e.FirstName,
                e.LastName,
                DepartmentName = e.Department.Name,
                Record = e.Attendances.Where(a => a.Date == date).Select(a => new { a.Status, a.Notes }).FirstOrDefault()
            })
            .ToListAsync(ct);

        return rows
            .Select(r => new DailyAttendanceRow(
                r.Id, r.EmployeeCode, $"{r.FirstName} {r.LastName}", r.DepartmentName,
                r.Record?.Status.ToString(), r.Record?.Notes))
            .ToList();
    }

    public Task<List<Attendance>> GetForEmployeeAsync(int employeeId, DateOnly from, DateOnly to, CancellationToken ct = default) =>
        context.Attendances.AsNoTracking()
            .Where(a => a.EmployeeId == employeeId && a.Date >= from && a.Date <= to)
            .OrderBy(a => a.Date)
            .ToListAsync(ct);

    public Task<List<Attendance>> GetForDateAsync(DateOnly date, IEnumerable<int> employeeIds, CancellationToken ct = default)
    {
        var ids = employeeIds.ToList();
        return context.Attendances.Where(a => a.Date == date && ids.Contains(a.EmployeeId)).ToListAsync(ct);
    }

    public Task<List<Employee>> GetActiveEmployeesAsync(IEnumerable<int> employeeIds, CancellationToken ct = default)
    {
        var ids = employeeIds.ToList();
        return context.Employees.AsNoTracking()
            .Where(e => ids.Contains(e.Id) && e.Status == EmployeeStatus.Active)
            .ToListAsync(ct);
    }

    public Task AddRangeAsync(IEnumerable<Attendance> records, CancellationToken ct = default) =>
        context.Attendances.AddRangeAsync(records, ct);

    public Task SaveChangesAsync(CancellationToken ct = default) => context.SaveChangesAsync(ct);
}
