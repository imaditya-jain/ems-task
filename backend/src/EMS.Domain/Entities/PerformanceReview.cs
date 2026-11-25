using EMS.Domain.Common;

namespace EMS.Domain.Entities;

/// <summary>A quarterly review. Each score is 1-5; the overall rating is their average.</summary>
public class PerformanceReview : BaseEntity
{
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    public int Year { get; set; }

    /// <summary>1-4</summary>
    public int Quarter { get; set; }

    public int QualityScore { get; set; }
    public int ProductivityScore { get; set; }
    public int TeamworkScore { get; set; }
    public string? Comments { get; set; }
}
