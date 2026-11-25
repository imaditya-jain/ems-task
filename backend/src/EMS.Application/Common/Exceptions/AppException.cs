namespace EMS.Application.Common.Exceptions;

/// <summary>Base type for expected, client-facing errors. Mapped to an HTTP status by the API middleware.</summary>
public abstract class AppException(string message, int statusCode) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public class BadRequestException(string message) : AppException(message, 400);
public class UnauthorizedException(string message = "Unauthorized.") : AppException(message, 401);
public class NotFoundException(string message) : AppException(message, 404);
public class ConflictException(string message) : AppException(message, 409);
