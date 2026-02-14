# PowerShell script to fix common imports in accounts subdirectory
$accountsDir = "C:\Users\KIIT\OneDrive\Desktop\sorted-on-next\app\admin\components\accounts"

# Get all .js files in accounts directory
$files = Get-ChildItem -Path $accountsDir -Filter *.js

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Fix imports: from '../common/X' → from '@/app/admin/components/common/X'
    $newContent = $content -replace "from\s+['""]\.\.\/common\/([^'""]+)['""]", "from '@/app/admin/components/common/`$1'"
    
    # Only write if content changed
    if ($content -ne $newContent) {
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "✅ Fixed: $($file.Name)"
    }
}

Write-Host "`n✅ All accounts components fixed!"
