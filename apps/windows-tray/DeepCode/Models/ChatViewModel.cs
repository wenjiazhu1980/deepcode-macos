using System.Collections.ObjectModel;
using System.IO;
using System.Threading.Channels;
using System.Windows;
using System.Windows.Media.Imaging;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DeepCode.Services;
using DeepCode.Sidecar;
using Microsoft.Win32;

namespace DeepCode.Models;

public sealed partial class DisplayMessage : ObservableObject
{
    public required string Id { get; init; }
    public required string Role { get; init; }
    [ObservableProperty] private string _content = "";
    [ObservableProperty] private bool _isThinking;
    [ObservableProperty] private bool _isTool;
    [ObservableProperty] private string? _toolName;
    [ObservableProperty] private string? _toolParams;
    [ObservableProperty] private string? _toolResult;
}

public sealed record AttachedImage(string Id, string DataUrl, BitmapSource? Thumbnail);

/// <summary>
/// Port of apps/macos-menubar/DeepCode/Models/ChatViewModel.swift.
/// All mutations happen on the WPF dispatcher thread.
/// </summary>
public sealed partial class ChatViewModel : ObservableObject, IAsyncDisposable
{
    public ObservableCollection<DisplayMessage> Messages { get; } = new();
    public ObservableCollection<AttachedImage> AttachedImages { get; } = new();
    public ObservableCollection<SlashCommandItem> SlashCommands { get; } = new();
    public ObservableCollection<ServerSessionEntry> SessionList { get; } = new();

    [ObservableProperty] private bool _isStreaming;
    [ObservableProperty] private string _streamProgress = "";
    [ObservableProperty] private string _statusText = "starting…";
    [ObservableProperty] private string _inputText = "";
    [ObservableProperty] private string? _startupError;
    [ObservableProperty] private string? _settingsHint;
    [ObservableProperty] private string _modelLabel = "";
    [ObservableProperty] private string _projectRoot = "";
    [ObservableProperty] private bool _showCommandPanel;
    [ObservableProperty] private bool _showSessionList;

    private readonly SidecarProcess _sidecar = new();
    private string? _pendingSubmitId;
    private Task? _pumpTask;
    private bool _didStart;
    private bool _isUserTerminated;
    private string _savedVersion = "";

    public ChatViewModel()
    {
        _sidecar.OnStderrLine = line =>
            DispatchAsync(() => AppendSystem($"stderr: {line}"));
        _sidecar.OnProcessTerminated = status =>
            DispatchAsync(() =>
            {
                if (!_isUserTerminated)
                {
                    StartupError = $"Sidecar 进程异常退出 (status: {status})";
                }
                StatusText = "terminated";
                IsStreaming = false;
            });
    }

    private static void DispatchAsync(Action action)
    {
        var app = Application.Current;
        if (app is null) { action(); return; }
        if (app.Dispatcher.CheckAccess()) action();
        else app.Dispatcher.BeginInvoke(action);
    }

    // ----- Lifecycle ------------------------------------------------------

    public async Task StartAsync()
    {
        if (_didStart) return;
        _didStart = true;

        var settings = SettingsLoader.Load();
        ModelLabel = settings.Model;
        if (!settings.HasApiKey)
        {
            SettingsHint = "请先编辑 ~/.deepcode/settings.json 配置 env.API_KEY";
        }

        var root = SettingsLoader.DefaultProjectRoot();
        ProjectRoot = root;

        try
        {
            _sidecar.Launch(projectRoot: root);
            StatusText = "ready";
        }
        catch (Exception ex)
        {
            StartupError = ex.Message;
            StatusText = "sidecar failed";
            return;
        }

        _pumpTask = Task.Run(PumpEventsAsync);
        await Task.CompletedTask;
    }

    private async Task PumpEventsAsync()
    {
        try
        {
            await foreach (var evt in _sidecar.Bridge.Events.ReadAllAsync().ConfigureAwait(false))
            {
                await Application.Current.Dispatcher.InvokeAsync(() => Handle(evt));
            }
        }
        catch (ChannelClosedException) { /* normal */ }
        catch (Exception ex)
        {
            DispatchAsync(() => AppendSystem($"event pump error: {ex.Message}"));
        }
        DispatchAsync(() =>
        {
            if (IsStreaming)
            {
                IsStreaming = false;
                StatusText = "sidecar disconnected";
            }
        });
    }

