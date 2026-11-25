using EMS.Application.Common.Exceptions;
using EMS.Application.Departments.Interfaces;
using EMS.Application.Employees.Dtos;
using EMS.Application.Employees.Interfaces;
using EMS.Application.Employees.Services;
using EMS.Domain.Entities;
using EMS.Domain.Enums;
using EMS.Tests.Helpers;
using NSubstitute;

namespace EMS.Tests.Employees;

/// <summary>CSV import: every row is checked first; nothing is saved unless the entire file is valid.</summary>
public class EmployeeBulkCreateTests
{
    private readonly IEmployeeRepository _employees = Substitute.For<IEmployeeRepository>();
    private readonly IDepartmentRepository _departments = Substitute.For<IDepartmentRepository>();
    private readonly EmployeeService _sut;

    public EmployeeBulkCreateTests()
    {
        _departments.GetAllAsync(null).Returns([TestData.Department(1, "Engineering"), TestData.Department(2, "HR")]);
        _employees.GetExistingCodesAsync(Arg.Any<IEnumerable<string>>()).Returns(new HashSet<string>());
        _employees.GetExistingEmailsAsync(Arg.Any<IEnumerable<string>>()).Returns(new HashSet<string>());
        _sut = new EmployeeService(_employees, _departments);
    }

    private static BulkEmployeeRow Row(string code, string email, string department = "Engineering", int age = 30) => new()
    {
        EmployeeCode = code,
        FirstName = "Test",
        LastName = "User",
        Email = email,
        Phone = "9876543210",
        DateOfBirth = TestData.Today.AddYears(-age),
        Gender = Gender.Male,
        DepartmentName = department,
        Designation = "Dev",
        JoiningDate = TestData.Today.AddYears(-1),
        Salary = 1000
    };

    private static BulkCreateEmployeesRequest Request(params BulkEmployeeRow[] rows) => new() { Employees = [.. rows] };

    [Fact]
    public async Task ValidFile_CreatesEveryRow_InASingleSave()
    {
        IEnumerable<Employee>? added = null;
        await _employees.AddRangeAsync(Arg.Do<IEnumerable<Employee>>(e => added = e.ToList()));

        var count = await _sut.BulkCreateAsync(Request(Row("EMP-1", "a@x.com"), Row("EMP-2", "b@x.com", "HR")));

        Assert.Equal(2, count);
        Assert.Equal([1, 2], added!.Select(e => e.DepartmentId).ToArray());
        await _employees.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task DepartmentNames_AreMatchedCaseInsensitively()
    {
        var count = await _sut.BulkCreateAsync(Request(Row("EMP-1", "a@x.com", "  engineering ")));

        Assert.Equal(1, count);
    }

    [Fact]
    public async Task UnknownDepartment_ReportsTheRowNumber_AndSavesNothing()
    {
        var ex = await Assert.ThrowsAsync<UnprocessableException>(() =>
            _sut.BulkCreateAsync(Request(Row("EMP-1", "a@x.com"), Row("EMP-2", "b@x.com", "Nowhere"))));

        Assert.Contains(ex.Errors, e => e.StartsWith("Row 2:") && e.Contains("Nowhere"));
        await _employees.DidNotReceive().AddRangeAsync(Arg.Any<IEnumerable<Employee>>());
        await _employees.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task DuplicateCodeInsideTheFile_IsRejected()
    {
        var ex = await Assert.ThrowsAsync<UnprocessableException>(() =>
            _sut.BulkCreateAsync(Request(Row("EMP-1", "a@x.com"), Row("emp-1", "b@x.com"))));

        Assert.Contains(ex.Errors, e => e.StartsWith("Row 2:") && e.Contains("already in use"));
    }

    [Fact]
    public async Task DuplicateEmailInsideTheFile_IsRejected()
    {
        var ex = await Assert.ThrowsAsync<UnprocessableException>(() =>
            _sut.BulkCreateAsync(Request(Row("EMP-1", "a@x.com"), Row("EMP-2", "A@X.com"))));

        Assert.Contains(ex.Errors, e => e.StartsWith("Row 2:") && e.Contains("a@x.com"));
    }

    [Fact]
    public async Task CodeAndEmailAlreadyInTheDatabase_AreRejected()
    {
        _employees.GetExistingCodesAsync(Arg.Any<IEnumerable<string>>()).Returns(new HashSet<string>(["EMP-1"]));
        _employees.GetExistingEmailsAsync(Arg.Any<IEnumerable<string>>()).Returns(new HashSet<string>(["a@x.com"]));

        var ex = await Assert.ThrowsAsync<UnprocessableException>(() => _sut.BulkCreateAsync(Request(Row("EMP-1", "a@x.com"))));

        Assert.Equal(2, ex.Errors.Count);
    }

    [Fact]
    public async Task UnderageRow_IsRejected()
    {
        var ex = await Assert.ThrowsAsync<UnprocessableException>(() =>
            _sut.BulkCreateAsync(Request(Row("EMP-1", "a@x.com", age: 16))));

        Assert.Contains(ex.Errors, e => e.Contains("18"));
    }

    [Fact]
    public async Task AllProblemsAcrossAllRows_AreReportedTogether()
    {
        var ex = await Assert.ThrowsAsync<UnprocessableException>(() =>
            _sut.BulkCreateAsync(Request(
                Row("EMP-1", "a@x.com", "Nope"),
                Row("EMP-2", "b@x.com", age: 15),
                Row("EMP-3", "c@x.com"))));

        Assert.Contains(ex.Errors, e => e.StartsWith("Row 1:"));
        Assert.Contains(ex.Errors, e => e.StartsWith("Row 2:"));
        Assert.DoesNotContain(ex.Errors, e => e.StartsWith("Row 3:"));
    }
}
