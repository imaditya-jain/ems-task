using EMS.Application.Analytics.Dtos;
using EMS.Application.Analytics.Interfaces;
using EMS.Application.Analytics.Services;
using EMS.Application.Common.Exceptions;
using EMS.Tests.Helpers;
using NSubstitute;

namespace EMS.Tests.Analytics;

public class AnalyticsServiceTests
{
    private readonly IAnalyticsRepository _repo = Substitute.For<IAnalyticsRepository>();
    private readonly AnalyticsService _sut;

    public AnalyticsServiceTests()
    {
        _repo.GetEmployeeJoinsAsync().Returns([]);
        _repo.GetAttendanceCountsAsync(Arg.Any<DateOnly>(), Arg.Any<DateOnly>(), Arg.Any<int?>()).Returns([]);
        _repo.GetAttendanceOffendersAsync(Arg.Any<DateOnly>(), Arg.Any<DateOnly>(), Arg.Any<int?>(), Arg.Any<int>()).Returns([]);
        _sut = new AnalyticsService(_repo);
    }

    private static DateOnly FirstOfMonth(int monthsAgo)
    {
        var d = TestData.Today.AddMonths(-monthsAgo);
        return new DateOnly(d.Year, d.Month, 1);
    }

    // ---- overview ------------------------------------------------------------------------------

    [Fact]
    public async Task Overview_ReportsHeadcount_Payroll_AndTodaysAttendance()
    {
        var today = new DateOnly(2026, 3, 18);
        _repo.GetOverviewCountsAsync(new DateOnly(2026, 3, 1)).Returns(new OverviewCountsRow(12, 10, 2, 3, 4, 500000m));
        _repo.GetAttendanceCountsAsync(today, today, null).Returns(
        [
            new AttendanceDayCountRow(today, "Present", 6),
            new AttendanceDayCountRow(today, "Late", 1),
            new AttendanceDayCountRow(today, "Absent", 1)
        ]);

        var overview = await _sut.GetOverviewAsync(today);

        Assert.Equal(12, overview.TotalEmployees);
        Assert.Equal(2, overview.InactiveEmployees);
        Assert.Equal(4, overview.NewHiresThisMonth);
        Assert.Equal(50000m, overview.AverageSalary); // payroll / ACTIVE employees
        Assert.Equal("2026-03-18", overview.TodayAttendance.Date);
        Assert.Equal(6, overview.TodayAttendance.Present);
        Assert.Equal(2, overview.TodayAttendance.NotMarked); // 10 active - 8 marked
    }

    [Fact]
    public async Task Overview_WithNoActiveEmployees_DoesNotDivideByZero()
    {
        _repo.GetOverviewCountsAsync(Arg.Any<DateOnly>()).Returns(new OverviewCountsRow(0, 0, 0, 0, 0, 0m));

        var overview = await _sut.GetOverviewAsync(null);

        Assert.Equal(0m, overview.AverageSalary);
        Assert.Equal(0, overview.TodayAttendance.NotMarked);
    }

    // ---- hiring trend --------------------------------------------------------------------------

    [Theory]
    [InlineData(2)]
    [InlineData(37)]
    [InlineData(0)]
    public async Task HiringTrend_RejectsMonthsOutsideTheSupportedRange(int months)
    {
        await Assert.ThrowsAsync<BadRequestException>(() => _sut.GetHiringTrendAsync(months));
        await Assert.ThrowsAsync<BadRequestException>(() => _sut.GetDepartmentGrowthAsync(months));
    }

    [Fact]
    public async Task HiringTrend_CountsHiresPerMonth_AndRunningHeadcount()
    {
        _repo.GetEmployeeJoinsAsync().Returns(
        [
            new EmployeeJoinRow(TestData.Today.AddYears(-1), "Eng"),                 // before the window
            new EmployeeJoinRow(FirstOfMonth(2).AddDays(4), "Eng"),                  // 2 months ago
            new EmployeeJoinRow(FirstOfMonth(0), "Sales"),                           // this month (first day)
            new EmployeeJoinRow(FirstOfMonth(0), "HR")
        ]);

        var trend = await _sut.GetHiringTrendAsync(3);

        Assert.Equal(3, trend.Points.Count);
        Assert.Equal([1, 0, 2], trend.Points.Select(p => p.Hires).ToArray());
        Assert.Equal([2, 2, 4], trend.Points.Select(p => p.Headcount).ToArray());
        Assert.Equal(3, trend.TotalHires);
        Assert.Equal(1.0m, trend.AverageHiresPerMonth);
        Assert.Equal(trend.Points[2].Month, trend.PeakMonth);
    }

