using System.ComponentModel.DataAnnotations;

namespace EMS.Application.Auth.Dtos;

public class LoginRequest
{
    [Required(ErrorMessage = "Email is required.")]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    public string Password { get; set; } = string.Empty;
}

public record UserDto(int Id, string FullName, string Email, string Role);

public record TokenPair(string AccessToken, string RefreshToken);

public record AuthResult(UserDto User, TokenPair Tokens);
