using EMS.Application.Common.Exceptions;
using EMS.Application.Common.Models;
using EMS.Application.Departments.Interfaces;
using EMS.Application.Employees.Dtos;
using EMS.Application.Employees.Interfaces;
using EMS.Domain.Entities;

namespace EMS.Application.Employees.Services;

public class EmployeeService(IEmployeeRepository employees, IDepartmentRepository departments) : IEmployeeService
{
    private const int MinimumAge = 18;
    private const int MaxPageSize = 100;

    public async Task<PagedResult<EmployeeDto>> GetPagedAsync(EmployeeQuery query, CancellationToken ct = default)
    {
        query.Page = Math.Max(query.Page, 1);
        query.PageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        query.Search = query.Search?.Trim();

        var (items, total) = await employees.GetPagedAsync(query, ct);
        return new PagedResult<EmployeeDto>(items.Select(ToDto).ToList(), query.Page, query.PageSize, total);
    }

    public async Task<List<EmployeeOptionDto>> GetOptionsAsync(string? search, CancellationToken ct = default)
    {
        var items = await employees.GetActiveOptionsAsync(search?.Trim(), ct);
        return items.Select(e => new EmployeeOptionDto(e.Id, e.EmployeeCode, $"{e.FirstName} {e.LastName}")).ToList();
    }

    public async Task<EmployeeDto> GetByIdAsync(int id, CancellationToken ct = default) =>
        ToDto(await FindOrThrowAsync(id, ct));

    public async Task<EmployeeDto> CreateAsync(EmployeeRequest request, CancellationToken ct = default)
    {
        var department = await departments.GetByIdAsync(request.DepartmentId!.Value, ct)
                         ?? throw new BadRequestException("Selected department does not exist.");

        EnsureBusinessRules(request);
        await EnsureUniqueAsync(request.EmployeeCode, request.Email, null, ct);

        var employee = new Employee { Department = department };
        Apply(employee, request);

        await employees.AddAsync(employee, ct);
        await employees.SaveChangesAsync(ct);

        return ToDto(employee);
    }

    public async Task<int> BulkCreateAsync(BulkCreateEmployeesRequest request, CancellationToken ct = default)
    {
        var rows = request.Employees;
        var allDepartments = (await departments.GetAllAsync(null, ct))
            .ToDictionary(d => d.Name, StringComparer.OrdinalIgnoreCase);

        var existingCodes = await employees.GetExistingCodesAsync(rows.Select(r => r.EmployeeCode.Trim()), ct);
        var existingEmails = await employees.GetExistingEmailsAsync(rows.Select(r => r.Email.Trim().ToLowerInvariant()), ct);

        var errors = new List<string>();
        var seenCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenEmails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var toCreate = new List<Employee>();

        // Validate every row first; nothing is saved unless the whole file is valid.
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var rowNumber = i + 1;
            var rowErrors = new List<string>();

            if (!allDepartments.ContainsKey(row.DepartmentName.Trim()))
                rowErrors.Add($"Department '{row.DepartmentName}' does not exist.");

            var businessError = GetBusinessRuleError(row);
            if (businessError is not null) rowErrors.Add(businessError);

            var code = row.EmployeeCode.Trim();
            var email = row.Email.Trim().ToLowerInvariant();

            if (existingCodes.Contains(code) || !seenCodes.Add(code))
                rowErrors.Add($"Employee code '{code}' is already in use.");
            if (existingEmails.Contains(email) || !seenEmails.Add(email))
                rowErrors.Add($"Email '{email}' is already in use.");

            if (rowErrors.Count > 0)
            {
                errors.AddRange(rowErrors.Select(e => $"Row {rowNumber}: {e}"));
                continue;
            }

            var employee = new Employee { DepartmentId = allDepartments[row.DepartmentName.Trim()].Id };
            Apply(employee, row);
            toCreate.Add(employee);
        }

