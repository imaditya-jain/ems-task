using EMS.Application.Common.Exceptions;
using EMS.Application.Employees.Interfaces;
using EMS.Application.Performance.Dtos;
using EMS.Application.Performance.Interfaces;
using EMS.Application.Performance.Services;
using EMS.Domain.Entities;
using EMS.Tests.Helpers;
using NSubstitute;

namespace EMS.Tests.Performance;

public class PerformanceServiceTests
{
    private readonly IPerformanceRepository _reviews = Substitute.For<IPerformanceRepository>();
    private readonly IEmployeeRepository _employees = Substitute.For<IEmployeeRepository>();
    private readonly PerformanceService _sut;

    public PerformanceServiceTests()
    {
        _employees.GetByIdAsync(1).Returns(TestData.Employee());
        _sut = new PerformanceService(_reviews, _employees);
    }

    private static int CurrentQuarter => (DateTime.UtcNow.Month - 1) / 3 + 1;

    private static PerformanceReviewRequest Request(int year, int quarter, int q = 4, int p = 4, int t = 4, int employeeId = 1) => new()
    {
        EmployeeId = employeeId, Year = year, Quarter = quarter,
        QualityScore = q, ProductivityScore = p, TeamworkScore = t, Comments = "  Solid  "
    };

    private static PerformanceReview ExistingReview() => new()
    {
        Id = 10, EmployeeId = 1, Year = 2025, Quarter = 2, QualityScore = 3, ProductivityScore = 3, TeamworkScore = 3,
        Employee = TestData.Employee()
    };

    // ---- create --------------------------------------------------------------------------------

    [Fact]
    public async Task Create_ComputesOverallRatingAndLabel_AndTrimsComments()
    {
        var dto = await _sut.CreateAsync(Request(2025, 1, 5, 5, 4));

        Assert.Equal(4.67m, dto.OverallRating);
        Assert.Equal("Outstanding", dto.RatingLabel);
        Assert.Equal("Solid", dto.Comments);
        await _reviews.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task Create_ForTheCurrentQuarter_IsAllowed()
    {
        await _sut.CreateAsync(Request(DateTime.UtcNow.Year, CurrentQuarter));

        await _reviews.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task Create_ForAFutureYear_IsRejected()
    {
        await Assert.ThrowsAsync<BadRequestException>(() => _sut.CreateAsync(Request(DateTime.UtcNow.Year + 1, 1)));
    }

    [Fact]
    public async Task Create_ForALaterQuarterOfThisYear_IsRejected()
    {
        if (CurrentQuarter == 4) return; // no later quarter exists this year

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.CreateAsync(Request(DateTime.UtcNow.Year, CurrentQuarter + 1)));
    }

    [Fact]
    public async Task Create_ForAnEmployeeWhoAlreadyHasThatQuarter_ThrowsConflict()
    {
        _reviews.PeriodExistsAsync(1, 2025, 2, null).Returns(true);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAsync(Request(2025, 2)));

        Assert.Contains("2025 Q2", ex.Message);
        await _reviews.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task Create_ForUnknownEmployee_ThrowsBadRequest()
    {
        _employees.GetByIdAsync(77).Returns((Employee?)null);

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.CreateAsync(Request(2025, 1, employeeId: 77)));
    }

    // ---- update / delete ----------------------------------------------------------------------

    [Fact]
    public async Task Update_AppliesNewScores_AndExcludesItselfFromTheDuplicateCheck()
    {
        var existing = ExistingReview();
        _reviews.GetByIdAsync(10).Returns(existing);

        var dto = await _sut.UpdateAsync(10, Request(2025, 2, 5, 5, 5));

        Assert.Equal(5.00m, dto.OverallRating);
        await _reviews.Received(1).PeriodExistsAsync(1, 2025, 2, 10);
    }

