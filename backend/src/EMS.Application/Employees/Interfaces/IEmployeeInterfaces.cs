using EMS.Application.Common.Models;
using EMS.Application.Employees.Dtos;
using EMS.Domain.Entities;

namespace EMS.Application.Employees.Interfaces;

public interface IEmployeeRepository
{
    Task<(List<Employee> Items, int TotalCount)> GetPagedAsync(EmployeeQuery query, CancellationToken ct = default);
    Task<Employee?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<List<Employee>> GetByIdsAsync(IEnumerable<int> ids, CancellationToken ct = default);
    Task<bool> EmployeeCodeExistsAsync(string code, int? excludeId, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, int? excludeId, CancellationToken ct = default);
    Task<HashSet<string>> GetExistingCodesAsync(IEnumerable<string> codes, CancellationToken ct = default);
    Task<HashSet<string>> GetExistingEmailsAsync(IEnumerable<string> emails, CancellationToken ct = default);
    Task<bool> AnyInDepartmentAsync(int departmentId, CancellationToken ct = default);
    Task AddAsync(Employee employee, CancellationToken ct = default);
    Task AddRangeAsync(IEnumerable<Employee> employees, CancellationToken ct = default);
    void Remove(Employee employee);
    void RemoveRange(IEnumerable<Employee> employees);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IEmployeeService
{
    Task<PagedResult<EmployeeDto>> GetPagedAsync(EmployeeQuery query, CancellationToken ct = default);
    Task<EmployeeDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<EmployeeDto> CreateAsync(EmployeeRequest request, CancellationToken ct = default);
    Task<int> BulkCreateAsync(BulkCreateEmployeesRequest request, CancellationToken ct = default);
    Task<EmployeeDto> UpdateAsync(int id, EmployeeRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
    Task<int> BulkDeleteAsync(BulkDeleteRequest request, CancellationToken ct = default);
}
