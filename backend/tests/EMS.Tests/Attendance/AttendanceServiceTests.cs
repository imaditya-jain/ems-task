using EMS.Application.Attendance.Dtos;
using EMS.Application.Attendance.Interfaces;
using EMS.Application.Attendance.Services;
using EMS.Application.Common.Exceptions;
using EMS.Application.Employees.Interfaces;
using EMS.Domain.Entities;
using EMS.Domain.Enums;
using EMS.Tests.Helpers;
using NSubstitute;
using AttendanceEntity = EMS.Domain.Entities.Attendance;

namespace EMS.Tests.Attendance;

public class AttendanceServiceTests
{
    private readonly IAttendanceRepository _attendance = Substitute.For<IAttendanceRepository>();
    private readonly IEmployeeRepository _employees = Substitute.For<IEmployeeRepository>();
    private readonly AttendanceService _sut;

    public AttendanceServiceTests() => _sut = new AttendanceService(_attendance, _employees);

    private static MarkAttendanceRequest Request(DateOnly date, params (int Id, AttendanceStatus Status, string? Notes)[] records) => new()
    {
        Date = date,
        Records = records.Select(r => new AttendanceRecordInput { EmployeeId = r.Id, Status = r.Status, Notes = r.Notes }).ToList()
    };

    private void ActiveEmployees(params int[] ids) =>
        _attendance.GetActiveEmployeesAsync(Arg.Any<IEnumerable<int>>())
            .Returns(ids.Select(id => TestData.Employee(id, $"EMP-{id}")).ToList());

    // ---- marking -------------------------------------------------------------------------------

    [Fact]
    public async Task Mark_CreatesRecordsForEmployeesNotYetMarked()
    {
        ActiveEmployees(1, 2);
        _attendance.GetForDateAsync(Arg.Any<DateOnly>(), Arg.Any<IEnumerable<int>>()).Returns([]);
        List<AttendanceEntity>? added = null;
        await _attendance.AddRangeAsync(Arg.Do<IEnumerable<AttendanceEntity>>(a => added = a.ToList()));

        var count = await _sut.MarkAsync(Request(TestData.Today, (1, AttendanceStatus.Present, null), (2, AttendanceStatus.Late, " Traffic ")));

        Assert.Equal(2, count);
        Assert.Equal(2, added!.Count);
        Assert.Equal("Traffic", added.Single(a => a.EmployeeId == 2).Notes);
        await _attendance.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task Mark_UpdatesExistingRecords_InsteadOfDuplicatingThem()
    {
        ActiveEmployees(1);
        var existing = new AttendanceEntity { EmployeeId = 1, Date = TestData.Today, Status = AttendanceStatus.Present, Notes = "old" };
        _attendance.GetForDateAsync(TestData.Today, Arg.Any<IEnumerable<int>>()).Returns([existing]);
        List<AttendanceEntity>? added = null;
        await _attendance.AddRangeAsync(Arg.Do<IEnumerable<AttendanceEntity>>(a => added = a.ToList()));

        await _sut.MarkAsync(Request(TestData.Today, (1, AttendanceStatus.Absent, null)));

        Assert.Equal(AttendanceStatus.Absent, existing.Status);
        Assert.Null(existing.Notes); // blank notes clear the old note
        Assert.Empty(added!);
    }

    [Fact]
    public async Task Mark_WhenAnEmployeeIsSentTwice_TheLastEntryWins()
    {
        ActiveEmployees(1);
        _attendance.GetForDateAsync(Arg.Any<DateOnly>(), Arg.Any<IEnumerable<int>>()).Returns([]);
        List<AttendanceEntity>? added = null;
        await _attendance.AddRangeAsync(Arg.Do<IEnumerable<AttendanceEntity>>(a => added = a.ToList()));

        var count = await _sut.MarkAsync(Request(TestData.Today, (1, AttendanceStatus.Present, null), (1, AttendanceStatus.Leave, null)));

        Assert.Equal(1, count);
        Assert.Equal(AttendanceStatus.Leave, added!.Single().Status);
    }

    [Fact]
    public async Task Mark_ForAFutureDate_IsRejected()
    {
        var future = TestData.Today.AddDays(3);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.MarkAsync(Request(future, (1, AttendanceStatus.Present, null))));

        Assert.Contains("future", ex.Message);
        await _attendance.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task Mark_AllowsTomorrowUtc_SoUsersAheadOfUtcCanMarkTheirToday()
    {
        ActiveEmployees(1);
        _attendance.GetForDateAsync(Arg.Any<DateOnly>(), Arg.Any<IEnumerable<int>>()).Returns([]);

        await _sut.MarkAsync(Request(TestData.Today.AddDays(1), (1, AttendanceStatus.Present, null)));

        await _attendance.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task Mark_WhenAnEmployeeIsInactiveOrMissing_RejectsTheWholeRequest()
    {
        ActiveEmployees(1); // employee 2 is not returned = inactive or unknown

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.MarkAsync(Request(TestData.Today, (1, AttendanceStatus.Present, null), (2, AttendanceStatus.Present, null))));

        await _attendance.DidNotReceive().SaveChangesAsync();
    }

    // ---- daily sheet ---------------------------------------------------------------------------

    [Fact]
    public async Task DailySheet_DefaultsToToday_AndTrimsSearch()
    {
        await _sut.GetDailySheetAsync(new DailyAttendanceQuery { Search = "  anil " });

        await _attendance.Received(1).GetDailySheetAsync(TestData.Today, null, "anil");
    }

    [Fact]
    public async Task DailySheet_ForAFutureDate_IsRejected()
    {
        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.GetDailySheetAsync(new DailyAttendanceQuery { Date = TestData.Today.AddDays(10) }));
    }

