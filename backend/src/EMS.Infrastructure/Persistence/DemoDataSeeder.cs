using EMS.Application.Auth.Interfaces;
using EMS.Domain.Entities;
using EMS.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EMS.Infrastructure.Persistence;

/// <summary>
/// Fills an EMPTY database with realistic, deterministic dummy data (departments, employees, attendance and
/// performance reviews) for demos and automated tests. Dates are relative to "today" so charts are never empty.
/// It never touches a database that already has employees, and it is never run in Production.
/// </summary>
public static class DemoDataSeeder
{
    public const string DemoUserEmail = "hr.demo@ems.test";
    public const string DemoUserPassword = "Demo@12345";

    private static readonly string[] Departments = ["Engineering", "Human Resources", "Sales", "Finance", "Operations"];
    private static readonly int[] BaseSalary = [90000, 60000, 65000, 75000, 50000];

    private static readonly string[][] Designations =
    [
        ["Senior Engineer", "Software Engineer", "QA Engineer"],
        ["HR Manager", "Recruiter", "HR Executive"],
        ["Sales Manager", "Account Executive", "Sales Associate"],
        ["Finance Manager", "Accountant", "Payroll Analyst"],
        ["Operations Manager", "Logistics Coordinator", "Office Administrator"]
    ];

    private static readonly string[] FirstNames =
        ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Neha", "Arjun", "Kavya", "Siddharth", "Meera", "Rahul", "Isha", "Karan", "Divya", "Nikhil"];

    private static readonly string[] LastNames =
        ["Sharma", "Patil", "Mehta", "Iyer", "Verma", "Nair", "Desai", "Reddy", "Joshi", "Kulkarni"];

    private const int EmployeeCount = 30;
    private const int AttendanceDays = 60;

    public static async Task SeedAsync(AppDbContext context, IPasswordHasher hasher, ILogger logger, CancellationToken ct = default)
    {
        if (await context.Employees.AnyAsync(ct) || await context.Departments.AnyAsync(ct))
        {
            logger.LogInformation("Demo data skipped: the database already contains departments or employees.");
            return;
        }

        var random = new Random(42); // fixed seed => the same data every time
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (!await context.Users.AnyAsync(u => u.Email == DemoUserEmail, ct))
        {
            context.Users.Add(new User
            {
                FullName = "Demo HR",
                Email = DemoUserEmail,
                PasswordHash = hasher.Hash(DemoUserPassword),
                Role = UserRole.HR
            });
        }

        var departments = Departments.Select((name, i) => new Department
        {
            Name = name,
            Description = $"{name} team (demo data)"
        }).ToList();
        context.Departments.AddRange(departments);
        await context.SaveChangesAsync(ct);

        var employees = new List<Employee>();
        for (var i = 0; i < EmployeeCount; i++)
        {
            var deptIndex = i % Departments.Length;
            var first = FirstNames[i % FirstNames.Length];
            var last = LastNames[i % LastNames.Length];

            employees.Add(new Employee
            {
                EmployeeCode = $"EMP-{1001 + i}",
                FirstName = first,
                LastName = last,
                Email = $"{first}.{last}@acme-demo.test".ToLowerInvariant(),
                Phone = $"+91 98200 {10000 + i}",
                DateOfBirth = new DateOnly(1980 + i % 20, 1 + i % 12, 1 + i % 27),
                Gender = i % 2 == 0 ? Gender.Male : Gender.Female,
                DepartmentId = departments[deptIndex].Id,
                Designation = Designations[deptIndex][i / Departments.Length % 3],
                JoiningDate = today.AddDays(-(i * 25 + 5)), // spread over roughly 24 months
                Salary = BaseSalary[deptIndex] + i % 6 * 5000,
                // Two leavers, so Inactive filters and reports have something to show.
                Status = i % 15 == 14 ? EmployeeStatus.Inactive : EmployeeStatus.Active
            });
        }
        context.Employees.AddRange(employees);
        await context.SaveChangesAsync(ct);

        // Attendance: the last 60 days (never before the employee joined), weighted towards Present.
        var statuses = new[] { AttendanceStatus.Present, AttendanceStatus.Late, AttendanceStatus.Absent, AttendanceStatus.HalfDay, AttendanceStatus.Leave };
        var weights = new[] { 72, 12, 7, 5, 4 };

        var attendance = new List<Attendance>();
        foreach (var employee in employees.Where(e => e.Status == EmployeeStatus.Active))
        {
            for (var back = 1; back <= AttendanceDays; back++)
            {
                var date = today.AddDays(-back);
                if (date < employee.JoiningDate) continue;

                // Mondays are a little worse, so the weekday chart shows a visible pattern.
                var status = date.DayOfWeek == DayOfWeek.Monday && random.Next(100) < 25
                    ? AttendanceStatus.Absent
                    : Pick(statuses, weights, random);

                attendance.Add(new Attendance { EmployeeId = employee.Id, Date = date, Status = status });
            }
        }
        context.Attendances.AddRange(attendance);

        // Reviews: the current quarter and the three before it, for employees who had joined by then.
        var reviews = new List<PerformanceReview>();
        var (year, quarter) = (today.Year, (today.Month - 1) / 3 + 1);
        for (var k = 0; k < 4; k++)
        {
            var quarterStart = new DateOnly(year, (quarter - 1) * 3 + 1, 1);
            foreach (var employee in employees.Where(e => e.Status == EmployeeStatus.Active && e.JoiningDate <= quarterStart.AddMonths(3)))
            {
                reviews.Add(new PerformanceReview
                {
                    EmployeeId = employee.Id,
                    Year = year,
                    Quarter = quarter,
                    QualityScore = random.Next(2, 6),
                    ProductivityScore = random.Next(1, 6),
                    TeamworkScore = random.Next(2, 6),
                    Comments = "Demo review"
                });
            }

            if (--quarter == 0) (year, quarter) = (year - 1, 4);
        }
        context.PerformanceReviews.AddRange(reviews);

        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Seeded demo data: {Departments} departments, {Employees} employees, {Attendance} attendance records, {Reviews} reviews.",
            departments.Count, employees.Count, attendance.Count, reviews.Count);
    }

    private static AttendanceStatus Pick(AttendanceStatus[] statuses, int[] weights, Random random)
    {
        var roll = random.Next(weights.Sum());
        for (var i = 0; i < statuses.Length; i++)
        {
            if (roll < weights[i]) return statuses[i];
            roll -= weights[i];
        }
        return statuses[0];
    }
}
