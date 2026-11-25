using System.ComponentModel.DataAnnotations;

namespace EMS.Application.Departments.Dtos;

public class DepartmentRequest
{
    [Required(ErrorMessage = "Department name is required.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Department name must be between 2 and 100 characters.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(255, ErrorMessage = "Description cannot exceed 255 characters.")]
    public string? Description { get; set; }
}

public record DepartmentDto(int Id, string Name, string? Description, DateTime CreatedAt);
