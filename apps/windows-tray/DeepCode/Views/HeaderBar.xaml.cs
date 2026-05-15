using System.Windows;
using System.Windows.Controls;

namespace DeepCode.Views;

public partial class HeaderBar : UserControl
{
    public HeaderBar()
    {
        InitializeComponent();
    }

    private void OnQuitClicked(object sender, RoutedEventArgs e)
    {
        Application.Current.Shutdown();
    }
}
