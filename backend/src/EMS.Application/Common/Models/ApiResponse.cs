using System.Text.Json.Serialization;

namespace EMS.Application.Common.Models;

/// <summary>Consistent response envelope: { success, message, data } or { success, error }.</summary>
public class ApiResponse<T>
{
    public bool Success { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Message { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Error { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public T? Data { get; init; }

    public static ApiResponse<T> Ok(T data, string? message = null) =>
        new() { Success = true, Data = data, Message = message };
}

public static class ApiResponse
{
    public static ApiResponse<object> Ok(string message) =>
        new() { Success = true, Message = message };

    public static ApiResponse<object> Fail(string error) =>
        new() { Success = false, Error = error };
}
