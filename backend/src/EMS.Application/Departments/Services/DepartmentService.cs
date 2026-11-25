using EMS.Application.Common.Exceptions;
using EMS.Application.Departments.Dtos;
using EMS.Application.Departments.Interfaces;
using EMS.Application.Employees.Interfaces;
using EMS.Domain.Entities;

namespace EMS.Application.Departments.Services;

public class DepartmentService(IDepartmentRepository departments, IEmployeeRepository employees) : IDepartmentService
{
    public async Task<List<DepartmentDto>> GetAllAsync(string? search, CancellationToken ct = default)
    {
        var items = await departments.GetAllAsync(search?.Trim(), ct);
        return items.Select(ToDto).ToList();
    }

    public async Task<DepartmentDto> GetByIdAsync(int id, CancellationToken ct = default) =>
        ToDto(await FindOrThrowAsync(id, ct));

    public async Task<DepartmentDto> CreateAsync(DepartmentRequest request, CancellationToken ct = default)
    {
        var name = request.Name.Trim();
        await EnsureNameIsUniqueAsync(name, null, ct);

        var department = new Department { Name = name, Description = NormalizeDescription(request.Description) };
        await departments.AddAsync(department, ct);
        await departments.SaveChangesAsync(ct);

        return ToDto(department);
    }

    public async Task<DepartmentDto> UpdateAsync(int id, DepartmentRequest request, CancellationToken ct = default)
    {
        var department = await FindOrThrowAsync(id, ct);
        var name = request.Name.Trim();
        await EnsureNameIsUniqueAsync(name, id, ct);

        department.Name = name;
        department.Description = NormalizeDescription(request.Description);
        await departments.SaveChangesAsync(ct);

        return ToDto(department);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var department = await FindOrThrowAsync(id, ct);

        if (await employees.AnyInDepartmentAsync(id, ct))
            throw new ConflictException("This department still has employees. Move or remove them before deleting it.");

        departments.Remove(department);
        await departments.SaveChangesAsync(ct);
    }

    private async Task<Department> FindOrThrowAsync(int id, CancellationToken ct) =>
        await departments.GetByIdAsync(id, ct) ?? throw new NotFoundException("Department not found.");

    private async Task EnsureNameIsUniqueAsync(string name, int? excludeId, CancellationToken ct)
    {
        if (await departments.NameExistsAsync(name, excludeId, ct))
            throw new ConflictException($"A department named '{name}' already exists.");
    }

    private static string? NormalizeDescription(string? description) =>
        string.IsNullOrWhiteSpace(description) ? null : description.Trim();

    private static DepartmentDto ToDto(Department d) => new(d.Id, d.Name, d.Description, d.CreatedAt);
}
