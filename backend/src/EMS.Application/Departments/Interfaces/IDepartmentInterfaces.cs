using EMS.Application.Departments.Dtos;
using EMS.Domain.Entities;

namespace EMS.Application.Departments.Interfaces;

public interface IDepartmentRepository
{
    Task<List<Department>> GetAllAsync(string? search, CancellationToken ct = default);
    Task<Department?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<bool> NameExistsAsync(string name, int? excludeId, CancellationToken ct = default);
    Task AddAsync(Department department, CancellationToken ct = default);
    void Remove(Department department);
    Task SaveChangesAsync(CancellationToken ct = default);
}

public interface IDepartmentService
{
    Task<List<DepartmentDto>> GetAllAsync(string? search, CancellationToken ct = default);
    Task<DepartmentDto> GetByIdAsync(int id, CancellationToken ct = default);
    Task<DepartmentDto> CreateAsync(DepartmentRequest request, CancellationToken ct = default);
    Task<DepartmentDto> UpdateAsync(int id, DepartmentRequest request, CancellationToken ct = default);
    Task DeleteAsync(int id, CancellationToken ct = default);
}
