using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Media;
using DeepCode.Models;
using DeepCode.Views;
using H.NotifyIcon;

namespace DeepCode;

/// <summary>
/// Owns the system tray icon and the chat popup window.
/// Replaces SwiftUI's MenuBarExtra; uses H.NotifyIcon.Wpf for the NotifyIcon shell hook.
/// </summary>
internal sealed class TrayHost : IDisposable
{
    private readonly ChatViewModel _viewModel;
    private TaskbarIcon? _tray;
    private PopupWindow? _popup;

    public TrayHost(ChatViewModel viewModel)
    {
        _viewModel = viewModel;
    }

    public void Install()
    {
        _tray = new TaskbarIcon
        {
            ToolTipText = "DeepCode",
            Visibility = Visibility.Visible,
        };
        // Try to load packaged icon; fall back to embedded application icon resource on miss.
        var iconPath = Path.Combine(AppContext.BaseDirectory, "Resources", "DeepCode.ico");
        if (File.Exists(iconPath))
        {
            try
            {
                _tray.IconSource = new System.Windows.Media.Imaging.BitmapImage(new Uri(iconPath, UriKind.Absolute));
            }
            catch { /* ignore — H.NotifyIcon will use a stock placeholder */ }
        }

        _tray.LeftClickCommand = new RelayCommand(TogglePopup);

        var menu = new ContextMenu();
        var open = new MenuItem { Header = "打开 DeepCode" };
        open.Click += (_, _) => ShowPopup();
        var exit = new MenuItem { Header = "退出" };
        exit.Click += (_, _) => Application.Current.Shutdown();
        menu.Items.Add(open);
        menu.Items.Add(new Separator());
        menu.Items.Add(exit);
        _tray.ContextMenu = menu;
    }

    private void TogglePopup()
    {
        if (_popup is { IsVisible: true })
        {
            _popup.Hide();
        }
        else
        {
            ShowPopup();
        }
    }

    private void ShowPopup()
    {
        if (_popup is null)
        {
            _popup = new PopupWindow { DataContext = _viewModel };
            _popup.Deactivated += (_, _) => _popup.Hide();
        }
        _popup.Show();
        _popup.Activate();
    }

    public void Dispose()
    {
        _popup?.Close();
        _tray?.Dispose();
    }
}

internal sealed class RelayCommand : System.Windows.Input.ICommand
{
    private readonly Action _action;
    public RelayCommand(Action action) => _action = action;
    public bool CanExecute(object? parameter) => true;
    public void Execute(object? parameter) => _action();
    public event EventHandler? CanExecuteChanged { add { } remove { } }
}
