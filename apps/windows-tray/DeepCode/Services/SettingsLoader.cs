using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace DeepCode.Services;

public sealed record DeepcodeSettings(string Model, string BaseURL, bool HasApiKey, string? LastProjectRoot)
{
    public static DeepcodeSettings Default => new("deepseek-v4-pro", "https://api.deepseek.com", false, null);
}

/// <summary>
/// Read-only-ish accessor for ~/.deepcode/settings.json.
/// Mirrors apps/macos-menubar/DeepCode/Services/SettingsLoader.swift.
/// Shares state with the deepcode CLI and the VSCode extension.
/// </summary>
public static class SettingsLoader
{
    private static readonly JsonSerializerOptions ReadOptions = new()
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public static string SettingsPath => Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
        ".deepcode",
        "settings.json");

    public static DeepcodeSettings Load()
    {
        try
        {
            if (!File.Exists(SettingsPath)) return DeepcodeSettings.Default;
            var text = File.ReadAllText(SettingsPath);
            var root = JsonNode.Parse(text, documentOptions: new JsonDocumentOptions
            {
                CommentHandling = JsonCommentHandling.Skip,
                AllowTrailingCommas = true,
            }) as JsonObject;
            if (root is null) return DeepcodeSettings.Default;

            var env = root["env"] as JsonObject;
            var model = (env?["MODEL"]?.GetValue<string?>() ?? "").Trim();
            if (string.IsNullOrEmpty(model)) model = "deepseek-v4-pro";
            var baseUrl = (env?["BASE_URL"]?.GetValue<string?>() ?? "").Trim();
            if (string.IsNullOrEmpty(baseUrl)) baseUrl = "https://api.deepseek.com";
            var apiKey = env?["API_KEY"]?.GetValue<string?>() ?? "";
            var lastRoot = (root["lastProjectRoot"]?.GetValue<string?>() ?? "").Trim();

            return new DeepcodeSettings(
                Model: model,
                BaseURL: baseUrl,
                HasApiKey: !string.IsNullOrEmpty(apiKey),
                LastProjectRoot: string.IsNullOrEmpty(lastRoot) ? null : lastRoot);
        }
        catch
        {
            return DeepcodeSettings.Default;
        }
    }

    public static string DefaultProjectRoot()
    {
        var settings = Load();
        if (!string.IsNullOrEmpty(settings.LastProjectRoot) && Directory.Exists(settings.LastProjectRoot))
        {
            return settings.LastProjectRoot;
        }
        return Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
    }

    public static void SaveLastProjectRoot(string path)
    {
        try
        {
            var dir = Path.GetDirectoryName(SettingsPath);
            if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

            JsonObject root = new();
            if (File.Exists(SettingsPath))
            {
                try
                {
                    var existing = JsonNode.Parse(File.ReadAllText(SettingsPath), documentOptions: new JsonDocumentOptions
                    {
                        CommentHandling = JsonCommentHandling.Skip,
                        AllowTrailingCommas = true,
                    }) as JsonObject;
                    if (existing is not null) root = existing;
                }
                catch { /* fall through with empty object */ }
            }
            root["lastProjectRoot"] = path;
            File.WriteAllText(SettingsPath, root.ToJsonString(new JsonSerializerOptions { WriteIndented = true }));
        }
        catch { /* best effort */ }
    }
}
