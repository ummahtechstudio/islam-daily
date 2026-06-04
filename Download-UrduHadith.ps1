<#
.SYNOPSIS
    Downloads ALL Urdu hadith editions from the free fawazahmed0/hadith-api
    and saves each one as a JSON file, ready to upload to Cloudflare R2.

.NOTES
    Project : Islam Daily  (Ummah Tech Studio)
    Source  : https://github.com/fawazahmed0/hadith-api   (free, no API key)
    Usage   : Just run it. No arguments needed.
              It finds every Urdu ("urd-") edition on its own.
#>

# ---------------- Config (change the folder if you want) ----------------
$OutputFolder = "D:\Islam\islam-daily\hadith-urdu"
$EditionsUrl  = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.json"
# ------------------------------------------------------------------------

# Speed + compatibility fixes for Windows PowerShell 5.1
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

Write-Host ""
Write-Host "=== Islam Daily : Urdu Hadith Downloader ===" -ForegroundColor Cyan
Write-Host ""

# Make sure the output folder exists
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

# 2) Keep only the Urdu editions (and remember each book's nice title)
$urduEditions = @()
foreach ($book in $editions.PSObject.Properties) {
    $bookTitle = $book.Value.name
    if ($book.Value.collection) {
        foreach ($item in $book.Value.collection) {
            if ($item.language -eq "Urdu") {
                $item | Add-Member -NotePropertyName BookTitle -NotePropertyValue $bookTitle -Force
                $urduEditions += $item
            }
        }
    }
}

if ($urduEditions.Count -eq 0) {
    Write-Host "No Urdu editions found in the API." -ForegroundColor Red
    return
}

Write-Host ("Found {0} Urdu editions to download." -f $urduEditions.Count) -ForegroundColor Green
Write-Host ""

# 3) Download each one. Try the full JSON first, fall back to the minified copy.
$ok = 0
$failed = 0
foreach ($edition in $urduEditions) {
    $name     = $edition.name          # e.g. urd-bukhari
    $title    = $edition.BookTitle     # e.g. Sahih al Bukhari
    $destPath = Join-Path $OutputFolder "$name.json"

    Write-Host ("  {0,-16} {1,-22} ... " -f $name, $title) -NoNewline

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
        # Read-only sanity check (does not modify the saved file)
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
Write-Host ""
