$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$text = ([char]0xC138).ToString() + ([char]0xC6C0).ToString()
$font = New-Object System.Drawing.FontFamily('Malgun Gothic')

function Write-Icon {
    param([string]$Path, [int]$Size, [string]$Kind)

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $glyph = New-Object System.Drawing.Drawing2D.GraphicsPath
    $matrix = New-Object System.Drawing.Drawing2D.Matrix
    $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gradient = $null
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.Clear([System.Drawing.Color]::Transparent)
        $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
        if ($Kind -eq 'round') {
            $clip.AddEllipse($rect)
            $graphics.SetClip($clip)
        }
        if ($Kind -ne 'foreground' -and $Kind -ne 'status') {
            $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
                $rect,
                [System.Drawing.ColorTranslator]::FromHtml('#3d6b48'),
                [System.Drawing.ColorTranslator]::FromHtml('#5a8f65'),
                [single]45
            )
            $blend = New-Object System.Drawing.Drawing2D.ColorBlend(3)
            $blend.Colors = @(
                [System.Drawing.ColorTranslator]::FromHtml('#3d6b48'),
                [System.Drawing.ColorTranslator]::FromHtml('#4a7d57'),
                [System.Drawing.ColorTranslator]::FromHtml('#5a8f65')
            )
            $blend.Positions = @([single]0, [single]0.4, [single]1)
            $gradient.InterpolationColors = $blend
            $graphics.FillRectangle($gradient, $rect)
        }
        if ($Kind -ne 'background') {
            $glyph.AddString(
                $text, $font, [int][System.Drawing.FontStyle]::Bold, [single]100,
                (New-Object System.Drawing.PointF(0, 0)),
                [System.Drawing.StringFormat]::GenericTypographic
            )
            $bounds = $glyph.GetBounds()
            # Adaptive artwork stays inside Android's central safe zone.
            $fraction = if ($Kind -eq 'foreground') { 0.50 } elseif ($Kind -eq 'status') { 0.85 } else { 0.65 }
            $scale = [single]($Size * $fraction / $bounds.Width)
            $matrix.Translate(-$bounds.X, -$bounds.Y, [System.Drawing.Drawing2D.MatrixOrder]::Append)
            $matrix.Scale($scale, $scale, [System.Drawing.Drawing2D.MatrixOrder]::Append)
            $matrix.Translate(
                [single](($Size - $bounds.Width * $scale) / 2),
                [single](($Size - $bounds.Height * $scale) / 2),
                [System.Drawing.Drawing2D.MatrixOrder]::Append
            )
            $glyph.Transform($matrix)
            $graphics.FillPath([System.Drawing.Brushes]::White, $glyph)
        }
        [void][System.IO.Directory]::CreateDirectory((Split-Path -Parent $Path))
        $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        if ($gradient) { $gradient.Dispose() }
        $clip.Dispose()
        $matrix.Dispose()
        $glyph.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

try {
    Write-Icon (Join-Path $root 'assets\native\seum-icon.png') 1024 'square'
    Write-Icon (Join-Path $root 'public\push-icon.png') 256 'square'
    Write-Icon (Join-Path $root 'ios\App\App\Assets.xcassets\AppIcon.appiconset\AppIcon-512@2x.png') 1024 'square'
    $densities = @(
        @{ Name = 'mdpi'; Legacy = 48; Adaptive = 108 },
        @{ Name = 'hdpi'; Legacy = 72; Adaptive = 162 },
        @{ Name = 'xhdpi'; Legacy = 96; Adaptive = 216 },
        @{ Name = 'xxhdpi'; Legacy = 144; Adaptive = 324 },
        @{ Name = 'xxxhdpi'; Legacy = 192; Adaptive = 432 }
    )
    foreach ($density in $densities) {
        $dir = Join-Path $root ('android\app\src\main\res\mipmap-' + $density.Name)
        Write-Icon (Join-Path $dir 'ic_launcher.png') $density.Legacy 'square'
        Write-Icon (Join-Path $dir 'ic_launcher_round.png') $density.Legacy 'round'
        Write-Icon (Join-Path $dir 'ic_launcher_foreground.png') $density.Adaptive 'foreground'
        Write-Icon (Join-Path $dir 'ic_launcher_background.png') $density.Adaptive 'background'
        $statusDir = Join-Path $root ('android\app\src\main\res\drawable-' + $density.Name)
        Write-Icon (Join-Path $statusDir 'ic_stat_seum.png') ([int]($density.Legacy / 2)) 'status'
    }
    Write-Output 'Generated SEUM Android and iOS icons using the installed Malgun Gothic font.'
} finally {
    $font.Dispose()
}
