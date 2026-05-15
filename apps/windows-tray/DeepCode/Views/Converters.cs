using System.Globalization;
using System.IO;
using System.Windows;
using System.Windows.Data;

namespace DeepCode.Views.Converters;

public sealed class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => (value is bool b && b) ? Visibility.Visible : Visibility.Collapsed;
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => value is Visibility v && v == Visibility.Visible;
}

public sealed class InverseBoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => (value is bool b && b) ? Visibility.Collapsed : Visibility.Visible;
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => value is Visibility v && v != Visibility.Visible;
}

public sealed class StringEmptyToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => string.IsNullOrEmpty(value as string) ? Visibility.Collapsed : Visibility.Visible;
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => throw new NotSupportedException();
}

public sealed class CountToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        => value is int n && n > 0 ? Visibility.Visible : Visibility.Collapsed;
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => throw new NotSupportedException();
}

public sealed class CollapsePathConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        var path = value as string ?? "";
        if (string.IsNullOrEmpty(path)) return "";
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        if (!string.IsNullOrEmpty(home) && path.StartsWith(home, StringComparison.OrdinalIgnoreCase))
        {
            return "~" + path[home.Length..];
        }
        return path;
    }
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => throw new NotSupportedException();
}

public sealed class RoleEqualsConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        var expected = parameter as string ?? "";
        var actual = value as string ?? "";
        return string.Equals(expected, actual, StringComparison.Ordinal) ? Visibility.Visible : Visibility.Collapsed;
    }
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => throw new NotSupportedException();
}

public sealed class StatusBadgeConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        return (value as string) switch
        {
            "completed" => "✓",
            "failed" => "✗",
            "processing" => "●",
            "waiting_for_user" => "?",
            "interrupted" => "⊘",
            string s => s,
            _ => "",
        };
    }
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => throw new NotSupportedException();
}

public sealed class TimeAgoConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        var iso = value as string ?? "";
        if (string.IsNullOrEmpty(iso)) return "";
        if (!DateTime.TryParse(iso, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
            return iso.Length >= 10 ? iso[..10] : iso;
        var diff = DateTime.UtcNow - dt.ToUniversalTime();
        if (diff.TotalSeconds < 60) return "刚刚";
        if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes}分钟前";
        if (diff.TotalHours < 24) return $"{(int)diff.TotalHours}小时前";
        return dt.ToLocalTime().ToString("MM-dd HH:mm", CultureInfo.InvariantCulture);
    }
    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        => throw new NotSupportedException();
}
