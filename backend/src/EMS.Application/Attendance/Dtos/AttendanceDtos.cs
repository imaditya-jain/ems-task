using System.ComponentModel.DataAnnotations;
using EMS.Domain.Enums;

namespace EMS.Application.Attendance.Dtos;

public class AttendanceRecordInput
{
    [Range(1, int.MaxValue, ErrorMessage = "Employee is required.")]
    public int EmployeeId { get; set; }

    [Required(ErrorMessage = "Attendance status is required.")]
    [EnumDataType(typeof(AttendanceStatus), ErrorMessage = "Invalid attendance status.")]
    public AttendanceStatus? Status { get; set; }

    [StringLength(255, ErrorMessage = "Notes cannot exceed 255 characters.")]
    public string? Notes { get; set; }
}

public class MarkAttendanceRequest
{
    [Required(ErrorMessage = "Date is required.")]
    public DateOnly? Date { get; set; }

    [Required(ErrorMessage = "Select at least one employee.")]
    [MinLength(1, ErrorMessage = "Select at least one employee.")]
    [MaxLength(500, ErrorMessage = "You can mark at most 500 employees at a time.")]
    public List<AttendanceRecordInput> Records { get; set; } = [];
}

public class DailyAttendanceQuery
{
    public DateOnly? Date { get; set; }
    public int? DepartmentId { get; set; }
    public string? Search { get; set; }
}

/// <summary>One line of the daily sheet. Status is null when attendance has not been marked yet.</summary>
public record DailyAttendanceRow(
    int EmployeeId,
    string EmployeeCode,
    string FullName,
    string DepartmentName,
    string? Status,
    string? Notes);

public record AttendanceRecordDto(DateOnly Date, string Status, string? Notes);

public record AttendanceSummaryDto(int Present, int Absent, int Late, int HalfDay, int Leave, int Total);

public record MonthlyAttendanceDto(string Month, IReadOnlyList<AttendanceRecordDto> Records, AttendanceSummaryDto Summary);