    // ---- monthly -------------------------------------------------------------------------------

    [Fact]
    public async Task Monthly_SummarisesEachStatus()
    {
        _employees.GetByIdAsync(1).Returns(TestData.Employee());
        var month = new DateOnly(2026, 3, 1);
        _attendance.GetForEmployeeAsync(1, month, new DateOnly(2026, 3, 31)).Returns(
        [
            new AttendanceEntity { Date = month, Status = AttendanceStatus.Present },
            new AttendanceEntity { Date = month.AddDays(1), Status = AttendanceStatus.Present },
            new AttendanceEntity { Date = month.AddDays(2), Status = AttendanceStatus.Late },
            new AttendanceEntity { Date = month.AddDays(3), Status = AttendanceStatus.HalfDay },
            new AttendanceEntity { Date = month.AddDays(4), Status = AttendanceStatus.Leave },
            new AttendanceEntity { Date = month.AddDays(5), Status = AttendanceStatus.Absent }
        ]);

        var result = await _sut.GetMonthlyAsync(1, "2026-03");

        Assert.Equal("2026-03", result.Month);
        Assert.Equal(new AttendanceSummaryDto(2, 1, 1, 1, 1, 6), result.Summary);
    }

    [Fact]
    public async Task Monthly_UsesTheLastDayOfShortMonths()
    {
        _employees.GetByIdAsync(1).Returns(TestData.Employee());
        _attendance.GetForEmployeeAsync(Arg.Any<int>(), Arg.Any<DateOnly>(), Arg.Any<DateOnly>()).Returns([]);

        await _sut.GetMonthlyAsync(1, "2028-02"); // leap year

        await _attendance.Received(1).GetForEmployeeAsync(1, new DateOnly(2028, 2, 1), new DateOnly(2028, 2, 29));
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("2026-13")]
    [InlineData("2026/03")]
    public async Task Monthly_WithMalformedMonth_ThrowsBadRequest(string month)
    {
        _employees.GetByIdAsync(1).Returns(TestData.Employee());

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.GetMonthlyAsync(1, month));
    }

    [Fact]
    public async Task Monthly_ForMissingEmployee_ThrowsNotFound()
    {
        _employees.GetByIdAsync(9).Returns((Employee?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.GetMonthlyAsync(9, "2026-03"));
    }
}
