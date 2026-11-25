using EMS.Application.Common.Models;
using EMS.Application.Employees.Dtos;
using EMS.Application.Employees.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EMS.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/employees")]
public class EmployeesController(IEmployeeService employeeService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] EmployeeQuery query, CancellationToken ct) =>
        Ok(ApiResponse<PagedResult<EmployeeDto>>.Ok(await employeeService.GetPagedAsync(query, ct)));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(new { employee = await employeeService.GetByIdAsync(id, ct) }));

    [HttpPost]
    public async Task<IActionResult> Create(EmployeeRequest request, CancellationToken ct)
    {
        var employee = await employeeService.CreateAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<object>.Ok(new { employee }, "Employee created successfully."));
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> BulkCreate(BulkCreateEmployeesRequest request, CancellationToken ct)
    {
        var count = await employeeService.BulkCreateAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created,
            ApiResponse<object>.Ok(new { count }, $"{count} employees imported successfully."));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, EmployeeRequest request, CancellationToken ct) =>
        Ok(ApiResponse<object>.Ok(new { employee = await employeeService.UpdateAsync(id, request, ct) },
            "Employee updated successfully."));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await employeeService.DeleteAsync(id, ct);
        return Ok(ApiResponse.Ok("Employee deleted successfully."));
    }

    [HttpPost("bulk-delete")]
    public async Task<IActionResult> BulkDelete(BulkDeleteRequest request, CancellationToken ct)
    {
        var count = await employeeService.BulkDeleteAsync(request, ct);
        return Ok(ApiResponse<object>.Ok(new { count }, $"{count} employees deleted successfully."));
    }
}
