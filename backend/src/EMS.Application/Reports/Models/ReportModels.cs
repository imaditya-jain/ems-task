using EMS.Domain.Enums;

namespace EMS.Application.Reports.Models;

public enum ReportFormat
{
    Pdf = 1,
    Excel = 2
}

public enum ColumnAlign
{
    Left,
    Right,
    Center
}

/// <summary>Query-string options shared by all report endpoints. Each report uses the ones that apply to it.</summary>
public class ReportQuery
{
    public ReportFormat Format { get; set; } = ReportFormat.Pdf;
    public int? DepartmentId { get; set; }
    public EmployeeStatus? Status { get; set; }
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public int? Year { get; set; }
    public int? Quarter { get; set; }
}

// Typed cell values: renderers format them (PDF text) or store them natively (Excel numbers/dates/percentages).
public record Money(decimal Amount);
public record Percent(decimal Fraction);

public record ReportColumn(string Header, ColumnAlign Align = ColumnAlign.Left);

public record ReportSummaryItem(string Label, object? Value);

/// <summary>Format-neutral description of a report. One document can be rendered as PDF or Excel.</summary>
public record ReportDocument(
    string Title,
    string? Subtitle,
    IReadOnlyList<ReportColumn> Columns,
    IReadOnlyList<object?[]> Rows,
    IReadOnlyList<ReportSummaryItem> Summary);

public record ReportFile(byte[] Content, string ContentType, string FileName);

// Read models returned by the repository -------------------------------------------------

public record DepartmentStatsRow(string Name, string? Description, int Total, int Active, int Inactive, decimal TotalSalary);

public record AttendanceTotalsRow(
    string EmployeeCode, string FullName, string DepartmentName,
    int Present, int Late, int HalfDay, int Leave, int Absent);

public record PerformanceReportRow(
    string EmployeeCode, string FullName, string DepartmentName, int Year, int Quarter,
    int Quality, int Productivity, int Teamwork);
