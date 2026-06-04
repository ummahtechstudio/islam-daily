<#
.SYNOPSIS
    Downloads the Arabic hadith editions from the free fawazahmed0/hadith-api
    and saves each one as a JSON file, ready to upload to Cloudflare R2.

.NOTES
    Project : Islam Daily  (Ummah Tech Studio)
    Source  : https://github.com/fawazahmed0/hadith-api   (free, no API key)
    Usage   : Just run it. No arguments needed.

    Each book has TWO Arabic versions in the API:
      ara-bukhari   -> full Arabic WITH diacritics (harakat)  -> use this to DISPLAY
      ara-bukhari1  -> same text, diacritics removed           -> handy for SEARCH
    By default this grabs only the full (display) versions.
    Set $IncludeSearchVersions = $true below to also pull the diacritics-removed copies.
#>

# ---------------- Config ----------------
$OutputFolder          = "D:\Islam\islam-daily\hadith-arabic"
$EditionsUrl           = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.json"
$IncludeSearchVersions = $false   # set to $true to also download the diacritics-removed copies
# ----------------------------------------

# Speed + compatibility fixes for Windows PowerShell 5.1
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host ""
Write-Host "=== Islam Daily : Arabic Hadith Downloader ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $OutputFolder)) {
    New-Item -ItemType Directory -Path $OutputFolder -Force | Out-Null
    Write-Host "Created folder: $OutputFolder" -ForegroundColor DarkGray
}

# 1) Get the master list of every edition
Write-Host "Fetching edition list..." -ForegroundColor Yellow
try {
    $editions = Invoke-RestMethod -Uri $EditionsUrl -ErrorAction Stop
} catch {
    Write-Host "ERROR: Could not fetch the editions list. Check your internet connection." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    return
}

# 2) Keep only the Arabic editions (skip diacritics-removed copies unless asked)
$arabicEditions = @()
foreach ($book in $editions.PSObject.Properties) {
    $bookTitle = $book.Value.name
    if ($book.Value.collection) {
        foreach ($item in $book.Value.collection) {
            if ($item.language -eq "Arabic") {
                $isSearchCopy = ($item.comments -match 'Diacritics removed')
                if ($isSearchCopy -and -not $IncludeSearchVersions) { continue }
                $item | Add-Member -NotePropertyName BookTitle   -NotePropertyValue $bookTitle    -Force
                $item | Add-Member -NotePropertyName IsSearchCopy -NotePropertyValue $isSearchCopy -Force
                $arabicEditions += $item
            }
        }
    }
}

if ($arabicEditions.Count -eq 0) {
    Write-Host "No Arabic editions found in the API." -ForegroundColor Red
    return
}

Write-Host ("Found {0} Arabic editions to download." -f $arabicEditions.Count) -ForegroundColor Green
Write-Host ""

# 3) Download each one. Try the full JSON first, fall back to the minified copy.
$ok = 0
$failed = 0
foreach ($edition in $arabicEditions) {
    $name     = $edition.name
    $title    = $edition.BookTitle
    $variant  = if ($edition.IsSearchCopy) { "[search/no-harakat]" } else { "[full/harakat]" }
    $destPath = Join-Path $OutputFolder "$name.json"

    Write-Host ("  {0,-16} {1,-22} {2,-20} ... " -f $name, $title, $variant) -NoNewline

    $downloaded = $false
    foreach ($url in @($edition.link, $edition.linkmin)) {
        if ([string]::IsNullOrWhiteSpace($url)) { continue }
        try {
            Invoke-WebRequest -Uri $url -OutFile $destPath -ErrorAction Stop
            $downloaded = $true
            break
        } catch {
            # silently try the fallback URL on the next loop
        }
    }

    if ($downloaded) {
        $count = $null
        try { $count = (Get-Content $destPath -Raw | ConvertFrom-Json).hadiths.Count } catch { }
        if ($count) {
            Write-Host ("OK  ({0} hadiths)" -f $count) -ForegroundColor Green
        } else {
            $sizeKB = [math]::Round((Get-Item $destPath).Length / 1KB)
            Write-Host ("OK  ({0} KB)" -f $sizeKB) -ForegroundColor Green
        }
        $ok++
    } else {
        Write-Host "FAILED" -ForegroundColor Red
        $failed++
    }
}

# 4) Summary
Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host ("  Downloaded : {0}" -f $ok) -ForegroundColor Green
if ($failed -gt 0) { Write-Host ("  Failed     : {0}" -f $failed) -ForegroundColor Red }
Write-Host ("  Saved to   : {0}" -f $OutputFolder) -ForegroundColor White
if (-not $IncludeSearchVersions) {
    Write-Host ""
    Write-Host "  Tip: set `$IncludeSearchVersions = `$true to also grab the" -ForegroundColor DarkGray
    Write-Host "       diacritics-removed copies (better for search indexing)." -ForegroundColor DarkGray
}
Write-Host ""
