# Daily Gradual Push Script
# This script pushes files gradually over 30 days
# Each day adds a new batch of files as if working on the project

param(
    [string]$GitHubRepo = ""
)

# Function to generate smart commit messages based on file types
function Generate-CommitMessage {
    param(
        [array]$Files,
        [int]$DayNumber
    )
    
    # Analyze file types
    $htmlFiles = $Files | Where-Object { $_ -match "\.html$" }
    $jsFiles = $Files | Where-Object { $_ -match "\.js$" }
    $cssFiles = $Files | Where-Object { $_ -match "\.css$" }
    $mdFiles = $Files | Where-Object { $_ -match "\.md$" }
    $assetsFiles = $Files | Where-Object { $_ -match "^assets/" }
    $testFiles = $Files | Where-Object { $_ -match "test" }
    $dbFiles = $Files | Where-Object { $_ -imatch "database|schema|erd" }
    $configFiles = $Files | Where-Object { $_ -match "package\.json|\.gitignore|jest\.config" }
    
    # Generate message based on file types
    $message = ""
    
    if ($dbFiles.Count -gt 0) {
        $message = "Add database schema and documentation files"
    }
    elseif ($configFiles.Count -gt 0) {
        $message = "Initialize project configuration files"
    }
    elseif ($htmlFiles.Count -gt 0 -and $jsFiles.Count -eq 0) {
        $pageName = ($htmlFiles[0] -replace "\.html$", "").ToLower()
        $message = "Add $pageName page HTML structure"
    }
    elseif ($htmlFiles.Count -gt 0 -and $jsFiles.Count -gt 0) {
        $pageName = ($htmlFiles[0] -replace "\.html$", "").ToLower()
        $message = "Implement $pageName page functionality"
    }
    elseif ($jsFiles.Count -gt 0 -and $htmlFiles.Count -eq 0) {
        if ($jsFiles | Where-Object { $_ -match "scripts/" }) {
            $scriptName = ($jsFiles[0] -replace ".*/|\.js$", "").ToLower()
            $message = "Add $scriptName module implementation"
        } else {
            $message = "Add utility scripts and helpers"
        }
    }
    elseif ($cssFiles.Count -gt 0) {
        $message = "Add styling and CSS files"
    }
    elseif ($assetsFiles.Count -gt 0) {
        $message = "Add assets and media files"
    }
    elseif ($testFiles.Count -gt 0) {
        $message = "Add unit and integration tests"
    }
    elseif ($mdFiles.Count -gt 0) {
        $message = "Add project documentation"
    }
    else {
        # Default message
        $fileTypes = @()
        if ($htmlFiles.Count -gt 0) { $fileTypes += "HTML" }
        if ($jsFiles.Count -gt 0) { $fileTypes += "JavaScript" }
        if ($cssFiles.Count -gt 0) { $fileTypes += "CSS" }
        if ($fileTypes.Count -gt 0) {
            $message = "Add " + ($fileTypes -join ", ") + " files"
        } else {
            $message = "Add project files ($($Files.Count) files)"
        }
    }
    
    return $message
}

# Get project path
$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Daily Gradual Push - Day by Day" -ForegroundColor Cyan
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
    }
}

# Read progress file
$progressFile = ".daily-push-progress.txt"
$dayNumber = 1
$filesPushed = 0
$totalFiles = 0
$lastPushDate = ""

if (Test-Path $progressFile) {
    $progressContent = Get-Content $progressFile -Raw
    if ($progressContent -match "DayNumber:\s*(\d+)") {
        $dayNumber = [int]$matches[1] + 1
    }
    if ($progressContent -match "FilesPushed:\s*(\d+)") {
        $filesPushed = [int]$matches[1]
    }
    if ($progressContent -match "TotalFiles:\s*(\d+)") {
        $totalFiles = [int]$matches[1]
    }
    if ($progressContent -match "LastPushDate:\s*([^\r\n]+)") {
        $lastPushDate = $matches[1].Trim()
    }
}

