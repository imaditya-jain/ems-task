using EMS.Application.Attendance.Dtos;
using EMS.Application.Attendance.Interfaces;
using EMS.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/attendance")]
public class AttendanceController(IAttendanceService attendanceService) : ControllerBase
{
    /// <summary>The daily sheet: every active employee with their status for the date (null if not marked).</summary>
    [HttpGet]
    public async Task<IActionResult> GetDaily([FromQuery] DailyAttendanceQuery query, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(new { rows = await attendanceService.GetDailySheetAsync(query, ct) }));

    /// <summary>Marks (or corrects) attendance for one or many employees on a date.</summary>
    [HttpPost]
    public async Task<IActionResult> Mark(MarkAttendanceRequest request, CancellationToken ct)
    {
        var count = await attendanceService.MarkAsync(request, ct);
        return Ok(ApiResponse<object>.Ok(new { count }, $"Attendance saved for {count} employee{(count == 1 ? "" : "s")}."));
    }

    [HttpGet("employees/{employeeId:int}")]
    public async Task<IActionResult> GetMonthly(int employeeId, [FromQuery] string? month, CancellationToken ct) =>
        Ok(ApiResponse<MonthlyAttendanceDto>.Ok(await attendanceService.GetMonthlyAsync(employeeId, month, ct)));
}
