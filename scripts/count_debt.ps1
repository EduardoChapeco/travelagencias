$src = Get-ChildItem 'src' -Recurse -Include '*.tsx','*.ts' -File
$css = Get-ChildItem 'src' -Recurse -Include '*.css' -File

Write-Host '=== METRICAS DE DIVIDA — BASELINE LOTE 0 ==='

$inputs = ($src | Select-String -Pattern '<input\s' | Measure-Object).Count
Write-Host "input nativos: $inputs"

$selects = ($src | Select-String -Pattern '<select\s' | Measure-Object).Count
Write-Host "select nativos: $selects"

$textareas = ($src | Select-String -Pattern '<textarea\s' | Measure-Object).Count
Write-Host "textarea nativos: $textareas"

$buttons = ($src | Select-String -Pattern '<button\s' | Measure-Object).Count
Write-Host "button nativos: $buttons"

$inlineStyle = ($src | Select-String -Pattern 'style=\{\{' | Measure-Object).Count
Write-Host "style={{}} inline: $inlineStyle"

$hexColors = (($src + $css) | Select-String -Pattern '#[0-9a-fA-F]{3,8}' | Measure-Object).Count
Write-Host "Hex colors: $hexColors"

$rgbaColors = (($src + $css) | Select-String -Pattern 'rgba?\(' | Measure-Object).Count
Write-Host "RGBA/RGB: $rgbaColors"

$importants = (($src + $css) | Select-String -Pattern '!important' | Measure-Object).Count
Write-Host "!important: $importants"

$asAny = ($src | Select-String -Pattern '\bas any\b' | Measure-Object).Count
Write-Host "as any: $asAny"

$branding = ($src | Select-String -Pattern 'Turis' | Measure-Object).Count
Write-Host "Branding Turis: $branding"

$supabaseDirect = ($src | Select-String -Pattern 'supabase\.' | Measure-Object).Count
Write-Host "Supabase linhas: $supabaseDirect"
