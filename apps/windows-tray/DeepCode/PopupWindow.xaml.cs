using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Interop;

namespace DeepCode;

public partial class PopupWindow : Window
{
    public PopupWindow()
    {
        InitializeComponent();
        Loaded += OnLoaded;
        SourceInitialized += OnSourceInitialized;
    }

    private void OnSourceInitialized(object? sender, EventArgs e)
    {
        // Hide from Alt+Tab by setting WS_EX_TOOLWINDOW
        var hwnd = new WindowInteropHelper(this).Handle;
        const int GWL_EXSTYLE = -20;
        const int WS_EX_TOOLWINDOW = 0x00000080;
        var current = GetWindowLong(hwnd, GWL_EXSTYLE);
        SetWindowLong(hwnd, GWL_EXSTYLE, current | WS_EX_TOOLWINDOW);
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        // Place near the tray icon (bottom-right by default; user can drag if WindowStyle != None,
        // but for a tray popup we just anchor to the screen corner).
        var workArea = SystemParameters.WorkArea;
        Left = workArea.Right - Width - 12;
        Top = workArea.Bottom - Height - 12;
    }

    [DllImport("user32.dll", EntryPoint = "GetWindowLong")]
    private static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", EntryPoint = "SetWindowLong")]
    private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
}
