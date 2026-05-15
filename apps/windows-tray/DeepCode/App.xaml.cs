using System.Windows;
using DeepCode.Models;

namespace DeepCode;

public partial class App : Application
{
    internal ChatViewModel? ViewModel { get; private set; }
    internal TrayHost? Tray { get; private set; }

    private async void OnStartup(object sender, StartupEventArgs e)
    {
        ViewModel = new ChatViewModel();
        Tray = new TrayHost(ViewModel);
        Tray.Install();

        try
        {
            await ViewModel.StartAsync();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"启动失败: {ex.Message}", "DeepCode", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private async void OnExit(object sender, ExitEventArgs e)
    {
        Tray?.Dispose();
        if (ViewModel is not null)
        {
            await ViewModel.DisposeAsync();
        }
    }
}
