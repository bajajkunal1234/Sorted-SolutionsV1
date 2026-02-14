# PowerShell script to convert a single React component to Next.js
# Usage: .\convert-single-component.ps1 -SourceFile "path" -DestFile "path"

param(
    [Parameter(Mandatory = $true)]
    [string]$SourceFile,
    
    [Parameter(Mandatory = $true)]
    [string]$DestFile
)

# Read the source file
$content = Get-Content $SourceFile -Raw

# Add 'use client' if not present
if ($content -notmatch "^'use client'") {
    $content = "'use client'`r`n`r`n" + $content
}

# Fix imports - Convert to absolute paths
# Pattern 1: from '../data/X' → from '@/lib/data/X'
$content = $content -replace "from\s+['""]\.\.\/data\/([^'""]+)['""]", "from '@/lib/data/`$1'"

# Pattern 2: from '../utils/X' → from '@/lib/utils/X'
$content = $content -replace "from\s+['""]\.\.\/utils\/([^'""]+)['""]", "from '@/lib/utils/`$1'"

# Pattern 3: from '../../data/X' → from '@/lib/data/X'
$content = $content -replace "from\s+['""]\.\.\/\.\.\/data\/([^'""]+)['""]", "from '@/lib/data/`$1'"

# Pattern 4: from '../../utils/X' → from '@/lib/utils/X'
$content = $content -replace "from\s+['""]\.\.\/\.\.\/utils\/([^'""]+)['""]", "from '@/lib/utils/`$1'"

# Pattern 5: from './X.jsx' → from './X' (remove .jsx extension)
$content = $content -replace "from\s+['""](\.\/[^'""]+)\.jsx['""]", "from '`$1'"

# Pattern 6: from '../components/X' → from '@/app/admin/components/X'
$content = $content -replace "from\s+['""]\.\.\/components\/([^'""]+)['""]", "from '@/app/admin/components/`$1'"

# Pattern 7: from '../../components/X' → from '@/app/admin/components/X'
$content = $content -replace "from\s+['""]\.\.\/\.\.\/components\/([^'""]+)['""]", "from '@/app/admin/components/`$1'"

# Create destination directory if it doesn't exist
$destDir = Split-Path -Parent $DestFile
if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

# Write to destination
Set-Content -Path $DestFile -Value $content -NoNewline

Write-Host "✅ Converted: $(Split-Path -Leaf $SourceFile) → $(Split-Path -Leaf $DestFile)"
