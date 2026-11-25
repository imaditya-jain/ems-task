using System.ComponentModel.DataAnnotations;

namespace EMS.Application.Performance.Dtos;

public class PerformanceReviewRequest
{
    [Required(ErrorMessage = "Employee is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Employee is required.")]
    public int? EmployeeId { get; set; }

    [Required(ErrorMessage = "Year is required.")]
    [Range(2000, 2100, ErrorMessage = "Enter a valid year.")]
    public int? Year { get; set; }

    [Required(ErrorMessage = "Quarter is required.")]
    [Range(1, 4, ErrorMessage = "Quarter must be between 1 and 4.")]
    public int? Quarter { get; set; }

    [Required(ErrorMessage = "Quality score is required.")]
    [Range(1, 5, ErrorMessage = "Quality score must be between 1 and 5.")]
    public int? QualityScore { get; set; }

    [Required(ErrorMessage = "Productivity score is required.")]
    [Range(1, 5, ErrorMessage = "Productivity score must be between 1 and 5.")]
    public int? ProductivityScore { get; set; }

    [Required(ErrorMessage = "Teamwork score is required.")]
    [Range(1, 5, ErrorMessage = "Teamwork score must be between 1 and 5.")]
    public int? TeamworkScore { get; set; }

    [StringLength(500, ErrorMessage = "Comments cannot exceed 500 characters.")]
    public string? Comments { get; set; }
}

public class PerformanceQuery
{
    public string? Search { get; set; }
    public int? DepartmentId { get; set; }
    public int? Year { get; set; }
    public int? Quarter { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

/// <summary>Filters for the metrics dashboard. Year/Quarter narrow the headline numbers; the trend always spans all periods.</summary>
public class PerformanceMetricsQuery
{
    public int? DepartmentId { get; set; }
    public int? Year { get; set; }
    public int? Quarter { get; set; }
}

public record PerformanceReviewDto(
    int Id,
    int EmployeeId,
    string EmployeeCode,
    string EmployeeName,
    string DepartmentName,
    int Year,
    int Quarter,
    int QualityScore,
    int ProductivityScore,
    int TeamworkScore,
    decimal OverallRating,
    string RatingLabel,
    string? Comments,
    DateTime CreatedAt);

/// <summary>Flat row the repository returns for metric calculations.</summary>
public record PerformanceScoreRow(
    int EmployeeId, string EmployeeCode, string EmployeeName, string DepartmentName,
    int Year, int Quarter, int Quality, int Productivity, int Teamwork)
{
    public decimal Overall => PerformanceRating.Overall(Quality, Productivity, Teamwork);
}

public record PerformanceSummaryDto(int ReviewCount, decimal AverageOverall, decimal AverageQuality, decimal AverageProductivity, decimal AverageTeamwork);
public record RatingBucketDto(string Label, int Count);
public record DepartmentPerformanceDto(string Department, int ReviewCount, decimal AverageOverall);
public record PerformerDto(string EmployeeCode, string EmployeeName, string Department, string Period, decimal Overall);
public record PerformanceTrendPointDto(string Period, decimal AverageOverall, int ReviewCount);

public record PerformanceMetricsDto(
    PerformanceSummaryDto Summary,
    IReadOnlyList<RatingBucketDto> Distribution,
    IReadOnlyList<DepartmentPerformanceDto> ByDepartment,
    IReadOnlyList<PerformerDto> TopPerformers,
    IReadOnlyList<PerformerDto> NeedsImprovement,
    IReadOnlyList<PerformanceTrendPointDto> Trend);
