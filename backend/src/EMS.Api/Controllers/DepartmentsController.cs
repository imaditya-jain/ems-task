using EMS.Application.Common.Models;
using EMS.Application.Departments.Dtos;
using EMS.Application.Departments.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/departments")]
public class DepartmentsController(IDepartmentService departmentService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(new { departments = await departmentService.GetAllAsync(search, ct) }));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(new { department = await departmentService.GetByIdAsync(id, ct) }));

    [HttpPost]
    public async Task<IActionResult> Create(DepartmentRequest request, CancellationToken ct)
    {
        var department = await departmentService.CreateAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<object>.Ok(new { department }, "Department created successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, DepartmentRequest request, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(new { department = await departmentService.UpdateAsync(id, request, ct) },
            "Department updated successfully."));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await departmentService.DeleteAsync(id, ct);
        return Ok(ApiResponse.Ok("Department deleted successfully."));
    }
}
