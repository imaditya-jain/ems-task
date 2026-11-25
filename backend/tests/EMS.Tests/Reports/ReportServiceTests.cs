using EMS.Application.Common.Exceptions;
using EMS.Application.Reports.Interfaces;
using EMS.Application.Reports.Models;
using EMS.Application.Reports.Services;
using EMS.Domain.Enums;
using EMS.Tests.Helpers;
using NSubstitute;

namespace EMS.Tests.Reports;

public class ReportServiceTests
{
    private readonly IReportRepository _repo = Substitute.For<IReportRepository>();
    private readonly IPdfReportGenerator _pdf = Substitute.For<IPdfReportGenerator>();
    private readonly IExcelReportGenerator _excel = Substitute.For<IExcelReportGenerator>();
    private readonly ReportService _sut;
    private ReportDocument? _document;

    public ReportServiceTests()
    {
        _pdf.Generate(Arg.Do<ReportDocument>(d => _document = d)).Returns([1, 2, 3]);
        _excel.Generate(Arg.Do<ReportDocument>(d => _document = d)).Returns([4, 5, 6]);
        _repo.GetEmployeesAsync(Arg.Any<int?>(), Arg.Any<EmployeeStatus?>()).Returns([]);
        _repo.GetPerformanceRowsAsync(Arg.Any<int?>(), Arg.Any<int?>(), Arg.Any<int?>()).Returns([]);
        _repo.GetAttendanceTotalsAsync(Arg.Any<DateOnly>(), Arg.Any<DateOnly>(), Arg.Any<int?>()).Returns([]);
        _repo.GetDepartmentStatsAsync().Returns([]);
        _sut = new ReportService(_repo, _pdf, _excel);
    }

    private static object? Summary(ReportDocument doc, string label) => doc.Summary.Single(s => s.Label == label).Value;

    // ---- format / file --------------------------------------------------------------------------

    [Fact]
    public async Task Pdf_IsTheDefaultFormat_WithPdfContentTypeAndDatedFileName()
    {
        var file = await _sut.EmployeeDirectoryAsync(new ReportQuery());

        Assert.Equal("application/pdf", file.ContentType);
        Assert.Equal([1, 2, 3], file.Content);
        Assert.Equal($"employee-directory-{DateTime.UtcNow:yyyy-MM-dd}.pdf", file.FileName);
        _excel.DidNotReceive().Generate(Arg.Any<ReportDocument>());
    }

    [Fact]
    public async Task Excel_UsesTheExcelGenerator_AndXlsxContentType()
    {
        var file = await _sut.SalaryAsync(new ReportQuery { Format = ReportFormat.Excel });

        Assert.Equal("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", file.ContentType);
        Assert.Equal([4, 5, 6], file.Content);
        Assert.EndsWith(".xlsx", file.FileName);
        _pdf.DidNotReceive().Generate(Arg.Any<ReportDocument>());
    }

    // ---- employee directory ---------------------------------------------------------------------

    [Fact]
    public async Task Directory_HasOneRowPerEmployee_AndSummarisesActiveAndInactive()
    {
        _repo.GetEmployeesAsync(null, null).Returns(
        [
            TestData.Employee(1, "EMP-1"),
            TestData.Employee(2, "EMP-2", status: EmployeeStatus.Inactive)
        ]);

        await _sut.EmployeeDirectoryAsync(new ReportQuery());

        Assert.Equal(2, _document!.Rows.Count);
        Assert.Equal(_document.Columns.Count, _document.Rows[0].Length);
        Assert.Equal(2, Summary(_document, "Total employees"));
        Assert.Equal(1, Summary(_document, "Active"));
        Assert.Equal(1, Summary(_document, "Inactive"));
    }

    [Fact]
    public async Task Directory_PassesFiltersToTheRepository()
    {
        await _sut.EmployeeDirectoryAsync(new ReportQuery { DepartmentId = 3, Status = EmployeeStatus.Inactive });

        await _repo.Received(1).GetEmployeesAsync(3, EmployeeStatus.Inactive);
    }

    // ---- departments ----------------------------------------------------------------------------

    [Fact]
    public async Task Departments_ComputesAverageSalary_AndHandlesEmptyDepartments()
    {
        _repo.GetDepartmentStatsAsync().Returns(
        [
            new DepartmentStatsRow("Eng", "Builds", 4, 3, 1, 200000m),
            new DepartmentStatsRow("Empty", null, 0, 0, 0, 0m)
        ]);

        await _sut.DepartmentsAsync(new ReportQuery());

        var eng = _document!.Rows[0];
        Assert.Equal(new Money(50000m), eng[6]);
        Assert.Equal("—", _document.Rows[1][1]);             // missing description
        Assert.Equal(new Money(0m), _document.Rows[1][6]);   // no divide-by-zero
        Assert.Equal(new Money(200000m), Summary(_document, "Total monthly payroll"));
    }

    // ---- attendance -----------------------------------------------------------------------------