    [Fact]
    public async Task Update_CannotMoveAReviewToAnotherEmployee()
    {
        _reviews.GetByIdAsync(10).Returns(ExistingReview());

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.UpdateAsync(10, Request(2025, 2, employeeId: 2)));
    }

    [Fact]
    public async Task Update_OfMissingReview_ThrowsNotFound()
    {
        _reviews.GetByIdAsync(404).Returns((PerformanceReview?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.UpdateAsync(404, Request(2025, 2)));
    }

    [Fact]
    public async Task Delete_RemovesTheReview()
    {
        var existing = ExistingReview();
        _reviews.GetByIdAsync(10).Returns(existing);

        await _sut.DeleteAsync(10);

        _reviews.Received(1).Remove(existing);
        await _reviews.Received(1).SaveChangesAsync();
    }

    // ---- metrics -------------------------------------------------------------------------------

    private static PerformanceScoreRow Row(int id, string name, string dept, int year, int quarter, int q, int p, int t) =>
        new(id, $"EMP-{id}", name, dept, year, quarter, q, p, t);

    private void GivenScores(params PerformanceScoreRow[] rows) =>
        _reviews.GetScoreRowsAsync(Arg.Any<int?>()).Returns(rows.ToList());

    [Fact]
    public async Task Metrics_WithNoReviews_ReturnsZeroedSummary()
    {
        GivenScores();

        var metrics = await _sut.GetMetricsAsync(new PerformanceMetricsQuery());

        Assert.Equal(0, metrics.Summary.ReviewCount);
        Assert.Equal(0m, metrics.Summary.AverageOverall);
        Assert.Empty(metrics.TopPerformers);
        Assert.All(metrics.Distribution, bucket => Assert.Equal(0, bucket.Count));
    }

    [Fact]
    public async Task Metrics_SummaryAveragesEachScore()
    {
        GivenScores(
            Row(1, "Anil", "Eng", 2026, 1, 5, 4, 3),
            Row(2, "Bina", "Eng", 2026, 1, 3, 2, 3));

        var summary = (await _sut.GetMetricsAsync(new PerformanceMetricsQuery())).Summary;

        Assert.Equal(2, summary.ReviewCount);
        Assert.Equal(4.0m, summary.AverageQuality);
        Assert.Equal(3.0m, summary.AverageProductivity);
        Assert.Equal(3.0m, summary.AverageTeamwork);
        Assert.Equal(3.33m, summary.AverageOverall);
    }

    [Fact]
    public async Task Metrics_YearAndQuarterFilters_NarrowTheHeadlineNumbers_ButNotTheTrend()
    {
        GivenScores(
            Row(1, "Anil", "Eng", 2025, 4, 5, 5, 5),
            Row(1, "Anil", "Eng", 2026, 1, 3, 3, 3),
            Row(1, "Anil", "Eng", 2026, 2, 4, 4, 4));

        var metrics = await _sut.GetMetricsAsync(new PerformanceMetricsQuery { Year = 2026, Quarter = 1 });

        Assert.Equal(1, metrics.Summary.ReviewCount);
        Assert.Equal(3.00m, metrics.Summary.AverageOverall);
        Assert.Equal(["2025 Q4", "2026 Q1", "2026 Q2"], metrics.Trend.Select(t => t.Period).ToArray());
    }

    [Fact]
    public async Task Metrics_DistributionBucketsFollowTheRatingLabels()
    {
        GivenScores(
            Row(1, "A", "Eng", 2026, 1, 5, 5, 5),   // 5.00 Outstanding
            Row(2, "B", "Eng", 2026, 1, 4, 4, 4),   // 4.00 Exceeds
            Row(3, "C", "Eng", 2026, 1, 3, 3, 3),   // 3.00 Meets
            Row(4, "D", "Eng", 2026, 1, 2, 2, 2),   // 2.00 Needs improvement
            Row(5, "E", "Eng", 2026, 1, 1, 2, 2));  // 1.67 Needs improvement

        var distribution = (await _sut.GetMetricsAsync(new PerformanceMetricsQuery())).Distribution
            .ToDictionary(b => b.Label, b => b.Count);

        Assert.Equal(1, distribution["Outstanding"]);
        Assert.Equal(1, distribution["Exceeds Expectations"]);
        Assert.Equal(1, distribution["Meets Expectations"]);
        Assert.Equal(2, distribution["Needs Improvement"]);
    }

    [Fact]
    public async Task Metrics_TopPerformersAreSortedDescending_AndNeedsImprovementOnlyListsBelowThree()
    {
        GivenScores(
            Row(1, "Anil", "Eng", 2026, 1, 5, 5, 5),
            Row(2, "Bina", "Eng", 2026, 1, 3, 3, 3),
            Row(3, "Chet", "Eng", 2026, 1, 2, 2, 2),
            Row(4, "Devi", "Eng", 2026, 1, 1, 2, 2));

        var metrics = await _sut.GetMetricsAsync(new PerformanceMetricsQuery());

        Assert.Equal("Anil", metrics.TopPerformers[0].EmployeeName);
        Assert.Equal(["Devi", "Chet"], metrics.NeedsImprovement.Select(p => p.EmployeeName).ToArray());
    }

    [Fact]
    public async Task Metrics_ByDepartment_AveragesAndOrdersBestFirst()
    {
        GivenScores(
            Row(1, "A", "Sales", 2026, 1, 3, 3, 3),
            Row(2, "B", "Eng", 2026, 1, 5, 5, 5),
            Row(3, "C", "Eng", 2026, 1, 4, 4, 4));

        var departments = (await _sut.GetMetricsAsync(new PerformanceMetricsQuery())).ByDepartment;

        Assert.Equal("Eng", departments[0].Department);
        Assert.Equal(4.5m, departments[0].AverageOverall);
        Assert.Equal(2, departments[0].ReviewCount);
    }

    [Fact]
    public async Task Metrics_PassesTheDepartmentFilterToTheRepository()
    {
        GivenScores();

        await _sut.GetMetricsAsync(new PerformanceMetricsQuery { DepartmentId = 4 });

        await _reviews.Received(1).GetScoreRowsAsync(4);
    }
}
