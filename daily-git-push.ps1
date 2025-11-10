# سكريبت الرفع اليومي التلقائي على GitHub
# هذا السكريبت يقوم بعمل commit و push يومي لمدة 30 يوم

param(
    [string]$GitHubRepo = ""
)

# الحصول على مسار المشروع
$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  الرفع اليومي على GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# التحقق من وجود git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ خطأ: هذا المجلد ليس git repository!" -ForegroundColor Red
    Write-Host "قم بتشغيل: git init" -ForegroundColor Yellow
    exit 1
}

# التحقق من وجود remote
$remoteUrl = git remote get-url origin 2>$null
if (-not $remoteUrl) {
    Write-Host "⚠️  لا يوجد remote repository محدد" -ForegroundColor Yellow
    if ($GitHubRepo -eq "") {
        Write-Host "يرجى إضافة remote repository:" -ForegroundColor Yellow
        Write-Host "git remote add origin <YOUR_GITHUB_REPO_URL>" -ForegroundColor Cyan
        exit 1
    } else {
        Write-Host "إضافة remote repository: $GitHubRepo" -ForegroundColor Yellow
        git remote add origin $GitHubRepo
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ فشل إضافة remote repository!" -ForegroundColor Red
            exit 1
        }
    }
}

# إنشاء أو تحديث ملف السجل اليومي
$logFile = "daily-commits-log.md"
$today = Get-Date -Format "yyyy-MM-dd"
$dayNumber = (New-TimeSpan -Start (Get-Date).AddDays(-30) -End (Get-Date)).Days

# قراءة الملف إذا كان موجودًا
$logContent = @"
# سجل الرفع اليومي على GitHub

هذا الملف يتم تحديثه يوميًا كجزء من التحديثات اليومية على GitHub.

"@

if (Test-Path $logFile) {
    $logContent = Get-Content $logFile -Raw -Encoding UTF8
}

# إضافة إدخال جديد
$newEntry = @"

## يوم $today

- **التاريخ**: $today
- **الوقت**: $(Get-Date -Format "HH:mm:ss")
- **اليوم رقم**: $dayNumber من 30

تم تحديث المشروع اليوم بنجاح! ✅

"@

# التحقق من عدم وجود إدخال لهذا اليوم
if ($logContent -notmatch "## يوم $today") {
    $logContent += $newEntry
    Set-Content -Path $logFile -Value $logContent -Encoding UTF8
    Write-Host "✅ تم تحديث ملف السجل اليومي" -ForegroundColor Green
} else {
    Write-Host "ℹ️  تم تحديث السجل اليوم بالفعل" -ForegroundColor Yellow
    # تحديث الوقت فقط
    $logContent = $logContent -replace "(\*\*الوقت\*\*: )\d{2}:\d{2}:\d{2}", "`$1$(Get-Date -Format 'HH:mm:ss')"
    Set-Content -Path $logFile -Value $logContent -Encoding UTF8
}

# التحقق من وجود تغييرات
git add .
$status = git status --porcelain

if ($status) {
    Write-Host ""
    Write-Host "📝 التغييرات المكتشفة:" -ForegroundColor Yellow
    Write-Host $status -ForegroundColor Gray
    Write-Host ""
    
    # عمل commit
    $commitMessage = "تحديث يومي - $today (يوم $dayNumber من 30)"
    Write-Host "💾 عمل commit..." -ForegroundColor Yellow
    git commit -m $commitMessage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ تم عمل commit بنجاح" -ForegroundColor Green
        
        # Push إلى GitHub
        Write-Host "🚀 رفع التغييرات إلى GitHub..." -ForegroundColor Yellow
        git push origin master 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ تم الرفع إلى GitHub بنجاح!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📊 الإحصائيات:" -ForegroundColor Cyan
            Write-Host "   - اليوم: $today" -ForegroundColor White
            Write-Host "   - اليوم رقم: $dayNumber من 30" -ForegroundColor White
            Write-Host "   - رسالة Commit: $commitMessage" -ForegroundColor White
        } else {
            Write-Host "❌ فشل الرفع إلى GitHub!" -ForegroundColor Red
            Write-Host "تحقق من اتصال الإنترنت أو صلاحيات GitHub" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "❌ فشل عمل commit!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "ℹ️  لا توجد تغييرات للرفع" -ForegroundColor Yellow
    Write-Host "   (ربما تم الرفع بالفعل اليوم)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ اكتمل!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

