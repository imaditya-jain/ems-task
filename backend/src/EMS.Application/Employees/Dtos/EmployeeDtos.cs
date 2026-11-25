using System.ComponentModel.DataAnnotations;
using EMS.Domain.Enums;

namespace EMS.Application.Employees.Dtos;

/// <summary>Fields shared by "create/update one employee" and "bulk import row".</summary>
public abstract class EmployeeInputBase
{
    [Required(ErrorMessage = "Employee code is required.")]
    [RegularExpression(@"^[A-Za-z0-9\-]{3,20}$", ErrorMessage = "Employee code must be 3-20 letters, numbers or hyphens.")]
    public string EmployeeCode { get; set; } = string.Empty;

    [Required(ErrorMessage = "First name is required.")]
    [StringLength(50, ErrorMessage = "First name cannot exceed 50 characters.")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Last name is required.")]
    [StringLength(50, ErrorMessage = "Last name cannot exceed 50 characters.")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    [StringLength(150, ErrorMessage = "Email cannot exceed 150 characters.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone is required.")]
    [RegularExpression(@"^\+?[0-9\s\-]{7,15}$", ErrorMessage = "Enter a valid phone number.")]
    public string Phone { get; set; } = string.Empty;

    [Required(ErrorMessage = "Date of birth is required.")]
    public DateOnly? DateOfBirth { get; set; }

    [Required(ErrorMessage = "Gender is required.")]
    [EnumDataType(typeof(Gender), ErrorMessage = "Gender must be Male, Female or Other.")]
    public Gender? Gender { get; set; }

    [Required(ErrorMessage = "Designation is required.")]
    [StringLength(100, ErrorMessage = "Designation cannot exceed 100 characters.")]
    public string Designation { get; set; } = string.Empty;

    [Required(ErrorMessage = "Joining date is required.")]
    public DateOnly? JoiningDate { get; set; }

    [Required(ErrorMessage = "Salary is required.")]
    [Range(0, 99999999.99, ErrorMessage = "Salary must be between 0 and 99,999,999.99.")]
    public decimal? Salary { get; set; }

    [EnumDataType(typeof(EmployeeStatus), ErrorMessage = "Status must be Active or Inactive.")]
    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;
}

public class EmployeeRequest : EmployeeInputBase
{
    [Required(ErrorMessage = "Department is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Department is required.")]
    public int? DepartmentId { get; set; }
}

/// <summary>Bulk rows reference the department by name because that is what a spreadsheet contains.</summary>
public class BulkEmployeeRow : EmployeeInputBase
{
    [Required(ErrorMessage = "Department is required.")]
    public string DepartmentName { get; set; } = string.Empty;
}

public class BulkCreateEmployeesRequest
{
    [Required(ErrorMessage = "No employees provided.")]
    [MinLength(1, ErrorMessage = "No employees provided.")]
    [MaxLength(200, ErrorMessage = "You can import at most 200 employees at a time.")]
    public List<BulkEmployeeRow> Employees { get; set; } = [];
}

public class BulkDeleteRequest
{
    [Required(ErrorMessage = "Select at least one employee.")]
    [MinLength(1, ErrorMessage = "Select at least one employee.")]
    [MaxLength(200, ErrorMessage = "You can delete at most 200 employees at a time.")]
    public List<int> Ids { get; set; } = [];
}

public class EmployeeQuery
{
    public string? Search { get; set; }
    public int? DepartmentId { get; set; }
    public EmployeeStatus? Status { get; set; }
    public string? SortBy { get; set; }
    public bool Descending { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public record EmployeeDto(
    int Id,
    string EmployeeCode,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string Phone,
    DateOnly DateOfBirth,
    string Gender,
    int DepartmentId,
    string DepartmentName,
    string Designation,
    DateOnly JoiningDate,
    decimal Salary,
    string Status,
    DateTime CreatedAt);
