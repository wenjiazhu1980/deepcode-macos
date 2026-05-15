using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading.Channels;

namespace DeepCode.Sidecar;

/// <summary>
/// NDJSON bridge over a child process's stdin/stdout.
/// Mirrors apps/macos-menubar/DeepCode/Sidecar/JSONRPC.swift.
/// </summary>
public sealed class JsonRpcBridge : IAsyncDisposable
{
    private readonly StreamWriter _stdin;
    private readonly StreamReader _stdout;
    private readonly Channel<ServerEvent> _channel =
        Channel.CreateUnbounded<ServerEvent>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = true,
        });
    private readonly CancellationTokenSource _readerCts = new();
    private readonly Task _readerTask;
    private readonly object _writeLock = new();

    public ChannelReader<ServerEvent> Events => _channel.Reader;

    public JsonRpcBridge(StreamWriter stdin, StreamReader stdout)
    {
        _stdin = stdin;
        _stdout = stdout;
        _readerTask = Task.Run(() => PumpAsync(_readerCts.Token));
    }

    private async Task PumpAsync(CancellationToken ct)
    {
        try
        {
            while (!ct.IsCancellationRequested)
            {
                var line = await _stdout.ReadLineAsync(ct).ConfigureAwait(false);
                if (line is null)
                {
                    break; // sidecar closed stdout
                }
                if (string.IsNullOrEmpty(line)) continue;
                var evt = ProtocolJson.DecodeEvent(line);
                await _channel.Writer.WriteAsync(evt, ct).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException) { /* normal shutdown */ }
        catch (Exception ex)
        {
            await _channel.Writer.WriteAsync(new ErrorEvent(null, $"Pump failed: {ex.Message}"), CancellationToken.None).ConfigureAwait(false);
        }
        finally
        {
            _channel.Writer.TryComplete();
        }
    }

    public void Send(ClientCommand command)
    {
        var json = command.ToJson().ToJsonString(ProtocolJson.Options);
        // StreamWriter.WriteLine is not thread-safe; serialize sends.
        lock (_writeLock)
        {
            try
            {
                _stdin.Write(json);
                _stdin.Write('\n');
                _stdin.Flush();
            }
            catch (Exception ex)
            {
                _channel.Writer.TryWrite(new ErrorEvent(null, $"Send failed: {ex.Message}"));
            }
        }
    }

    public void CloseStdin()
    {
        try { _stdin.Close(); } catch { /* ignored */ }
    }

    public async ValueTask DisposeAsync()
    {
        _readerCts.Cancel();
        try { await _readerTask.ConfigureAwait(false); } catch { /* ignored */ }
        _readerCts.Dispose();
        _channel.Writer.TryComplete();
        try { _stdin.Dispose(); } catch { /* ignored */ }
        try { _stdout.Dispose(); } catch { /* ignored */ }
    }
}
