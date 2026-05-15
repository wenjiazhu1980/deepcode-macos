using System.Diagnostics;
using System.IO;
using System.Text;

namespace DeepCode.Sidecar;

public sealed class SidecarException : Exception
{
    public SidecarException(string message) : base(message) { }
}

/// <summary>
/// Owns the lifecycle of the bundled `node.exe cli.mjs headless` subprocess.
/// Mirrors apps/macos-menubar/DeepCode/Sidecar/SidecarProcess.swift.
/// </summary>
public sealed class SidecarProcess : IAsyncDisposable
{
    private Process? _process;
    private JsonRpcBridge? _bridge;
    private CancellationTokenSource? _stderrCts;

    public JsonRpcBridge Bridge =>
        _bridge ?? throw new InvalidOperationException("Sidecar not launched yet.");

    public Action<string>? OnStderrLine { get; set; }
    public Action<int>? OnProcessTerminated { get; set; }

    public bool IsRunning => _process is { HasExited: false };

    public void Launch(string? projectRoot = null)
    {
        var sidecarDir = Path.Combine(AppContext.BaseDirectory, "sidecar");
        var nodeExe = Path.Combine(sidecarDir, "node.exe");
        var cliPath = Path.Combine(sidecarDir, "cli.mjs");

        if (!File.Exists(nodeExe))
            throw new SidecarException(
                $"Bundled node.exe not found at {nodeExe}. Run apps/windows-tray/scripts/stage-sidecar.ps1 or reinstall DeepCode.");
        if (!File.Exists(cliPath))
            throw new SidecarException(
                $"Bundled cli.mjs not found at {cliPath}. Run apps/windows-tray/scripts/stage-sidecar.ps1 or reinstall DeepCode.");

        var resolvedRoot = string.IsNullOrEmpty(projectRoot)
            ? Environment.GetFolderPath(Environment.SpecialFolder.UserProfile)
            : projectRoot;

        var psi = new ProcessStartInfo
        {
            FileName = nodeExe,
            WorkingDirectory = sidecarDir,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardInputEncoding = Encoding.UTF8,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        psi.ArgumentList.Add(cliPath);
        psi.ArgumentList.Add("headless");
        psi.ArgumentList.Add("--project-root");
        psi.ArgumentList.Add(resolvedRoot);

        psi.Environment["NODE_ENV"] = "production";

        var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
        process.Exited += (_, _) =>
        {
            var status = 0;
            try { status = process.ExitCode; } catch { /* ignored */ }
            OnProcessTerminated?.Invoke(status);
        };

        if (!process.Start())
            throw new SidecarException("Failed to start node sidecar process.");

        _process = process;
        _bridge = new JsonRpcBridge(process.StandardInput, process.StandardOutput);

        _stderrCts = new CancellationTokenSource();
        _ = Task.Run(() => PumpStderrAsync(process.StandardError, _stderrCts.Token));
    }

    private async Task PumpStderrAsync(StreamReader reader, CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                var line = await reader.ReadLineAsync(ct).ConfigureAwait(false);
                if (line is null) break;
                OnStderrLine?.Invoke(line);
            }
        }
        catch (OperationCanceledException) { /* normal */ }
        catch { /* ignored */ }
    }

    public void Send(ClientCommand command) => _bridge?.Send(command);

    public void Terminate()
    {
        _stderrCts?.Cancel();
        _bridge?.CloseStdin();
        try
        {
            if (_process is { HasExited: false })
            {
                _process.Kill(entireProcessTree: true);
            }
        }
        catch { /* ignored */ }
    }

    public async ValueTask DisposeAsync()
    {
        Terminate();
        if (_bridge is not null) await _bridge.DisposeAsync().ConfigureAwait(false);
        _process?.Dispose();
        _stderrCts?.Dispose();
    }
}
