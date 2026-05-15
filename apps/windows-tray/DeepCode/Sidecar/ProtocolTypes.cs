using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace DeepCode.Sidecar;

// --- Shared --------------------------------------------------------------

public sealed record SkillInfo(string Name, string Path, string Description, bool? IsLoaded);

public sealed record SlashCommandItem(
    string Kind,        // "skill" | "skills" | "new" | "resume" | "exit"
    string Name,
    string Label,
    string Description,
    SkillInfo? Skill);

public sealed record ServerSessionEntry(
    string Id,
    string? Summary,
    string? AssistantReply,
    string? AssistantThinking,
    string? AssistantRefusal,
    string Status,
    string? FailReason,
    int? ActiveTokens,
    string CreateTime,
    string UpdateTime);

public sealed record ServerFunctionRef(string? Name, string? Arguments);

public sealed record ServerMessageMeta(
    bool? AsThinking,
    bool? IsSummary,
    string? ParamsMd,
    string? ResultMd,
    ServerFunctionRef? Function);

public sealed record ServerMessageParams(
    [property: JsonPropertyName("reasoning_content")] string? ReasoningContent);

public sealed record ServerMessage(
    string Id,
    string SessionId,
    string Role,
    string? Content,
    bool? Visible,
    string? CreateTime,
    ServerMessageMeta? Meta,
    ServerMessageParams? MessageParams);

// --- Outbound (CLI → App) ------------------------------------------------

public abstract record ServerEvent;
public sealed record ReadyEvent(string Version, string? MachineId, string ProjectRoot) : ServerEvent;
public sealed record SessionEvent(ServerSessionEntry Entry) : ServerEvent;
public sealed record StreamEvent(string Phase, int EstimatedTokens, string FormattedTokens, string? SessionId) : ServerEvent;
public sealed record MessageEvent(ServerMessage Message) : ServerEvent;
public sealed record SessionsListEvent(string Id, IReadOnlyList<ServerSessionEntry> Sessions) : ServerEvent;
public sealed record SessionLoadedEvent(string Id, string SessionId, IReadOnlyList<ServerMessage> Messages) : ServerEvent;
public sealed record ErrorEvent(string? Id, string Message) : ServerEvent;
public sealed record DoneEvent(string Id, string Status) : ServerEvent;
public sealed record AckEvent(string Id) : ServerEvent;
public sealed record ProjectRootChangedEvent(string Id, string Path, IReadOnlyList<SkillInfo> Skills) : ServerEvent;
public sealed record SlashCommandsEvent(string Id, IReadOnlyList<SlashCommandItem> Commands) : ServerEvent;
public sealed record ClipboardImageEvent(string Id, string? DataUrl, string? Error) : ServerEvent;
public sealed record UnknownEvent(string RawType) : ServerEvent;

// --- Inbound (App → CLI) -------------------------------------------------

public abstract record ClientCommand
{
    public abstract JsonObject ToJson();
}

public sealed record SubmitCommand(string Id, string Text, IReadOnlyList<string>? ImageUrls = null, IReadOnlyList<SkillInfo>? Skills = null) : ClientCommand
{
    public override JsonObject ToJson()
    {
        var obj = new JsonObject
        {
            ["type"] = "submit",
            ["id"] = Id,
            ["text"] = Text,
        };
        if (ImageUrls is { Count: > 0 })
        {
            obj["imageUrls"] = JsonNode.Parse(JsonSerializer.Serialize(ImageUrls))!;
        }
        if (Skills is { Count: > 0 })
        {
            obj["skills"] = JsonNode.Parse(JsonSerializer.Serialize(Skills, ProtocolJson.Options))!;
        }
        return obj;
    }
}

public sealed record InterruptCommand(string? Id) : ClientCommand
{
    public override JsonObject ToJson()
    {
        var obj = new JsonObject { ["type"] = "interrupt" };
        if (Id is not null) obj["id"] = Id;
        return obj;
    }
}

public sealed record ListSessionsCommand(string Id) : ClientCommand
{
    public override JsonObject ToJson() => new() { ["type"] = "list_sessions", ["id"] = Id };
}

