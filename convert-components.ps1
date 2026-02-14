# PowerShell script to convert React components to Next.js
# This script will:
# 1. Add 'use client' directive to all component files
# 2. Update import paths from relative to absolute
# 3. Replace .jsx extensions with .js in imports

$componentsPath = "C:\Users\KIIT\OneDrive\Desktop\sorted-on-next\app\admin\components"

# Get all .js files recursively
$files = Get-ChildItem -Path $componentsPath -Filter *.js -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Skip if already has 'use client'
    if ($content -match "^'use client'") {
        Write-Host "Skipping $($file.Name) - already has 'use client'"
        continue
    }
    
    # Add 'use client' at the top
    $newContent = "'use client'`r`n`r`n" + $content
    
    # Update imports: ../data/sampleData → @/data/sampleData (we'll create this later)
    $newContent = $newContent -replace "from\s+['""]\.\.\/data\/", "from '@/data/"
    
    # Update imports: ../utils/ → @/utils/
    $newContent = $newContent -replace "from\s+['""]\.\.\/utils\/", "from '@/utils/"
    
    # Update imports: ./ComponentName.jsx → ./ComponentName.js
    $newContent = $newContent -replace "from\s+['""](\.\/[^'""]+)\.jsx['""]", "from '`$1.js'"
    
    # Update imports: ../components/ → @/app/admin/components/
    $newContent = $newContent -replace "from\s+['""]\.\.\/components\/", "from '@/app/admin/components/"
    
    # Save the file
    Set-Content -Path $file.FullName -Value $newContent -NoNewline
    
    Write-Host "Updated: $($file.Name)"
}

Write-Host "`nConversion complete!"