    [Fact]
    public async Task Attendance_DefaultsToTheWholeCurrentMonth()
    {
        await _sut.AttendanceAsync(new ReportQuery());

        var first = new DateOnly(TestData.Today.Year, TestData.Today.Month, 1);
        await _repo.Received(1).GetAttendanceTotalsAsync(first, first.AddMonths(1).AddDays(-1), null);
    }

    [Fact]
    public async Task Attendance_RejectsAReversedRange()
    {
        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.AttendanceAsync(new ReportQuery { From = new DateOnly(2026, 5, 10), To = new DateOnly(2026, 5, 1) }));
    }

    [Fact]
    public async Task Attendance_RejectsRangesOverAYear()
    {
        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.AttendanceAsync(new ReportQuery { From = new DateOnly(2025, 1, 1), To = new DateOnly(2026, 6, 1) }));
    }

    [Fact]
    public async Task Attendance_ComputesTheRate_AndShowsDashWhenThereAreNoCountableDays()
    {
        _repo.GetAttendanceTotalsAsync(Arg.Any<DateOnly>(), Arg.Any<DateOnly>(), Arg.Any<int?>()).Returns(
        [
            new AttendanceTotalsRow("EMP-1", "Anil Test", "Eng", Present: 8, Late: 0, HalfDay: 0, Leave: 3, Absent: 2),
            new AttendanceTotalsRow("EMP-2", "Bina Test", "Eng", Present: 0, Late: 0, HalfDay: 0, Leave: 5, Absent: 0)
        ]);

        await _sut.AttendanceAsync(new ReportQuery());

        Assert.Equal(new Percent(0.8m), _document!.Rows[0][8]);   // leave is excluded from the denominator
        Assert.Null(_document.Rows[1][8]);                         // only leave -> nothing countable
        Assert.Equal(8, Summary(_document, "Present days"));
    }

    // ---- salary ---------------------------------------------------------------------------------

    [Fact]
    public async Task Salary_DefaultsToActiveEmployees()
    {
        await _sut.SalaryAsync(new ReportQuery());

        await _repo.Received(1).GetEmployeesAsync(null, EmployeeStatus.Active);
    }

    [Fact]
    public async Task Salary_ComputesAnnualAndPayrollTotals()
    {
        _repo.GetEmployeesAsync(null, EmployeeStatus.Active).Returns(
        [
            TestData.Employee(1, "EMP-1", salary: 40000),
            TestData.Employee(2, "EMP-2", salary: 60000)
        ]);

        await _sut.SalaryAsync(new ReportQuery());

        Assert.Equal(new Money(480000m), _document!.Rows[0][5]);
        Assert.Equal(new Money(100000m), Summary(_document, "Total monthly payroll"));
        Assert.Equal(new Money(1200000m), Summary(_document, "Total annual payroll"));
        Assert.Equal(new Money(50000m), Summary(_document, "Average monthly salary"));
        Assert.Equal(new Money(60000m), Summary(_document, "Highest"));
        Assert.Equal(new Money(40000m), Summary(_document, "Lowest"));
    }

    [Fact]
    public async Task Salary_WithNoEmployees_ProducesZeroTotals_InsteadOfThrowing()
    {
        await _sut.SalaryAsync(new ReportQuery());

        Assert.Empty(_document!.Rows);
        Assert.Equal(new Money(0m), Summary(_document, "Highest"));
    }

    // ---- performance ----------------------------------------------------------------------------

    [Theory]
    [InlineData(0)]
    [InlineData(5)]
    public async Task Performance_RejectsInvalidQuarters(int quarter)
    {
        await Assert.ThrowsAsync<BadRequestException>(() => _sut.PerformanceAsync(new ReportQuery { Quarter = quarter }));
    }

    [Fact]
    public async Task Performance_BuildsRowsWithRatings_AndPerDepartmentAverages()
    {
        _repo.GetPerformanceRowsAsync(2026, 1, null).Returns(
        [
            new PerformanceReportRow("EMP-1", "Anil Test", "Eng", 2026, 1, 5, 5, 5),
            new PerformanceReportRow("EMP-2", "Bina Test", "Eng", 2026, 1, 2, 2, 2),
            new PerformanceReportRow("EMP-3", "Chet Test", "Sales", 2026, 1, 4, 4, 4)
        ]);

        await _sut.PerformanceAsync(new ReportQuery { Year = 2026, Quarter = 1 });

        Assert.Equal("2026 Q1", _document!.Subtitle);
        Assert.Equal("Outstanding", _document.Rows[0][8]);
        Assert.Equal("Needs Improvement", _document.Rows[1][8]);
        Assert.Equal(3, Summary(_document, "Reviews"));
        Assert.Equal(3.5m, Summary(_document, "Average - Eng"));
        Assert.Equal(4.0m, Summary(_document, "Average - Sales"));
    }

    [Theory]
    [InlineData(null, null, "All periods")]
    [InlineData(2026, null, "Year 2026")]
    [InlineData(null, 3, "Q3 (all years)")]
    public async Task Performance_DescribesThePeriodInTheSubtitle(int? year, int? quarter, string expected)
    {
        await _sut.PerformanceAsync(new ReportQuery { Year = year, Quarter = quarter });

        Assert.StartsWith(expected, _document!.Subtitle);
    }
}
