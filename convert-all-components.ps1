# PowerShell script to convert ALL React components to Next.js
# This will process all .jsx files in the SORTED/src/components directory

$sourceRoot = "C:\Users\KIIT\OneDrive\Desktop\SORTED\src\components"
$destRoot = "C:\Users\KIIT\OneDrive\Desktop\sorted-on-next\app\admin\components"
$scriptPath = "C:\Users\KIIT\OneDrive\Desktop\sorted-on-next\convert-single-component.ps1"

# List of shared component files to convert (in root components folder)
$sharedComponents = @(
    "JobCard.jsx",
    "LogNoteItem.jsx",
    "JobDetailModal.jsx",
    "ProductDetailModal.jsx",
    "AccountDetailModal.jsx",
    "CreateJobForm.jsx",
    "InteractionsTab.jsx",
    "InteractionTimeline.jsx",
    "SettingsModal.jsx"
)

Write-Host "Converting shared components..." -ForegroundColor Cyan

foreach ($component in $sharedComponents) {
    $sourcePath = Join-Path $sourceRoot $component
    $destPath = Join-Path $destRoot ($component -replace '\.jsx$', '.js')
    
    if (Test-Path $sourcePath) {
        & powershell -ExecutionPolicy Bypass -File $scriptPath -SourceFile $sourcePath -DestFile $destPath
    }
    else {
        Write-Host "⚠️  Not found: $component" -ForegroundColor Yellow
    }
}

Write-Host "`nConverting subdirectories..." -ForegroundColor Cyan

# List of subdirectories to process
$subdirs = @("jobs", "accounts", "inventory", "reports", "admin")

foreach ($subdir in $subdirs) {
    $sourceDir = Join-Path $sourceRoot $subdir
    $destDir = Join-Path $destRoot $subdir
    
    if (!(Test-Path $sourceDir)) {
        Write-Host "⚠️  Directory not found: $subdir" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "`nProcessing $subdir/..." -ForegroundColor Green
    
    # Get all .jsx files in this directory
    $jsxFiles = Get-ChildItem -Path $sourceDir -Filter *.jsx -File
    
    foreach ($file in $jsxFiles) {
        $sourcePath = $file.FullName
        $destPath = Join-Path $destDir ($file.Name -replace '\.jsx$', '.js')
        
        & powershell -ExecutionPolicy Bypass -File $scriptPath -SourceFile $sourcePath -DestFile $destPath
    }
}

Write-Host "`n✅ All components converted!" -ForegroundColor Green
Write-Host "Total files processed: $(Get-ChildItem -Path $destRoot -Filter *.js -Recurse | Measure-Object | Select-Object -ExpandProperty Count)" -ForegroundColor Cyan
