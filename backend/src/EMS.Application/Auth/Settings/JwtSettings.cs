namespace EMS.Application.Auth.Settings;

public class JwtSettings
{
    public const string SectionName = "Jwt";

    public string AccessTokenSecret { get; set; } = string.Empty;
    public string RefreshTokenSecret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "ems-api";
    public string Audience { get; set; } = "ems-web";
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 7;
}
