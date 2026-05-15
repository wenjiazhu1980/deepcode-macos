using System.Collections.Specialized;
using System.Windows.Controls;
using DeepCode.Models;

namespace DeepCode.Views;

public partial class MessageList : UserControl
{
    public MessageList()
    {
        InitializeComponent();
        DataContextChanged += OnDataContextChanged;
    }

    private void OnDataContextChanged(object sender, System.Windows.DependencyPropertyChangedEventArgs e)
    {
        if (e.OldValue is ChatViewModel oldVm)
        {
            ((INotifyCollectionChanged)oldVm.Messages).CollectionChanged -= OnMessagesChanged;
        }
        if (e.NewValue is ChatViewModel newVm)
        {
            ((INotifyCollectionChanged)newVm.Messages).CollectionChanged += OnMessagesChanged;
        }
    }

    private void OnMessagesChanged(object? sender, NotifyCollectionChangedEventArgs e)
    {
        if (e.Action == NotifyCollectionChangedAction.Add)
        {
            // Auto-scroll to bottom on new message; defer so layout has applied
            Dispatcher.BeginInvoke(new Action(() => Scroller.ScrollToEnd()),
                System.Windows.Threading.DispatcherPriority.Background);
        }
    }
}