    [Fact]
    public async Task HiringTrend_WithoutAnyHires_HasNoPeakMonth()
    {
        var trend = await _sut.GetHiringTrendAsync(6);

        Assert.Equal(0, trend.TotalHires);
        Assert.Null(trend.PeakMonth);
        Assert.Equal(6, trend.Points.Count);
    }

    [Fact]
    public async Task HiringTrend_MonthLabelsAreChronological_EndingWithTheCurrentMonth()
    {
        var trend = await _sut.GetHiringTrendAsync(4);

        var labels = trend.Points.Select(p => p.Month).ToList();
        Assert.Equal(labels.OrderBy(l => l).ToList(), labels);
        Assert.Equal(TestData.Today.ToString("yyyy-MM"), labels[^1]);
    }

    // ---- department growth ---------------------------------------------------------------------

    [Fact]
    public async Task DepartmentGrowth_TracksHeadcountPerDepartmentOverTime()
    {
        _repo.GetEmployeeJoinsAsync().Returns(
        [
            new EmployeeJoinRow(TestData.Today.AddYears(-2), "Eng"),
            new EmployeeJoinRow(FirstOfMonth(0), "Eng"),
            new EmployeeJoinRow(FirstOfMonth(1), "Sales")
        ]);

        var growth = await _sut.GetDepartmentGrowthAsync(3);

        var eng = growth.Departments.Single(d => d.Department == "Eng");
        Assert.Equal([1, 1, 2], eng.Headcount.ToArray());
        Assert.Equal(1, eng.Change);
        Assert.Equal(100m, eng.GrowthPercent);

        var sales = growth.Departments.Single(d => d.Department == "Sales");
        Assert.Equal([0, 1, 1], sales.Headcount.ToArray());
        Assert.Null(sales.GrowthPercent); // started at zero: percentage is undefined
        Assert.Equal(["Eng", "Sales"], growth.Departments.Select(d => d.Department).ToArray());
    }

    // ---- attendance patterns -------------------------------------------------------------------

    private static DateOnly LastMonday()
    {
        var d = TestData.Today.AddDays(-7);
        while (d.DayOfWeek != DayOfWeek.Monday) d = d.AddDays(-1);
        return d;
    }

    [Fact]
    public async Task AttendancePatterns_AggregatesByWeekday_AndComputesRates()
    {
        var monday = LastMonday();
        var tuesday = monday.AddDays(1);
        _repo.GetAttendanceCountsAsync(monday, tuesday, null).Returns(
        [
            new AttendanceDayCountRow(monday, "Present", 8),
            new AttendanceDayCountRow(monday, "Absent", 2),
            new AttendanceDayCountRow(tuesday, "Present", 10)
        ]);

        var result = await _sut.GetAttendancePatternsAsync(new AttendancePatternQuery { From = monday, To = tuesday });

        var byDay = result.ByWeekday.ToDictionary(w => w.Weekday);
        Assert.Equal(7, result.ByWeekday.Count);
        Assert.Equal("Monday", result.ByWeekday[0].Weekday); // Monday-first
        Assert.Equal(0.8m, byDay["Monday"].AttendanceRate);
        Assert.Equal(1.0m, byDay["Tuesday"].AttendanceRate);
        Assert.Null(byDay["Wednesday"].AttendanceRate);       // no data that day
        Assert.Equal(18, result.Totals.Present);
        Assert.Equal(2, result.Totals.Absent);
        Assert.Equal(2, result.Daily.Count);
    }

    [Fact]
    public async Task AttendancePatterns_DefaultsToTheLast30Days()
    {
        await _sut.GetAttendancePatternsAsync(new AttendancePatternQuery());

        await _repo.Received(1).GetAttendanceCountsAsync(TestData.Today.AddDays(-29), TestData.Today, null);
    }

    [Fact]
    public async Task AttendancePatterns_RejectsAReversedRange()
    {
        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.GetAttendancePatternsAsync(new AttendancePatternQuery { From = TestData.Today, To = TestData.Today.AddDays(-1) }));
    }

    [Fact]
    public async Task AttendancePatterns_RejectsRangesLongerThanAYear()
    {
        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.GetAttendancePatternsAsync(new AttendancePatternQuery { From = TestData.Today.AddDays(-400), To = TestData.Today }));
    }

    [Fact]
    public async Task AttendancePatterns_IncludesTheFrequentlyLateOrAbsentList()
    {
        var offenders = new List<AttendanceOffenderDto> { new("EMP-1", "Anil Test", "Eng", 3, 5) };
        _repo.GetAttendanceOffendersAsync(Arg.Any<DateOnly>(), Arg.Any<DateOnly>(), Arg.Any<int?>(), 5).Returns(offenders);

        var result = await _sut.GetAttendancePatternsAsync(new AttendancePatternQuery());

        Assert.Equal("Anil Test", result.FrequentlyLateOrAbsent.Single().EmployeeName);
    }
}