        if (errors.Count > 0)
            throw new UnprocessableException("Import failed. Fix the errors below and try again.", errors);

        await employees.AddRangeAsync(toCreate, ct);
        await employees.SaveChangesAsync(ct);

        return toCreate.Count;
    }

    public async Task<EmployeeDto> UpdateAsync(int id, EmployeeRequest request, CancellationToken ct = default)
    {
        var employee = await FindOrThrowAsync(id, ct);

        var department = await departments.GetByIdAsync(request.DepartmentId!.Value, ct)
                         ?? throw new BadRequestException("Selected department does not exist.");

        EnsureBusinessRules(request);
        await EnsureUniqueAsync(request.EmployeeCode, request.Email, id, ct);

        Apply(employee, request);
        employee.Department = department;
        await employees.SaveChangesAsync(ct);

        return ToDto(employee);
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var employee = await FindOrThrowAsync(id, ct);
        employees.Remove(employee);
        await employees.SaveChangesAsync(ct);
    }

    public async Task<int> BulkDeleteAsync(BulkDeleteRequest request, CancellationToken ct = default)
    {
        var ids = request.Ids.Distinct().ToList();
        var found = await employees.GetByIdsAsync(ids, ct);

        if (found.Count != ids.Count)
            throw new NotFoundException("One or more selected employees no longer exist. Refresh and try again.");

        employees.RemoveRange(found);
        await employees.SaveChangesAsync(ct);

        return found.Count;
    }

    private async Task<Employee> FindOrThrowAsync(int id, CancellationToken ct) =>
        await employees.GetByIdAsync(id, ct) ?? throw new NotFoundException("Employee not found.");

    private async Task EnsureUniqueAsync(string code, string email, int? excludeId, CancellationToken ct)
    {
        if (await employees.EmployeeCodeExistsAsync(code.Trim(), excludeId, ct))
            throw new ConflictException($"Employee code '{code.Trim()}' is already in use.");

        if (await employees.EmailExistsAsync(email.Trim().ToLowerInvariant(), excludeId, ct))
            throw new ConflictException($"An employee with email '{email.Trim().ToLowerInvariant()}' already exists.");
    }

    private static void EnsureBusinessRules(EmployeeInputBase input)
    {
        var error = GetBusinessRuleError(input);
        if (error is not null) throw new BadRequestException(error);
    }

    private static string? GetBusinessRuleError(EmployeeInputBase input)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (input.DateOfBirth!.Value > today.AddYears(-MinimumAge))
            return $"Employee must be at least {MinimumAge} years old.";

        if (input.JoiningDate!.Value < input.DateOfBirth.Value.AddYears(MinimumAge))
            return "Joining date cannot be before the employee turned 18.";

        return null;
    }

    private static void Apply(Employee employee, EmployeeInputBase input)
    {
        employee.EmployeeCode = input.EmployeeCode.Trim();
        employee.FirstName = input.FirstName.Trim();
        employee.LastName = input.LastName.Trim();
        employee.Email = input.Email.Trim().ToLowerInvariant();
        employee.Phone = input.Phone.Trim();
        employee.DateOfBirth = input.DateOfBirth!.Value;
        employee.Gender = input.Gender!.Value;
        employee.Designation = input.Designation.Trim();
        employee.JoiningDate = input.JoiningDate!.Value;
        employee.Salary = input.Salary!.Value;
        employee.Status = input.Status;

        if (input is EmployeeRequest request) employee.DepartmentId = request.DepartmentId!.Value;
    }

    private static EmployeeDto ToDto(Employee e) => new(
        e.Id, e.EmployeeCode, e.FirstName, e.LastName, $"{e.FirstName} {e.LastName}", e.Email, e.Phone,
        e.DateOfBirth, e.Gender.ToString(), e.DepartmentId, e.Department.Name, e.Designation,
        e.JoiningDate, e.Salary, e.Status.ToString(), e.CreatedAt);
}
