using EMS.Application.Reports.Models;
using EMS.Domain.Entities;
using EMS.Domain.Enums;

namespace EMS.Application.Reports.Interfaces;

public interface IReportRepository
{
    Task<List<Employee>> GetEmployeesAsync(int? departmentId, EmployeeStatus? status, CancellationToken ct = default);
    Task<List<DepartmentStatsRow>> GetDepartmentStatsAsync(CancellationToken ct = default);
    Task<List<AttendanceTotalsRow>> GetAttendanceTotalsAsync(DateOnly from, DateOnly to, int? departmentId, CancellationToken ct = default);
}

public interface IPdfReportGenerator
{
    byte[] Generate(ReportDocument document);
}

public interface IExcelReportGenerator
{
    byte[] Generate(ReportDocument document);
}

public interface IReportService
{
    Task<ReportFile> EmployeeDirectoryAsync(ReportQuery query, CancellationToken ct = default);
    Task<ReportFile> DepartmentsAsync(ReportQuery query, CancellationToken ct = default);
    Task<ReportFile> AttendanceAsync(ReportQuery query, CancellationToken ct = default);
    Task<ReportFile> SalaryAsync(ReportQuery query, CancellationToken ct = default);
}