# Check if already pushed today AND successfully
$today = Get-Date -Format "yyyy-MM-dd"
$lastPushSuccess = $false
if ($progressContent -match "LastPushSuccess:\s*(true|false)") {
    $lastPushSuccess = $matches[1] -eq "true"
}

if ($lastPushDate -eq $today -and $lastPushSuccess) {
    Write-Host "Already pushed successfully today ($today). Skipping..." -ForegroundColor Yellow
    exit 0
} elseif ($lastPushDate -eq $today -and -not $lastPushSuccess) {
    Write-Host "Previous push failed today ($today). Retrying..." -ForegroundColor Yellow
    Write-Host ""
}

# Check if 30 days completed
if ($dayNumber -gt 30) {
    Write-Host "30 days completed! All files have been pushed." -ForegroundColor Green
    exit 0
}

# Read distribution plan
$planFile = ".file-distribution-plan.txt"
if (-not (Test-Path $planFile)) {
    Write-Host "Error: Distribution plan not found!" -ForegroundColor Red
    Write-Host "Please run setup-gradual-push.ps1 first" -ForegroundColor Yellow
    exit 1
}

    # Get files for today
    $planContent = Get-Content $planFile -Raw
    $dayPattern = "## Day $dayNumber\s+Files: (\d+)\s+([\s\S]*?)(?=## Day|\Z)"
    if ($planContent -match $dayPattern) {
        $filesCount = [int]$matches[1]
        $filesList = $matches[2].Trim() -split "`n" | Where-Object { $_ -ne "" }
        
        Write-Host "Day $dayNumber of 30" -ForegroundColor Cyan
        Write-Host "Files to check today: $filesCount" -ForegroundColor Yellow
        Write-Host ""
        
        # Add files for today
        $filesAdded = 0
        $filesSkipped = 0
        foreach ($file in $filesList) {
            $file = $file.Trim()
            if ($file -eq "" -or $file -eq ".FullName") {
                continue
            }
            
            if (Test-Path $file) {
                # Check git status of the file
                $gitStatus = git status --short $file 2>&1
                
                if ($gitStatus -match "^\?\?") {
                    # File is untracked, add it
                    git add $file 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        $filesAdded++
                        Write-Host "  + $file" -ForegroundColor Green
                    } else {
                        Write-Host "  ! Failed to add: $file" -ForegroundColor Yellow
                    }
                } elseif ($gitStatus -match "^\s*[AM]|^\s*M") {
                    # File has changes (Modified or Added), add it
                    git add $file 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        $filesAdded++
                        Write-Host "  + $file (modified)" -ForegroundColor Green
                    } else {
                        Write-Host "  ! Failed to add: $file" -ForegroundColor Yellow
                    }
                } else {
                    # File is already tracked and has no changes, skip it
                    $filesSkipped++
                    Write-Host "  - $file (already committed, skipping)" -ForegroundColor DarkGray
                }
            } else {
                Write-Host "  ! File not found: $file" -ForegroundColor Yellow
            }
        }
        
        # If no files were added from the plan, check for any untracked files
        if ($filesAdded -eq 0) {
            Write-Host ""
            Write-Host "Checking for untracked files in the project..." -ForegroundColor Cyan
            
            # Get all untracked files (excluding .git directory and progress files)
            $allUntracked = @()
            $untrackedOutput = git status --porcelain 2>&1 | Where-Object { $_ -match "^\?\?" }
            
            foreach ($line in $untrackedOutput) {
                $file = ($line -replace "^\?\?\s+", "").Trim()
                
                # Skip .git directory and progress files
                if ($file -match "^\.git" -or $file -match "daily-push-progress|file-distribution-plan|\.daily") {
                    continue
                }
                
                # Try to check if file exists (handle Arabic filenames)
                # Use -LiteralPath to handle special characters and wrap in try-catch
                $fileExists = $false
                try {
                    $fileExists = Test-Path -LiteralPath $file -ErrorAction Stop
                } catch {
                    # If Test-Path fails due to encoding issues, assume file exists
                    # Git status already confirmed it exists
                    $fileExists = $true
                }
                
                if ($fileExists) {
                    $allUntracked += $file
                }
            }
            
            if ($allUntracked.Count -gt 0) {
                Write-Host "Found $($allUntracked.Count) untracked file(s). Adding them..." -ForegroundColor Yellow
                
                # Add up to 5 untracked files (to match the daily plan)
                $filesToAdd = $allUntracked | Select-Object -First 5
                foreach ($file in $filesToAdd) {
                    git add $file 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        $filesAdded++
                        Write-Host "  + $file" -ForegroundColor Green
                    }
                }
                
                if ($filesAdded -gt 0) {
                    Write-Host ""
                    Write-Host "Added $filesAdded untracked file(s) to today's commit." -ForegroundColor Green
                }
            }
            
            if ($filesAdded -eq 0) {
                if ($filesSkipped -gt 0) {
                    Write-Host ""
                    Write-Host "All files for Day $dayNumber are already committed." -ForegroundColor Yellow
                    Write-Host "No untracked files found. Skipping to next day..." -ForegroundColor Yellow
                    # Update progress to next day
                    $time = Get-Date -Format "HH:mm:ss"
                    $progressContent = @"
LastPushDate: $today
LastPushTime: $time
LastPushSuccess: true
DayNumber: $dayNumber
TotalDays: 30
FilesPushed: $filesPushed
TotalFiles: $totalFiles
"@
                    Set-Content -Path $progressFile -Value $progressContent -Encoding UTF8
                } else {
                    Write-Host "No files to add today. All files may have been pushed already." -ForegroundColor Yellow
                }
                exit 0
            }
        }
    
    # Generate smart commit message based on file types
    $commitMessage = Generate-CommitMessage -Files $filesList -DayNumber $dayNumber
    
    # Create commit
    Write-Host ""
    Write-Host "Creating commit..." -ForegroundColor Yellow
    git commit -m $commitMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Commit created successfully" -ForegroundColor Green
        
        # Push to GitHub
        Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
        
        # Check if there's a rebase in progress and abort it first
        if (Test-Path ".git/rebase-merge" -or Test-Path ".git/rebase-apply") {
            Write-Host "Aborting previous rebase/merge..." -ForegroundColor Yellow
            git rebase --abort 2>&1 | Out-Null
            git merge --abort 2>&1 | Out-Null
        }
        
        # First, try to pull to sync with remote (using merge, not rebase to avoid conflicts)
        Write-Host "Syncing with remote..." -ForegroundColor Cyan
        $pullOutput = git pull origin main --no-rebase 2>&1
        $pullSuccess = $LASTEXITCODE -eq 0
        
        if (-not $pullSuccess) {
            # Check if there's a merge conflict
            if ($pullOutput -match "CONFLICT|conflict|Automatic merge failed") {
                Write-Host "Merge conflict detected. Attempting to resolve..." -ForegroundColor Yellow
                
                # Try to resolve conflicts automatically (prefer local changes)
                $conflictFiles = git diff --name-only --diff-filter=U 2>&1
                if ($conflictFiles) {
                    Write-Host "Conflicted files: $conflictFiles" -ForegroundColor Gray
                    Write-Host "Resolving conflicts by keeping local changes..." -ForegroundColor Yellow
                    
                    # For each conflicted file, use local version
                    foreach ($conflictFile in $conflictFiles) {
                        if ($conflictFile -and $conflictFile.Trim() -ne "") {
                            git checkout --ours $conflictFile 2>&1 | Out-Null
                            git add $conflictFile 2>&1 | Out-Null
                        }
                    }
                    
                    # Try to complete the merge
                    $mergeOutput = git commit --no-edit 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "Conflicts resolved successfully." -ForegroundColor Green
                        $pullSuccess = $true
                    } else {
                        Write-Host "Could not resolve conflicts automatically." -ForegroundColor Red
                        Write-Host "Please resolve conflicts manually and run: git push origin main" -ForegroundColor Yellow
                    }
                }
            } else {
                Write-Host "Warning: Pull failed, but continuing with push attempt..." -ForegroundColor Yellow
                Write-Host "Pull output: $pullOutput" -ForegroundColor Gray
            }
        }
        
        # Try to push
        $pushOutput = git push origin main 2>&1
        $pushSuccess = $LASTEXITCODE -eq 0
        
        if (-not $pushSuccess) {
            # Check if it's a rejection due to remote changes
            if ($pushOutput -match "rejected.*fetch first" -or $pushOutput -match "Updates were rejected" -or $pushOutput -match "non-fast-forward") {
                Write-Host "Remote has changes. Attempting to force push (if safe)..." -ForegroundColor Yellow
                Write-Host "Note: This will overwrite remote changes. Use with caution." -ForegroundColor Yellow
                
                # Ask user if they want to force push (for automation, we'll skip force push)
                Write-Host "Skipping force push for safety. Please resolve conflicts manually." -ForegroundColor Yellow
            }
            
            # Try to get the current branch name if main failed
            if (-not $pushSuccess) {
                $currentBranch = git branch --show-current 2>&1
                if ($currentBranch -and $currentBranch -ne "main") {
                    Write-Host "Trying to push to branch: $currentBranch" -ForegroundColor Yellow
                    $pushOutput = git push origin $currentBranch 2>&1
                    $pushSuccess = $LASTEXITCODE -eq 0
                }
            }
        }
        
        if ($pushSuccess) {
            Write-Host "Pushed to GitHub successfully!" -ForegroundColor Green
            
            # Update progress
            $filesPushed += $filesAdded
            $time = Get-Date -Format "HH:mm:ss"
            $progressContent = @"
LastPushDate: $today
LastPushTime: $time
LastPushSuccess: true
DayNumber: $dayNumber
TotalDays: 30
FilesPushed: $filesPushed
TotalFiles: $totalFiles
"@
            Set-Content -Path $progressFile -Value $progressContent -Encoding UTF8
            
            Write-Host ""
            Write-Host "Statistics:" -ForegroundColor Cyan
            Write-Host "   - Date: $today" -ForegroundColor White
            Write-Host "   - Day: $dayNumber of 30" -ForegroundColor White
            Write-Host "   - Files added: $filesAdded" -ForegroundColor White
            Write-Host "   - Total files pushed: $filesPushed of $totalFiles" -ForegroundColor White
            Write-Host "   - Progress: $([math]::Round(($dayNumber/30)*100, 1))%" -ForegroundColor White
        } else {
            Write-Host "Failed to push to GitHub!" -ForegroundColor Red
            Write-Host "Error details:" -ForegroundColor Yellow
            $pushOutput | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
            Write-Host ""
            Write-Host "Note: Commit was created successfully locally." -ForegroundColor Yellow
            Write-Host "You can push manually later with: git push origin main" -ForegroundColor Yellow
            
            # Still update progress since commit was successful
            $filesPushed += $filesAdded
            $time = Get-Date -Format "HH:mm:ss"
            $progressContent = @"
LastPushDate: $today
LastPushTime: $time
LastPushSuccess: false
DayNumber: $dayNumber
TotalDays: 30
FilesPushed: $filesPushed
TotalFiles: $totalFiles
"@
            Set-Content -Path $progressFile -Value $progressContent -Encoding UTF8
            
            Write-Host ""
            Write-Host "Progress updated. You can try pushing manually." -ForegroundColor Cyan
            exit 0
        }
    } else {
        Write-Host "Failed to create commit!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Error: Could not find files for Day $dayNumber" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

