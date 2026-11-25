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

public class EmployeeServiceTests
{
    private readonly IEmployeeRepository _employees = Substitute.For<IEmployeeRepository>();
    private readonly IDepartmentRepository _departments = Substitute.For<IDepartmentRepository>();
    private readonly EmployeeService _sut;

    public EmployeeServiceTests()
    {
        _departments.GetByIdAsync(1).Returns(TestData.Department());
        _sut = new EmployeeService(_employees, _departments);
    }

    private static EmployeeRequest ValidRequest() => new()
    {
        EmployeeCode = "EMP-100",
        FirstName = "  Asha ",
        LastName = "Patil",
        Email = "  Asha@Corp.COM ",
        Phone = "+91 98765 43210",
        DateOfBirth = new DateOnly(1995, 4, 12),
        Gender = Gender.Female,
        DepartmentId = 1,
        Designation = "Engineer",
        JoiningDate = new DateOnly(2022, 6, 1),
        Salary = 85000.50m
    };

    // ---- create --------------------------------------------------------------------------------

    [Fact]
    public async Task Create_TrimsAndNormalisesInput_AndSavesOnce()
    {
        Employee? saved = null;
        await _employees.AddAsync(Arg.Do<Employee>(e => saved = e));

        var dto = await _sut.CreateAsync(ValidRequest());

        Assert.NotNull(saved);
        Assert.Equal("Asha", saved!.FirstName);
        Assert.Equal("asha@corp.com", saved.Email);
        Assert.Equal("Engineering", dto.DepartmentName);
        Assert.Equal("Asha Patil", dto.FullName);
        await _employees.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task Create_WithUnknownDepartment_ThrowsBadRequest()
    {
        _departments.GetByIdAsync(99).Returns((Department?)null);
        var request = ValidRequest();
        request.DepartmentId = 99;

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.CreateAsync(request));
        await _employees.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task Create_WhenEmployeeIsUnder18_ThrowsBadRequest()
    {
        var request = ValidRequest();
        request.DateOfBirth = TestData.Today.AddYears(-17);

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.CreateAsync(request));

        Assert.Contains("18", ex.Message);
    }

    [Fact]
    public async Task Create_WhenEmployeeIsExactly18Today_IsAllowed()
    {
        var request = ValidRequest();
        request.DateOfBirth = TestData.Today.AddYears(-18);
        request.JoiningDate = TestData.Today;

        await _sut.CreateAsync(request);

        await _employees.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task Create_WhenJoiningDateIsBeforeEmployeeTurned18_ThrowsBadRequest()
    {
        var request = ValidRequest();
        request.DateOfBirth = new DateOnly(2000, 1, 1);
        request.JoiningDate = new DateOnly(2017, 12, 31); // 17 years old

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.CreateAsync(request));
    }

    [Fact]
    public async Task Create_WithDuplicateEmployeeCode_ThrowsConflict()
    {
        _employees.EmployeeCodeExistsAsync("EMP-100", null).Returns(true);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAsync(ValidRequest()));
        await _employees.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task Create_WithDuplicateEmail_ThrowsConflict_UsingTheNormalisedEmail()
    {
        _employees.EmailExistsAsync("asha@corp.com", null).Returns(true);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAsync(ValidRequest()));
    }

    // ---- update / delete ----------------------------------------------------------------------

    [Fact]
    public async Task Update_ChecksUniquenessExcludingTheEmployeeItself()
    {
        _employees.GetByIdAsync(5).Returns(TestData.Employee(id: 5));

        await _sut.UpdateAsync(5, ValidRequest());

        await _employees.Received(1).EmployeeCodeExistsAsync("EMP-100", 5);
        await _employees.Received(1).EmailExistsAsync("asha@corp.com", 5);
    }

    [Fact]
    public async Task Update_AppliesChangesAndPersists()
    {
        var existing = TestData.Employee(id: 5);
        _employees.GetByIdAsync(5).Returns(existing);
        var request = ValidRequest();
        request.Designation = "Staff Engineer";
        request.Salary = 120000;

        var dto = await _sut.UpdateAsync(5, request);

        Assert.Equal("Staff Engineer", existing.Designation);
        Assert.Equal(120000, dto.Salary);
        await _employees.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task Update_OfMissingEmployee_ThrowsNotFound()
    {
        _employees.GetByIdAsync(404).Returns((Employee?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.UpdateAsync(404, ValidRequest()));
    }

    [Fact]
    public async Task Delete_RemovesTheEmployee()
    {
        var employee = TestData.Employee(id: 3);
        _employees.GetByIdAsync(3).Returns(employee);

        await _sut.DeleteAsync(3);

        _employees.Received(1).Remove(employee);
        await _employees.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task Delete_OfMissingEmployee_ThrowsNotFound()
    {
        _employees.GetByIdAsync(3).Returns((Employee?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.DeleteAsync(3));
    }

    // ---- bulk delete --------------------------------------------------------------------------

    [Fact]
    public async Task BulkDelete_RemovesAllSelected_AndIgnoresDuplicateIds()
    {
        var found = new List<Employee> { TestData.Employee(id: 1), TestData.Employee(id: 2, code: "EMP-002") };
        _employees.GetByIdsAsync(Arg.Is<IEnumerable<int>>(ids => ids.SequenceEqual(new[] { 1, 2 }))).Returns(found);

        var count = await _sut.BulkDeleteAsync(new BulkDeleteRequest { Ids = [1, 2, 2, 1] });

        Assert.Equal(2, count);
        _employees.Received(1).RemoveRange(found);
    }

    [Fact]
    public async Task BulkDelete_WhenAnyIdIsMissing_DeletesNothing()
    {
        _employees.GetByIdsAsync(Arg.Any<IEnumerable<int>>()).Returns([TestData.Employee(id: 1)]);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.BulkDeleteAsync(new BulkDeleteRequest { Ids = [1, 2] }));

        _employees.DidNotReceive().RemoveRange(Arg.Any<IEnumerable<Employee>>());
        await _employees.DidNotReceive().SaveChangesAsync();
    }

    // ---- paging -------------------------------------------------------------------------------

    [Theory]
    [InlineData(0, 10, 1, 10)]
    [InlineData(-5, 1000, 1, 100)]
    [InlineData(3, 0, 3, 1)]
    public async Task GetPaged_ClampsPageAndPageSize(int page, int pageSize, int expectedPage, int expectedSize)
    {
        _employees.GetPagedAsync(Arg.Any<EmployeeQuery>()).Returns(([], 0));

        var result = await _sut.GetPagedAsync(new EmployeeQuery { Page = page, PageSize = pageSize });

        Assert.Equal(expectedPage, result.Page);
        Assert.Equal(expectedSize, result.PageSize);
    }

    [Fact]
    public async Task GetPaged_ComputesTotalPages()
    {
        _employees.GetPagedAsync(Arg.Any<EmployeeQuery>()).Returns(([TestData.Employee()], 25));

        var result = await _sut.GetPagedAsync(new EmployeeQuery { PageSize = 10 });

        Assert.Equal(3, result.TotalPages);
        Assert.Equal(25, result.TotalCount);
    }
}
