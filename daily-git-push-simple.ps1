# Daily GitHub Push Script
# This script runs daily to push changes to GitHub

param(
    [string]$GitHubRepo = ""
)

# Get project path
$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Daily GitHub Push" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if git repository exists
if (-not (Test-Path ".git")) {
    Write-Host "Error: Not a git repository!" -ForegroundColor Red
    exit 1
}

# Check if remote exists
$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    Write-Host "Warning: No remote repository" -ForegroundColor Yellow
    if ($GitHubRepo -eq "") {
        Write-Host "Please add remote repository" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "Adding remote repository: $GitHubRepo" -ForegroundColor Yellow
        git remote add origin $GitHubRepo
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to add remote repository!" -ForegroundColor Red
            exit 1
        }
    }
}

# Create or update daily log file
$logFile = "daily-commits-log.md"
$today = Get-Date -Format "yyyy-MM-dd"
$time = Get-Date -Format "HH:mm:ss"

# Calculate day number (start from day 1)
$progressFile = ".daily-push-progress.txt"
$dayNumber = 1

if (Test-Path $progressFile) {
    $progressContent = Get-Content $progressFile -Raw
    if ($progressContent -match "DayNumber:\s*(\d+)") {
        $dayNumber = [int]$matches[1] + 1
    }
}

# Check if we've already pushed today
$lastPushDate = ""
if (Test-Path $progressFile) {
    $progressContent = Get-Content $progressFile -Raw
    if ($progressContent -match "LastPushDate:\s*([^\r\n]+)") {
        $lastPushDate = $matches[1].Trim()
    }
}

# If already pushed today, skip
if ($lastPushDate -eq $today) {
    Write-Host "Already pushed today ($today). Skipping..." -ForegroundColor Yellow
    exit 0
}

# If day number exceeds 30, reset or stop
if ($dayNumber -gt 30) {
    Write-Host "30 days completed! Stopping daily pushes." -ForegroundColor Green
    exit 0
}

# Read log file if exists
$logContent = @"
# Daily GitHub Push Log

This file is updated daily as part of daily GitHub updates.

## Progress: Day $dayNumber of 30

"@

if (Test-Path $logFile) {
    $existingContent = Get-Content $logFile -Raw -Encoding UTF8
    # Keep the header and add new entry
    if ($existingContent -match "(?s)(# Daily GitHub Push Log.*?## Progress: Day \d+ of 30)") {
        $logContent = $matches[1] -replace "## Progress: Day \d+ of 30", "## Progress: Day $dayNumber of 30"
    } else {
        $logContent = $existingContent
    }
}

# Add new entry for today
$newEntry = @"

---

## Day $dayNumber - $today

- **Date**: $today
- **Time**: $time
- **Day Number**: $dayNumber of 30
- **Status**: ✅ Successfully pushed to GitHub

### What was updated today:
- Updated daily commit log
- Added progress tracking
- Daily automated push completed

### Notes:
Working on the Asel System project. Making steady progress each day!

"@

# Always add new entry for today (even if exists, we'll replace it)
# This ensures we always have a change to commit
if ($logContent -match "## Day $dayNumber - $today") {
    # Replace existing entry with new one (to update time)
    $logContent = $logContent -replace "(?s)## Day $dayNumber - $today.*?(?=---|## Day|\Z)", $newEntry
} else {
    # Add new entry
    $logContent += $newEntry
}
Set-Content -Path $logFile -Value $logContent -Encoding UTF8
Write-Host "Updated daily log file - Day $dayNumber" -ForegroundColor Green

# Update progress file
$progressContent = @"
LastPushDate: $today
LastPushTime: $time
DayNumber: $dayNumber
TotalDays: 30
"@
Set-Content -Path $progressFile -Value $progressContent -Encoding UTF8

# Always add the log file and progress file
git add $logFile
git add $progressFile

# Check for changes
$status = git status --porcelain

if ($status) {
    Write-Host ""
    Write-Host "Changes detected:" -ForegroundColor Yellow
    Write-Host $status -ForegroundColor Gray
    Write-Host ""
    
    # Create commit
    $commitMessage = "Day $dayNumber of 30 - Daily update ($today)"
    Write-Host "Creating commit..." -ForegroundColor Yellow
    git commit -m $commitMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Commit created successfully" -ForegroundColor Green
        
        # Push to GitHub
        Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
        git push origin main 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Pushed to GitHub successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Statistics:" -ForegroundColor Cyan
            Write-Host "   - Date: $today" -ForegroundColor White
            Write-Host "   - Time: $time" -ForegroundColor White
            Write-Host "   - Day: $dayNumber of 30" -ForegroundColor White
            Write-Host "   - Commit: $commitMessage" -ForegroundColor White
            Write-Host "   - Progress: $([math]::Round(($dayNumber/30)*100, 1))%" -ForegroundColor White
        } else {
            Write-Host "Failed to push to GitHub!" -ForegroundColor Red
            Write-Host "Check internet connection or GitHub permissions" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "Failed to create commit!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "No changes to push" -ForegroundColor Yellow
    Write-Host "   (This shouldn't happen - files should be updated)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

