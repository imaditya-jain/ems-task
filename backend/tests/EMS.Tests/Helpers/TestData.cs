using EMS.Domain.Entities;
using EMS.Domain.Enums;

namespace EMS.Tests.Helpers;

/// <summary>Small builders so each test only states the values it cares about.</summary>
public static class TestData
{
    public static Department Department(int id = 1, string name = "Engineering") =>
        new() { Id = id, Name = name };

    public static Employee Employee(
        int id = 1,
        string code = "EMP-001",
        string first = "Asha",
        string last = "Patil",
        int departmentId = 1,
        string departmentName = "Engineering",
        EmployeeStatus status = EmployeeStatus.Active,
        decimal salary = 50000,
        DateOnly? joined = null) => new()
    {
        Id = id,
        EmployeeCode = code,
        FirstName = first,
        LastName = last,
        Email = $"{code.ToLowerInvariant()}@corp.com",
        Phone = "9876543210",
        DateOfBirth = new DateOnly(1990, 1, 1),
        Gender = Gender.Female,
        Designation = "Engineer",
        JoiningDate = joined ?? new DateOnly(2021, 1, 1),
        Salary = salary,
        Status = status,
        DepartmentId = departmentId,
        Department = Department(departmentId, departmentName)
    };

    public static User User(int id = 1, string email = "admin@corp.com", string passwordHash = "hash") =>
        new() { Id = id, Email = email, FullName = "Admin", PasswordHash = passwordHash, Role = UserRole.Admin };

    public static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);
}
