using EMS.Domain.Common;
using EMS.Domain.Enums;

namespace EMS.Domain.Entities;

/// <summary>One status per employee per calendar day.</summary>
public class Attendance : BaseEntity
{
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    public DateOnly Date { get; set; }
    public AttendanceStatus Status { get; set; }
    public string? Notes { get; set; }
}
