using EMS.Application.Analytics.Dtos;
using EMS.Application.Analytics.Interfaces;
using EMS.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/analytics")]
public class AnalyticsController(IAnalyticsService analyticsService) : ControllerBase
{
    /// <param name="today">The caller's local date (yyyy-MM-dd), so "today" matches the user's time zone.</param>
    [HttpGet("overview")]
    public async Task<IActionResult> Overview([FromQuery] DateOnly? today, CancellationToken ct) =>
        Ok(ApiResponse<OverviewDto>.Ok(await analyticsService.GetOverviewAsync(today, ct)));

    [HttpGet("hiring-trend")]
    public async Task<IActionResult> HiringTrend([FromQuery] int months = 12, CancellationToken ct = default) =>
        Ok(ApiResponse<HiringTrendDto>.Ok(await analyticsService.GetHiringTrendAsync(months, ct)));

    [HttpGet("department-growth")]
    public async Task<IActionResult> DepartmentGrowth([FromQuery] int months = 12, CancellationToken ct = default) =>
        Ok(ApiResponse<DepartmentGrowthDto>.Ok(await analyticsService.GetDepartmentGrowthAsync(months, ct)));

    [HttpGet("attendance-patterns")]
    public async Task<IActionResult> AttendancePatterns([FromQuery] AttendancePatternQuery query, CancellationToken ct) =>
        Ok(ApiResponse<AttendancePatternDto>.Ok(await analyticsService.GetAttendancePatternsAsync(query, ct)));
}
