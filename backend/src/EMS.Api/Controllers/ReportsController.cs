using EMS.Application.Reports.Interfaces;
using EMS.Application.Reports.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EMS.Api.Controllers;

/// <summary>Each endpoint returns the file itself (PDF or XLSX, chosen with ?format=pdf|excel).</summary>
[ApiController]
[Authorize]
[Route("api/v1/reports")]
public class ReportsController(IReportService reportService) : ControllerBase
{
    [HttpGet("employee-directory")]
    public async Task<IActionResult> EmployeeDirectory([FromQuery] ReportQuery query, CancellationToken ct) =>
        ToFile(await reportService.EmployeeDirectoryAsync(query, ct));

    [HttpGet("departments")]
    public async Task<IActionResult> Departments([FromQuery] ReportQuery query, CancellationToken ct) =>
        ToFile(await reportService.DepartmentsAsync(query, ct));

    [HttpGet("attendance")]
    public async Task<IActionResult> Attendance([FromQuery] ReportQuery query, CancellationToken ct) =>
        ToFile(await reportService.AttendanceAsync(query, ct));

    [HttpGet("performance")]
    public async Task<IActionResult> Performance([FromQuery] ReportQuery query, CancellationToken ct) =>
        ToFile(await reportService.PerformanceAsync(query, ct));

    [HttpGet("salary")]
    public async Task<IActionResult> Salary([FromQuery] ReportQuery query, CancellationToken ct) =>
        ToFile(await reportService.SalaryAsync(query, ct));

    private FileContentResult ToFile(ReportFile file)
    {
        Response.Headers.CacheControl = "no-store"; // reports contain salary data: never cache them
        return File(file.Content, file.ContentType, file.FileName);
    }
}
