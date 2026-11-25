using EMS.Application.Common;
using EMS.Application.Common.Exceptions;
using EMS.Application.Performance;
using EMS.Application.Reports.Interfaces;
using EMS.Application.Reports.Models;
using EMS.Domain.Enums;

namespace EMS.Application.Reports.Services;

public class ReportService(
    IReportRepository reports,
    IPdfReportGenerator pdf,
    IExcelReportGenerator excel) : IReportService
{
    private const int MaxAttendanceRangeDays = 366;

    public async Task<ReportFile> EmployeeDirectoryAsync(ReportQuery query, CancellationToken ct = default)
    {
        var employees = await reports.GetEmployeesAsync(query.DepartmentId, query.Status, ct);

        var document = new ReportDocument(
            "Employee Directory",
            DescribeFilters(query.DepartmentId, query.Status),
            [
                new("Code"), new("Name"), new("Email"), new("Phone"), new("Department"),
                new("Designation"), new("Joined"), new("Status", ColumnAlign.Center)
            ],
            employees.Select(e => new object?[]
            {
                e.EmployeeCode, $"{e.FirstName} {e.LastName}", e.Email, e.Phone, e.Department.Name,
                e.Designation, e.JoiningDate, e.Status.ToString()
            }).ToList(),
            [
                new("Total employees", employees.Count),
                new("Active", employees.Count(e => e.Status == EmployeeStatus.Active)),
                new("Inactive", employees.Count(e => e.Status == EmployeeStatus.Inactive))
            ]);

        return Render(document, "employee-directory", query.Format);
    }

    public async Task<ReportFile> DepartmentsAsync(ReportQuery query, CancellationToken ct = default)
    {
        var departments = await reports.GetDepartmentStatsAsync(ct);

        var document = new ReportDocument(
            "Department Summary",
            null,
            [
                new("Department"), new("Description"), new("Employees", ColumnAlign.Right),
                new("Active", ColumnAlign.Right), new("Inactive", ColumnAlign.Right),
                new("Monthly Payroll", ColumnAlign.Right), new("Average Salary", ColumnAlign.Right)
            ],
            departments.Select(d => new object?[]
            {
                d.Name, d.Description ?? "—", d.Total, d.Active, d.Inactive,
                new Money(d.TotalSalary), new Money(d.Total == 0 ? 0 : Math.Round(d.TotalSalary / d.Total, 2))
            }).ToList(),
            [
                new("Departments", departments.Count),
                new("Total employees", departments.Sum(d => d.Total)),
                new("Total monthly payroll", new Money(departments.Sum(d => d.TotalSalary)))
            ]);

        return Render(document, "departments", query.Format);
    }

    public async Task<ReportFile> AttendanceAsync(ReportQuery query, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        // Default period is the whole current month. (Using "today" would drop records marked on a date that is
        // already tomorrow in UTC for users ahead of UTC.)
        var from = query.From ?? new DateOnly(today.Year, today.Month, 1);
        var to = query.To ?? from.AddMonths(1).AddDays(-1);

        if (from > to) throw new BadRequestException("'From' date cannot be after 'To' date.");
        if (to.DayNumber - from.DayNumber >= MaxAttendanceRangeDays)
            throw new BadRequestException($"The date range cannot exceed {MaxAttendanceRangeDays} days.");

        var rows = await reports.GetAttendanceTotalsAsync(from, to, query.DepartmentId, ct);

        var document = new ReportDocument(
            "Attendance Report",
            $"{from:dd MMM yyyy} to {to:dd MMM yyyy}" + (query.DepartmentId is null ? "" : " · filtered by department"),
            [
                new("Code"), new("Name"), new("Department"),
                new("Present", ColumnAlign.Right), new("Late", ColumnAlign.Right), new("Half Day", ColumnAlign.Right),
                new("Leave", ColumnAlign.Right), new("Absent", ColumnAlign.Right), new("Attendance %", ColumnAlign.Right)
            ],
            rows.Select(r => new object?[]
            {
                r.EmployeeCode, r.FullName, r.DepartmentName,
                r.Present, r.Late, r.HalfDay, r.Leave, r.Absent, AttendanceRate(r)
            }).ToList(),
            [
                new("Employees", rows.Count),
                new("Present days", rows.Sum(r => r.Present)),
                new("Absent days", rows.Sum(r => r.Absent)),
                new("Note", "Attendance % = (Present + Late + 0.5 x Half Day) / (marked days - Leave)")
            ]);

        return Render(document, "attendance", query.Format);
    }

    public async Task<ReportFile> SalaryAsync(ReportQuery query, CancellationToken ct = default)
    {
        // Payroll defaults to active staff; pass status explicitly to include Inactive ones.
        var status = query.Status ?? EmployeeStatus.Active;
        var employees = await reports.GetEmployeesAsync(query.DepartmentId, status, ct);

        var salaries = employees.Select(e => e.Salary).ToList();

        var document = new ReportDocument(
            "Salary Report",
            DescribeFilters(query.DepartmentId, status),
            [
                new("Code"), new("Name"), new("Department"), new("Designation"),
                new("Monthly Salary", ColumnAlign.Right), new("Annual Salary", ColumnAlign.Right)
            ],
            employees.Select(e => new object?[]
            {
                e.EmployeeCode, $"{e.FirstName} {e.LastName}", e.Department.Name, e.Designation,
                new Money(e.Salary), new Money(e.Salary * 12)
            }).ToList(),
            [
                new("Employees", employees.Count),
                new("Total monthly payroll", new Money(salaries.Sum())),
                new("Total annual payroll", new Money(salaries.Sum() * 12)),
                new("Average monthly salary", new Money(salaries.Count == 0 ? 0 : Math.Round(salaries.Average(), 2))),
                new("Highest", new Money(salaries.Count == 0 ? 0 : salaries.Max())),
                new("Lowest", new Money(salaries.Count == 0 ? 0 : salaries.Min()))
            ]);

        return Render(document, "salary", query.Format);
    }

    public async Task<ReportFile> PerformanceAsync(ReportQuery query, CancellationToken ct = default)
    {
        if (query.Quarter is < 1 or > 4) throw new BadRequestException("Quarter must be between 1 and 4.");

        var rows = await reports.GetPerformanceRowsAsync(query.Year, query.Quarter, query.DepartmentId, ct);
        var scored = rows.Select(r => (Row: r, Overall: PerformanceRating.Overall(r.Quality, r.Productivity, r.Teamwork))).ToList();

        var period = (query.Year, query.Quarter) switch
        {
            (null, null) => "All periods",
            (int y, null) => $"Year {y}",
            (null, int q) => $"Q{q} (all years)",
            (int y, int q) => $"{y} Q{q}"
        };

        var summary = new List<ReportSummaryItem>
        {
            new("Reviews", scored.Count),
            new("Average overall rating", scored.Count == 0 ? 0m : Math.Round(scored.Average(s => s.Overall), 2)),
            new("Highest rating", scored.Count == 0 ? 0m : scored.Max(s => s.Overall)),
            new("Lowest rating", scored.Count == 0 ? 0m : scored.Min(s => s.Overall))
        };

        foreach (var department in scored.GroupBy(s => s.Row.DepartmentName).OrderBy(g => g.Key))
            summary.Add(new($"Average - {department.Key}", Math.Round(department.Average(s => s.Overall), 2)));

        var document = new ReportDocument(
            "Performance Metrics Report",
            period + (query.DepartmentId is null ? "" : " · filtered by department"),
            [
                new("Code"), new("Name"), new("Department"), new("Period"),
                new("Quality", ColumnAlign.Right), new("Productivity", ColumnAlign.Right), new("Teamwork", ColumnAlign.Right),
                new("Overall", ColumnAlign.Right), new("Rating")
            ],
            scored.Select(s => new object?[]
            {
                s.Row.EmployeeCode, s.Row.FullName, s.Row.DepartmentName, $"{s.Row.Year} Q{s.Row.Quarter}",
                s.Row.Quality, s.Row.Productivity, s.Row.Teamwork, s.Overall, PerformanceRating.Label(s.Overall)
            }).ToList(),
            summary);

        return Render(document, "performance", query.Format);
    }

    private ReportFile Render(ReportDocument document, string baseName, ReportFormat format)
    {
        var stamp = DateTime.UtcNow.ToString("yyyy-MM-dd");

        return format == ReportFormat.Excel
            ? new ReportFile(excel.Generate(document),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{baseName}-{stamp}.xlsx")
            : new ReportFile(pdf.Generate(document), "application/pdf", $"{baseName}-{stamp}.pdf");
    }

    private static string? DescribeFilters(int? departmentId, EmployeeStatus? status)
    {
        var parts = new List<string>();
        if (departmentId is not null) parts.Add("filtered by department");
        if (status is not null) parts.Add($"{status} employees");
        return parts.Count == 0 ? "All employees" : string.Join(" · ", parts);
    }

    private static Percent? AttendanceRate(AttendanceTotalsRow r)
    {
        var rate = AttendanceMath.Rate(r.Present, r.Late, r.HalfDay, r.Absent);
        return rate is null ? null : new Percent(rate.Value);
    }
}
