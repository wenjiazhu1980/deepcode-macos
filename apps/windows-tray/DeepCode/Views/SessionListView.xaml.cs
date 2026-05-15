using System.Windows.Controls;
using DeepCode.Models;
using DeepCode.Sidecar;

namespace DeepCode.Views;

public partial class SessionListView : UserControl
{
    public SessionListView()
    {
        InitializeComponent();
    }

    private void OnSessionSelected(object sender, SelectionChangedEventArgs e)
    {
        if (DataContext is not ChatViewModel vm) return;
        if (e.AddedItems.Count == 0) return;
        if (e.AddedItems[0] is ServerSessionEntry entry)
        {
            vm.LoadSession(entry.Id);
            vm.ShowSessionList = false;
        }
    }
}