public sealed record LoadSessionCommand(string Id, string SessionId) : ClientCommand
{
    public override JsonObject ToJson() => new()
    {
        ["type"] = "load_session",
        ["id"] = Id,
        ["sessionId"] = SessionId,
    };
}

public sealed record NewSessionCommand(string Id) : ClientCommand
{
    public override JsonObject ToJson() => new() { ["type"] = "new_session", ["id"] = Id };
}

public sealed record ChangeProjectRootCommand(string Id, string Path) : ClientCommand
{
    public override JsonObject ToJson() => new()
    {
        ["type"] = "change_project_root",
        ["id"] = Id,
        ["path"] = Path,
    };
}

public sealed record ListSlashCommandsCommand(string Id) : ClientCommand
{
    public override JsonObject ToJson() => new() { ["type"] = "list_slash_commands", ["id"] = Id };
}

public sealed record ReadClipboardImageCommand(string Id) : ClientCommand
{
    public override JsonObject ToJson() => new() { ["type"] = "read_clipboard_image", ["id"] = Id };
}

// --- Shared JSON options + manual ServerEvent dispatch -------------------

internal static class ProtocolJson
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public static ServerEvent DecodeEvent(string line)
    {
        JsonNode? root;
        try { root = JsonNode.Parse(line); }
        catch (Exception ex) { return new ErrorEvent(null, $"Decode failed: {ex.Message}. Line: {line}"); }
        if (root is not JsonObject obj) return new ErrorEvent(null, $"Expected object, got: {line}");

        var type = obj["type"]?.GetValue<string>() ?? "";
        try
        {
            return type switch
            {
                "ready" => new ReadyEvent(
                    obj["version"]!.GetValue<string>(),
                    obj["machineId"]?.GetValue<string>(),
                    obj["projectRoot"]!.GetValue<string>()),
                "session" => new SessionEvent(obj["entry"].Deserialize<ServerSessionEntry>(Options)!),
                "stream" => new StreamEvent(
                    obj["phase"]!.GetValue<string>(),
                    obj["estimatedTokens"]?.GetValue<int>() ?? 0,
                    obj["formattedTokens"]?.GetValue<string>() ?? "0",
                    obj["sessionId"]?.GetValue<string>()),
                "message" => new MessageEvent(obj["message"].Deserialize<ServerMessage>(Options)!),
                "sessions_list" => new SessionsListEvent(
                    obj["id"]!.GetValue<string>(),
                    obj["sessions"].Deserialize<List<ServerSessionEntry>>(Options) ?? new()),
                "session_loaded" => new SessionLoadedEvent(
                    obj["id"]!.GetValue<string>(),
                    obj["sessionId"]!.GetValue<string>(),
                    obj["messages"].Deserialize<List<ServerMessage>>(Options) ?? new()),
                "error" => new ErrorEvent(
                    obj["id"]?.GetValue<string>(),
                    obj["error"]?.GetValue<string>() ?? "unknown error"),
                "done" => new DoneEvent(
                    obj["id"]!.GetValue<string>(),
                    obj["status"]!.GetValue<string>()),
                "ack" => new AckEvent(obj["id"]!.GetValue<string>()),
                "project_root_changed" => new ProjectRootChangedEvent(
                    obj["id"]!.GetValue<string>(),
                    obj["path"]!.GetValue<string>(),
                    obj["skills"].Deserialize<List<SkillInfo>>(Options) ?? new()),
                "slash_commands" => new SlashCommandsEvent(
                    obj["id"]!.GetValue<string>(),
                    obj["commands"].Deserialize<List<SlashCommandItem>>(Options) ?? new()),
                "clipboard_image" => new ClipboardImageEvent(
                    obj["id"]!.GetValue<string>(),
                    obj["dataUrl"]?.GetValue<string>(),
                    obj["error"]?.GetValue<string>()),
                _ => new UnknownEvent(type),
            };
        }
        catch (Exception ex)
        {
            return new ErrorEvent(null, $"Decode '{type}' failed: {ex.Message}");
        }
    }
}

internal static class JsonNodeExtensions
{
    public static T? Deserialize<T>(this JsonNode? node, JsonSerializerOptions options)
        => node is null ? default : JsonSerializer.Deserialize<T>(node.ToJsonString(), options);
}
