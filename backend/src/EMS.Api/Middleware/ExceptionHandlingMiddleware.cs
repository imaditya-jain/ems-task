using System.Text.Json;
using EMS.Application.Common.Exceptions;
using EMS.Application.Common.Models;

namespace EMS.Api.Middleware;

/// <summary>
/// Converts exceptions into the { success: false, error } envelope. Expected errors (AppException)
/// keep their status code and message; anything else is logged and returned as a generic 500.
/// </summary>
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (AppException ex)
        {
            var errors = (ex as UnprocessableException)?.Errors;
            await WriteErrorAsync(context, ex.StatusCode, ex.Message, errors);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteErrorAsync(context, StatusCodes.Status500InternalServerError, "Something went wrong.");
        }
    }

    private static Task WriteErrorAsync(HttpContext context, int statusCode, string message, IReadOnlyList<string>? errors = null)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        return context.Response.WriteAsync(JsonSerializer.Serialize(
            ApiResponse.Fail(message, errors),
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
    }
}
