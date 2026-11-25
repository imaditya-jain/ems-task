using EMS.Domain.Common;
using EMS.Domain.Enums;

namespace EMS.Domain.Entities;

public class Employee : BaseEntity
{
    /// <summary>Company-assigned identifier, e.g. EMP-1001. Unique.</summary>
    public string EmployeeCode { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateOnly DateOfBirth { get; set; }
    public Gender Gender { get; set; }
    public string Designation { get; set; } = string.Empty;
    public DateOnly JoiningDate { get; set; }
    public decimal Salary { get; set; }

    /// <summary>Leavers are marked Inactive rather than deleted, so their history stays available for reports.</summary>
    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;

    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public ICollection<Attendance> Attendances { get; set; } = [];
    public ICollection<PerformanceReview> PerformanceReviews { get; set; } = [];
}
