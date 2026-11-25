using EMS.Application.Common.Models;
using EMS.Application.Performance.Dtos;
using EMS.Application.Performance.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/performance")]
public class PerformanceController(IPerformanceService performanceService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] PerformanceQuery query, CancellationToken ct) =>
        Ok(ApiResponse<PagedResult<PerformanceReviewDto>>.Ok(await performanceService.GetPagedAsync(query, ct)));

    [HttpGet("metrics")]
    public async Task<IActionResult> Metrics([FromQuery] PerformanceMetricsQuery query, CancellationToken ct) =>
        Ok(ApiResponse<PerformanceMetricsDto>.Ok(await performanceService.GetMetricsAsync(query, ct)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(new { review = await performanceService.GetByIdAsync(id, ct) }));

    [HttpPost]
    public async Task<IActionResult> Create(PerformanceReviewRequest request, CancellationToken ct)
    {
        var review = await performanceService.CreateAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created, ApiResponse<object>.Ok(new { review }, "Review created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, PerformanceReviewRequest request, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(new { review = await performanceService.UpdateAsync(id, request, ct) }, "Review updated successfully."));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await performanceService.DeleteAsync(id, ct);
        return Ok(ApiResponse.Ok("Review deleted successfully."));
    }
}