    [RelayCommand]
    public void DismissError() => StartupError = null;

    [RelayCommand]
    public void DismissSettingsHint() => SettingsHint = null;

    [RelayCommand]
    public async Task RetryStart()
    {
        StartupError = null;
        _didStart = false;
        await StartAsync();
    }

    // ----- User actions ---------------------------------------------------

    [RelayCommand]
    public void Submit()
    {
        var text = InputText.Trim();
        var hasContent = !string.IsNullOrEmpty(text) || AttachedImages.Count > 0;
        if (!hasContent || SettingsHint is not null || !_sidecar.IsRunning) return;

        var id = Guid.NewGuid().ToString();
        _pendingSubmitId = id;

        var display = text;
        if (AttachedImages.Count > 0)
        {
            var note = AttachedImages.Count == 1 ? "📎 1 image" : $"📎 {AttachedImages.Count} images";
            display = string.IsNullOrEmpty(text) ? note : $"{text}\n{note}";
        }
        AppendUser(display);

        var imageUrls = AttachedImages.Count == 0
            ? null
            : AttachedImages.Select(x => x.DataUrl).ToList();

        InputText = "";
        AttachedImages.Clear();
        ShowCommandPanel = false;
        IsStreaming = true;
        StatusText = "processing";
        _sidecar.Send(new SubmitCommand(id, text, imageUrls));
    }

    [RelayCommand]
    public void Interrupt()
    {
        if (!_sidecar.IsRunning) return;
        _sidecar.Send(new InterruptCommand(Guid.NewGuid().ToString()));
    }

    [RelayCommand]
    public void SelectProjectRoot()
    {
        if (!_sidecar.IsRunning)
        {
            AppendSystem("Sidecar 进程未运行，无法切换项目");
            return;
        }
        var dialog = new OpenFolderDialog
        {
            Title = "选择项目目录",
            Multiselect = false,
        };
        if (dialog.ShowDialog() == true)
        {
            var path = dialog.FolderName;
            var id = Guid.NewGuid().ToString();
            _sidecar.Send(new ChangeProjectRootCommand(id, path));
        }
    }

    // ----- Slash commands -------------------------------------------------

    public void RefreshSlashCommands()
    {
        _sidecar.Send(new ListSlashCommandsCommand(Guid.NewGuid().ToString()));
    }

    public void ExecuteSlashCommand(SlashCommandItem command)
    {
        ShowCommandPanel = false;
        switch (command.Kind)
        {
            case "new":
                if (!_sidecar.IsRunning)
                {
                    AppendSystem("Sidecar 进程未运行，无法创建新会话");
                    return;
                }
                _sidecar.Send(new NewSessionCommand(Guid.NewGuid().ToString()));
                Messages.Clear();
                AppendSystem("开始新会话");
                break;
            case "skills":
                RefreshSlashCommands();
                break;
            case "skill":
                InputText = $"/{command.Name} ";
                break;
        }
    }

    public IEnumerable<SlashCommandItem> FilteredSlashCommands
    {
        get
        {
            if (!InputText.StartsWith("/")) return Array.Empty<SlashCommandItem>();
            var query = InputText.Substring(1).ToLowerInvariant();
            if (string.IsNullOrEmpty(query)) return SlashCommands;
            return SlashCommands.Where(c => c.Name.ToLowerInvariant().Contains(query));
        }
    }

    partial void OnInputTextChanged(string value)
    {
        OnPropertyChanged(nameof(FilteredSlashCommands));
        ShowCommandPanel = value.StartsWith("/");
    }

    // ----- Sessions --------------------------------------------------------

    [RelayCommand]
    public void RefreshSessions()
    {
        _sidecar.Send(new ListSessionsCommand(Guid.NewGuid().ToString()));
    }

    [RelayCommand]
    public void ToggleSessionList()
    {
        ShowSessionList = !ShowSessionList;
        if (ShowSessionList) RefreshSessions();
    }

