namespace EMS.Application.Analytics.Dtos;

// ---- Overview (dashboard cards) -----------------------------------------------------------------
public record OverviewDto(
    int TotalEmployees,
    int ActiveEmployees,
    int InactiveEmployees,
    int Departments,
    int NewHiresThisMonth,
    decimal MonthlyPayroll,
    decimal AverageSalary,
    TodayAttendanceDto TodayAttendance);

public record TodayAttendanceDto(string Date, int Present, int Late, int HalfDay, int Leave, int Absent, int NotMarked);

// ---- Hiring trend -------------------------------------------------------------------------------
public record HiringTrendPointDto(string Month, int Hires, int Headcount);

public record HiringTrendDto(
    IReadOnlyList<HiringTrendPointDto> Points,
    int TotalHires,
    decimal AverageHiresPerMonth,
    string? PeakMonth);

// ---- Department growth --------------------------------------------------------------------------
public record DepartmentGrowthSeriesDto(string Department, IReadOnlyList<int> Headcount, int Current, int Change, decimal? GrowthPercent);

public record DepartmentGrowthDto(IReadOnlyList<string> Months, IReadOnlyList<DepartmentGrowthSeriesDto> Departments);

// ---- Attendance patterns ------------------------------------------------------------------------
public class AttendancePatternQuery
{
    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }
    public int? DepartmentId { get; set; }
}

public record WeekdayPatternDto(string Weekday, int Present, int Late, int HalfDay, int Leave, int Absent, decimal? AttendanceRate);
public record DailyAttendancePointDto(string Date, int Present, int Late, int HalfDay, int Leave, int Absent, decimal? AttendanceRate);
public record AttendanceOffenderDto(string EmployeeCode, string EmployeeName, string Department, int Late, int Absent);
public record StatusTotalsDto(int Present, int Late, int HalfDay, int Leave, int Absent, decimal? AttendanceRate);

public record AttendancePatternDto(
    string From,
    string To,
    StatusTotalsDto Totals,
    IReadOnlyList<WeekdayPatternDto> ByWeekday,
    IReadOnlyList<DailyAttendancePointDto> Daily,
    IReadOnlyList<AttendanceOffenderDto> FrequentlyLateOrAbsent);

// ---- Repository read models ---------------------------------------------------------------------
public record EmployeeJoinRow(DateOnly JoiningDate, string DepartmentName);
public record AttendanceDayCountRow(DateOnly Date, string Status, int Count);
public record OverviewCountsRow(int Total, int Active, int Inactive, int Departments, int NewHires, decimal ActivePayroll);
