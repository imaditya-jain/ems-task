using EMS.Domain.Common;
using EMS.Domain.Enums;

namespace EMS.Domain.Entities;

/// <summary>An HR staff account that can sign in to the system (not an employee record).</summary>
public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.HR;

    /// <summary>SHA-256 hash of the current refresh token. The raw token is never stored.</summary>
    public string? RefreshTokenHash { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }
}
