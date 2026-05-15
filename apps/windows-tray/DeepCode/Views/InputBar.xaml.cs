using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using DeepCode.Models;
using DeepCode.Sidecar;

namespace DeepCode.Views;

public partial class InputBar : UserControl
{
    public InputBar()
    {
        InitializeComponent();
    }

    private ChatViewModel? Vm => DataContext as ChatViewModel;

    private void OnInputKeyDown(object sender, KeyEventArgs e)
    {
        if (Vm is null) return;
        // Enter sends, Shift+Enter inserts newline (handled naturally by TextBox)
        if (e.Key == Key.Enter && (Keyboard.Modifiers & ModifierKeys.Shift) == 0)
        {
            e.Handled = true;
            Vm.SubmitCommand.Execute(null);
            return;
        }
        // Esc interrupts active stream
        if (e.Key == Key.Escape && Vm.IsStreaming)
        {
            e.Handled = true;
            Vm.InterruptCommand.Execute(null);
            return;
        }
        // Ctrl+V paste image if clipboard contains a bitmap; otherwise default text paste runs
        if (e.Key == Key.V && (Keyboard.Modifiers & ModifierKeys.Control) != 0)
        {
            if (Clipboard.ContainsImage())
            {
                e.Handled = true;
                Vm.PasteImage();
            }
        }
    }

    private void OnPasteImage(object sender, RoutedEventArgs e) => Vm?.PasteImage();

    private void OnRemoveImage(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string id) Vm?.RemoveAttachedImage(id);
    }

    private void OnSlashCommandClick(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is SlashCommandItem item) Vm?.ExecuteSlashCommand(item);
    }
}
