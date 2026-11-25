using System.Globalization;
using EMS.Application.Analytics.Dtos;
using EMS.Application.Analytics.Interfaces;
using EMS.Application.Common;
using EMS.Application.Common.Exceptions;
using EMS.Domain.Enums;

namespace EMS.Application.Analytics.Services;

public class AnalyticsService(IAnalyticsRepository analytics) : IAnalyticsService
{
    private const int MinMonths = 3;
    private const int MaxMonths = 36;
    private const int MaxRangeDays = 366;
    private const int OffenderCount = 5;

    public async Task<OverviewDto> GetOverviewAsync(DateOnly? today, CancellationToken ct = default)
    {
        var date = today ?? Today();
        var counts = await analytics.GetOverviewCountsAsync(new DateOnly(date.Year, date.Month, 1), ct);

        // Attendance is only expected from active employees.
        var dayRows = await analytics.GetAttendanceCountsAsync(date, date, null, ct);
        int Count(AttendanceStatus s) => dayRows.Where(r => r.Status == s.ToString()).Sum(r => r.Count);

        var marked = dayRows.Sum(r => r.Count);

        return new OverviewDto(
            counts.Total, counts.Active, counts.Inactive, counts.Departments, counts.NewHires,
            counts.ActivePayroll,
            counts.Active == 0 ? 0 : Math.Round(counts.ActivePayroll / counts.Active, 2),
            new TodayAttendanceDto(
                date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                Count(AttendanceStatus.Present), Count(AttendanceStatus.Late), Count(AttendanceStatus.HalfDay),
                Count(AttendanceStatus.Leave), Count(AttendanceStatus.Absent),
                Math.Max(counts.Active - marked, 0)));
    }

    public async Task<HiringTrendDto> GetHiringTrendAsync(int months, CancellationToken ct = default)
    {
        var window = BuildMonthWindow(months);
        var joins = await analytics.GetEmployeeJoinsAsync(ct);

        var points = window.Select(month =>
        {
            var monthEnd = month.AddMonths(1).AddDays(-1);
            return new HiringTrendPointDto(
                Label(month),
                joins.Count(j => j.JoiningDate >= month && j.JoiningDate <= monthEnd),
                joins.Count(j => j.JoiningDate <= monthEnd));
        }).ToList();

        var totalHires = points.Sum(p => p.Hires);
        var peak = points.Count > 0 && totalHires > 0 ? points.MaxBy(p => p.Hires)!.Month : null;

        return new HiringTrendDto(points, totalHires, Math.Round(totalHires / (decimal)months, 1), peak);
    }

    /// <summary>
    /// Headcount per department at the end of each month, based on joining dates of the employee records that exist.
    /// (Leavers are marked Inactive, not removed, so they remain counted from the day they joined.)
    /// </summary>
    public async Task<DepartmentGrowthDto> GetDepartmentGrowthAsync(int months, CancellationToken ct = default)
    {
        var window = BuildMonthWindow(months);
        var joins = await analytics.GetEmployeeJoinsAsync(ct);

        var series = joins
            .GroupBy(j => j.DepartmentName)
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var headcount = window
                    .Select(month => g.Count(j => j.JoiningDate <= month.AddMonths(1).AddDays(-1)))
                    .ToList();

                var start = headcount[0];
                var current = headcount[^1];

                return new DepartmentGrowthSeriesDto(
                    g.Key, headcount, current, current - start,
                    start == 0 ? null : Math.Round((current - start) / (decimal)start * 100, 1));
            })
            .ToList();

        return new DepartmentGrowthDto(window.Select(Label).ToList(), series);
    }

    public async Task<AttendancePatternDto> GetAttendancePatternsAsync(AttendancePatternQuery query, CancellationToken ct = default)
    {
        var to = query.To ?? Today();
        var from = query.From ?? to.AddDays(-29);

        if (from > to) throw new BadRequestException("'From' date cannot be after 'To' date.");
        if (to.DayNumber - from.DayNumber >= MaxRangeDays)
            throw new BadRequestException($"The date range cannot exceed {MaxRangeDays} days.");

        var rows = await analytics.GetAttendanceCountsAsync(from, to, query.DepartmentId, ct);

        int Sum(IEnumerable<AttendanceDayCountRow> source, AttendanceStatus s) =>
            source.Where(r => r.Status == s.ToString()).Sum(r => r.Count);

        StatusTotalsDto Totals(IEnumerable<AttendanceDayCountRow> source)
        {
            var list = source.ToList();
            int present = Sum(list, AttendanceStatus.Present), late = Sum(list, AttendanceStatus.Late),
                half = Sum(list, AttendanceStatus.HalfDay), leave = Sum(list, AttendanceStatus.Leave),
                absent = Sum(list, AttendanceStatus.Absent);
            return new StatusTotalsDto(present, late, half, leave, absent, AttendanceMath.Rate(present, late, half, absent));
        }

        // Monday-first so the chart reads like a work week.
        var weekdays = new[] { DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday, DayOfWeek.Sunday };
        var byWeekday = weekdays.Select(day =>
        {
            var t = Totals(rows.Where(r => r.Date.DayOfWeek == day));
            return new WeekdayPatternDto(day.ToString(), t.Present, t.Late, t.HalfDay, t.Leave, t.Absent, t.AttendanceRate);
        }).ToList();

        var daily = rows.GroupBy(r => r.Date).OrderBy(g => g.Key).Select(g =>
        {
            var t = Totals(g);
            return new DailyAttendancePointDto(g.Key.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                t.Present, t.Late, t.HalfDay, t.Leave, t.Absent, t.AttendanceRate);
        }).ToList();

        var offenders = await analytics.GetAttendanceOffendersAsync(from, to, query.DepartmentId, OffenderCount, ct);

        return new AttendancePatternDto(
            from.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            to.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Totals(rows), byWeekday, daily, offenders);
    }

    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow);

    /// <summary>First day of each month, oldest first, ending with the current month.</summary>
    private static List<DateOnly> BuildMonthWindow(int months)
    {
        if (months is < MinMonths or > MaxMonths)
            throw new BadRequestException($"Months must be between {MinMonths} and {MaxMonths}.");

        var today = Today();
        var current = new DateOnly(today.Year, today.Month, 1);

        return Enumerable.Range(0, months).Select(i => current.AddMonths(-(months - 1 - i))).ToList();
    }

    private static string Label(DateOnly month) => month.ToString("yyyy-MM", CultureInfo.InvariantCulture);
}
