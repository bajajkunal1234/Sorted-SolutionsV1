# Fix all import paths in Next.js project

Write-Host "Fixing import paths in jobs components..."
Get-ChildItem "C:\Users\KIIT\OneDrive\Desktop\sorted-on-next\components\jobs" -Filter "*.jsx" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -notmatch "^'use client'") {
        $content = "'use client'`r`n`r`n" + $content
    }
    $content = $content -replace "from '\.\./utils/", "from '@/utils/"
    $content = $content -replace "from '\.\./data/", "from '@/data/"
    $content = $content -replace "from '\.\./admin/", "from '@/components/admin/"
    $content | Set-Content $_.FullName
}

Write-Host "Fixing import paths in admin components..."
Get-ChildItem "C:\Users\KIIT\OneDrive\Desktop\sorted-on-next\components\admin" -Filter "*.jsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "from '\./jobs/", "from '@/components/jobs/"
    $content | Set-Content $_.FullName
}

Write-Host "Fixing import paths in reports components..."
Get-ChildItem "C:\Users\KIIT\OneDrive\Desktop\sorted-on-next\components\reports" -Filter "*.jsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace "from '\./InteractionsTab'", "from '@/components/accounts/InteractionsTab'"
    $content | Set-Content $_.FullName
}

Write-Host "All import paths fixed!"