    public void LoadSession(string sessionId)
    {
        if (!_sidecar.IsRunning)
        {
            AppendSystem("Sidecar 进程未运行，无法加载会话");
            return;
        }
        _sidecar.Send(new LoadSessionCommand(Guid.NewGuid().ToString(), sessionId));
    }

    [RelayCommand]
    public void CreateNewSession()
    {
        _sidecar.Send(new NewSessionCommand(Guid.NewGuid().ToString()));
        Messages.Clear();
        AttachedImages.Clear();
        AppendSystem("开始新会话");
    }

    // ----- Image attachment ----------------------------------------------

    public void PasteImage()
    {
        try
        {
            if (!Clipboard.ContainsImage()) return;
            var src = Clipboard.GetImage();
            if (src is null) return;
            AddImageAttachment(src);
        }
        catch (Exception ex) { AppendSystem($"剪贴板图片: {ex.Message}"); }
    }

    public void AddImageAttachment(BitmapSource source)
    {
        using var stream = new MemoryStream();
        var encoder = new PngBitmapEncoder();
        encoder.Frames.Add(BitmapFrame.Create(source));
        encoder.Save(stream);
        var bytes = stream.ToArray();
        var dataUrl = $"data:image/png;base64,{Convert.ToBase64String(bytes)}";

        var thumb = MakeThumbnail(source, 80);
        AttachedImages.Add(new AttachedImage(Guid.NewGuid().ToString(), dataUrl, thumb));
    }

    public void RemoveAttachedImage(string id)
    {
        var match = AttachedImages.FirstOrDefault(x => x.Id == id);
        if (match is not null) AttachedImages.Remove(match);
    }

    public void ClearAttachedImages() => AttachedImages.Clear();

    private static BitmapSource MakeThumbnail(BitmapSource source, double maxSize)
    {
        var aspect = source.PixelWidth / (double)source.PixelHeight;
        double w, h;
        if (aspect > 1) { w = maxSize; h = maxSize / aspect; }
        else { w = maxSize * aspect; h = maxSize; }
        var scale = w / source.PixelWidth;
        var scaled = new TransformedBitmap(source, new System.Windows.Media.ScaleTransform(scale, scale));
        scaled.Freeze();
        return scaled;
    }

    // ----- Event handling -------------------------------------------------

    private void Handle(ServerEvent evt)
    {
        switch (evt)
        {
            case ReadyEvent ready:
                ProjectRoot = ready.ProjectRoot;
                _savedVersion = ready.Version;
                StatusText = $"ready · v{ready.Version}";
                RefreshSlashCommands();
                RefreshSessions();
                break;
            case SessionEvent:
                break;
            case StreamEvent stream:
                StreamProgress = stream.Phase switch
                {
                    "start" => "0",
                    "update" => stream.FormattedTokens,
                    "end" => "",
                    _ => StreamProgress,
                };
                break;
            case MessageEvent m:
                Apply(m.Message);
                break;
            case SessionsListEvent sl:
                SessionList.Clear();
                foreach (var s in sl.Sessions) SessionList.Add(s);
                break;
            case SessionLoadedEvent loaded:
                Messages.Clear();
                IsStreaming = false;
                foreach (var msg in loaded.Messages)
                {
                    if (msg.Visible == false) continue;
                    var rawContent = msg.Content ?? "";
                    var reasoning = msg.MessageParams?.ReasoningContent ?? "";
                    var content = string.IsNullOrEmpty(rawContent) ? reasoning : rawContent;
                    if (string.IsNullOrEmpty(content)) continue;
                    if (msg.Role == "tool")
                    {
                        Messages.Add(new DisplayMessage
                        {
                            Id = msg.Id,
                            Role = "tool",
                            IsTool = true,
                            ToolName = msg.Meta?.Function?.Name ?? "tool",
                            ToolParams = msg.Meta?.ParamsMd ?? "",
                            ToolResult = msg.Meta?.ResultMd ?? content,
                        });
                    }
                    else
                    {
                        Messages.Add(new DisplayMessage
                        {
                            Id = msg.Id,
                            Role = msg.Role,
                            Content = content,
                            IsThinking = msg.Meta?.AsThinking ?? false,
                        });
                    }
                }
                break;
            case ErrorEvent err:
                AppendSystem($"Error: {err.Message}");
                break;
            case DoneEvent:
                IsStreaming = false;
                StatusText = $"ready · v{_savedVersion}";
                _pendingSubmitId = null;
                break;
            case AckEvent:
                break;
            case ProjectRootChangedEvent pr:
                ProjectRoot = pr.Path;
                SettingsLoader.SaveLastProjectRoot(pr.Path);
                SlashCommands.Clear();
                foreach (var skill in pr.Skills)
                {
                    SlashCommands.Add(new SlashCommandItem("skill", skill.Name, $"/{skill.Name}", skill.Description, skill));
                }
                RefreshSlashCommands();
                break;
            case SlashCommandsEvent sc:
                SlashCommands.Clear();
                foreach (var c in sc.Commands) SlashCommands.Add(c);
                OnPropertyChanged(nameof(FilteredSlashCommands));
                break;
            case ClipboardImageEvent ci:
                if (ci.Error is not null) AppendSystem($"剪贴板图片: {ci.Error}");
                else if (ci.DataUrl is not null) TryAddImageFromDataUrl(ci.DataUrl);
                break;
            case UnknownEvent u:
                AppendSystem($"Unknown event: {u.RawType}");
                break;
        }
    }

