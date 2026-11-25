using EMS.Application.Common.Exceptions;
using EMS.Application.Departments.Dtos;
using EMS.Application.Departments.Interfaces;
using EMS.Application.Departments.Services;
using EMS.Application.Employees.Interfaces;
using EMS.Domain.Entities;
using EMS.Tests.Helpers;
using NSubstitute;

namespace EMS.Tests.Departments;

public class DepartmentServiceTests
{
    private readonly IDepartmentRepository _departments = Substitute.For<IDepartmentRepository>();
    private readonly IEmployeeRepository _employees = Substitute.For<IEmployeeRepository>();
    private readonly DepartmentService _sut;

    public DepartmentServiceTests() => _sut = new DepartmentService(_departments, _employees);

    [Fact]
    public async Task Create_TrimsNameAndNormalisesBlankDescriptionToNull()
    {
        Department? saved = null;
        await _departments.AddAsync(Arg.Do<Department>(d => saved = d));

        var dto = await _sut.CreateAsync(new DepartmentRequest { Name = "  Finance  ", Description = "   " });

        Assert.Equal("Finance", saved!.Name);
        Assert.Null(saved.Description);
        Assert.Equal("Finance", dto.Name);
        await _departments.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task Create_WithExistingName_ThrowsConflict()
    {
        _departments.NameExistsAsync("HR", null).Returns(true);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.CreateAsync(new DepartmentRequest { Name = "HR" }));

        Assert.Contains("HR", ex.Message);
        await _departments.DidNotReceive().SaveChangesAsync();
    }

    [Fact]
    public async Task Update_AllowsKeepingItsOwnName()
    {
        _departments.GetByIdAsync(2).Returns(TestData.Department(2, "HR"));

        await _sut.UpdateAsync(2, new DepartmentRequest { Name = "HR", Description = "People" });

        await _departments.Received(1).NameExistsAsync("HR", 2); // the department itself is excluded
        await _departments.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task Update_ToAnotherDepartmentsName_ThrowsConflict()
    {
        _departments.GetByIdAsync(2).Returns(TestData.Department(2, "HR"));
        _departments.NameExistsAsync("Sales", 2).Returns(true);

        await Assert.ThrowsAsync<ConflictException>(() => _sut.UpdateAsync(2, new DepartmentRequest { Name = "Sales" }));
    }

    [Fact]
    public async Task Update_OfMissingDepartment_ThrowsNotFound()
    {
        _departments.GetByIdAsync(9).Returns((Department?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.UpdateAsync(9, new DepartmentRequest { Name = "X1" }));
    }

    [Fact]
    public async Task Delete_WhenDepartmentStillHasEmployees_ThrowsConflict_AndDoesNotRemove()
    {
        var department = TestData.Department(3, "Ops");
        _departments.GetByIdAsync(3).Returns(department);
        _employees.AnyInDepartmentAsync(3).Returns(true);

        var ex = await Assert.ThrowsAsync<ConflictException>(() => _sut.DeleteAsync(3));

        Assert.Contains("employees", ex.Message);
        _departments.DidNotReceive().Remove(Arg.Any<Department>());
    }

    [Fact]
    public async Task Delete_OfEmptyDepartment_RemovesIt()
    {
        var department = TestData.Department(3, "Ops");
        _departments.GetByIdAsync(3).Returns(department);
        _employees.AnyInDepartmentAsync(3).Returns(false);

        await _sut.DeleteAsync(3);

        _departments.Received(1).Remove(department);
        await _departments.Received(1).SaveChangesAsync();
    }

    [Fact]
    public async Task GetAll_PassesTrimmedSearchToTheRepository()
    {
        _departments.GetAllAsync("eng").Returns([TestData.Department()]);

        var result = await _sut.GetAllAsync("  eng ");

        Assert.Single(result);
    }
}