    private void TryAddImageFromDataUrl(string dataUrl)
    {
        var marker = ";base64,";
        var idx = dataUrl.IndexOf(marker, StringComparison.Ordinal);
        if (idx < 0) return;
        try
        {
            var bytes = Convert.FromBase64String(dataUrl[(idx + marker.Length)..]);
            using var ms = new MemoryStream(bytes);
            var decoder = BitmapDecoder.Create(ms, BitmapCreateOptions.PreservePixelFormat, BitmapCacheOption.OnLoad);
            var frame = decoder.Frames.FirstOrDefault();
            if (frame is null) return;
            frame.Freeze();
            AddImageAttachment(frame);
        }
        catch { /* ignored */ }
    }

    private void Apply(ServerMessage message)
    {
        if (message.Visible == false) return;
        var role = message.Role;
        var rawContent = message.Content ?? "";
        var reasoning = message.MessageParams?.ReasoningContent ?? "";
        var content = string.IsNullOrEmpty(rawContent) ? reasoning : rawContent;

        if (role == "user")
        {
            if (Messages.LastOrDefault() is { } last && last.Role == "user" && last.Content == content) return;
            Messages.Add(new DisplayMessage { Id = message.Id, Role = "user", Content = content });
        }
        else if (role == "assistant")
        {
            if (string.IsNullOrEmpty(content)) return;
            Messages.Add(new DisplayMessage
            {
                Id = message.Id,
                Role = "assistant",
                Content = content,
                IsThinking = message.Meta?.AsThinking ?? false,
            });
        }
        else if (role == "tool")
        {
            Messages.Add(new DisplayMessage
            {
                Id = message.Id,
                Role = "tool",
                IsTool = true,
                ToolName = message.Meta?.Function?.Name ?? "tool",
                ToolParams = message.Meta?.ParamsMd ?? "",
                ToolResult = message.Meta?.ResultMd ?? content,
            });
        }
        else if (role == "system" && message.Visible == true && !string.IsNullOrEmpty(content))
        {
            Messages.Add(new DisplayMessage { Id = message.Id, Role = "system", Content = content });
        }
    }

    private void AppendUser(string text) =>
        Messages.Add(new DisplayMessage { Id = Guid.NewGuid().ToString(), Role = "user", Content = text });

    private void AppendSystem(string text) =>
        Messages.Add(new DisplayMessage { Id = Guid.NewGuid().ToString(), Role = "system", Content = text });

    public async ValueTask DisposeAsync()
    {
        _isUserTerminated = true;
        await _sidecar.DisposeAsync().ConfigureAwait(false);
        if (_pumpTask is not null) try { await _pumpTask.ConfigureAwait(false); } catch { /* ignored */ }
    }
}
