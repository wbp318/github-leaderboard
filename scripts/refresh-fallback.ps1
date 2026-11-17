# A fallback for the daily data refresh, run by Windows on the owner's PC. GitHub's scheduler starts
# refresh.yml late, sometimes not at all, and the workflow's hourly trigger (scripts/refresh-due.mjs)
# leans on that same scheduler. So, from outside GitHub, this checks whether today's refresh (due at
# REFRESH_AT_UTC, 10:23 UTC) has saved its data, and if it hasn't and none is running, it starts one
# with the GitHub CLI, signed in as you (gh auth login; you need write access to the repository).
#
#   powershell -ExecutionPolicy Bypass -File scripts\refresh-fallback.ps1 -Install
#       copies this script to %LOCALAPPDATA%\gh-leaderboard and adds the Windows task
#       "gh-leaderboard refresh fallback": 7:30 a.m., then every 2 hours to 7:30 p.m., or as soon
#       as the PC is next on. No administrator rights needed. Run it again after changing this file.
#   -DryRun   say what it would do, but start nothing
#   -Now      pretend it is this time, to try it out: -Now 2026-11-18T13:30:00Z
#   -Repo     owner/name, for a fork
# Each run adds a line to refresh-fallback.log, next to the installed copy. To remove it:
#   Unregister-ScheduledTask -TaskName "gh-leaderboard refresh fallback"
param([switch]$Install, [switch]$DryRun, [datetime]$Now = [DateTime]::UtcNow, [string]$Repo = 'wbp318/github-leaderboard')
$ErrorActionPreference = 'Stop'
$task = 'gh-leaderboard refresh fallback'

if ($Install) {
  $dir = Join-Path $env:LOCALAPPDATA 'gh-leaderboard'
  New-Item -ItemType Directory -Force $dir | Out-Null
  $copy = Join-Path $dir 'refresh-fallback.ps1'
  Copy-Item -Force $PSCommandPath $copy
  $trigger = New-ScheduledTaskTrigger -Daily -At 7:30am
  $trigger.Repetition = (New-ScheduledTaskTrigger -Once -At 7:30am -RepetitionInterval (New-TimeSpan -Hours 2) -RepetitionDuration (New-TimeSpan -Hours 12)).Repetition
  # conhost --headless keeps a window from flashing up.
  $action = New-ScheduledTaskAction -Execute 'conhost.exe' -Argument "--headless powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$copy`" -Repo $Repo"
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
  Register-ScheduledTask -TaskName $task -Force -Action $action -Trigger $trigger -Settings $settings `
    -Description "Starts $Repo's daily data refresh if GitHub hasn't. Script and log: $dir" | Out-Null
  Write-Output "Installed: the task `"$task`" runs $copy at 7:30 a.m. and every 2 hours to 7:30 p.m."
  exit 0
}

$gh = (Get-Command gh -ErrorAction SilentlyContinue).Source
if (-not $gh) { $gh = 'C:\Program Files\GitHub CLI\gh.exe' }
$log = Join-Path $PSScriptRoot 'refresh-fallback.log'
function Write-Log($m) {
  $line = '{0}  {1}{2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $(if ($DryRun) { '(dry run) ' } else { '' }), $m
  Write-Output $line
  Add-Content -Path $log -Value $line
}
# Keep the log short: the last 500 lines.
if ((Test-Path $log) -and @(Get-Content $log).Count -gt 500) { (Get-Content $log | Select-Object -Last 500) | Set-Content $log }
try {
  # The day's refresh time, as in refresh.yml's REFRESH_AT_UTC, and the latest one at or before now.
  $Now = $Now.ToUniversalTime()
  $due = $Now.Date.AddHours(10).AddMinutes(23)
  if ($due -gt $Now) { $due = $due.AddDays(-1) }
  $raw = & $gh api "repos/$Repo/branches/data" --jq .commit.commit.committer.date
  if ($LASTEXITCODE -ne 0) { throw "gh api failed ($LASTEXITCODE)" }
  $saved = [DateTime]::Parse("$raw".Trim(), [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AdjustToUniversal)
  $what = "data saved $($saved.ToString('yyyy-MM-dd HH:mm')) UTC, refresh due $($due.ToString('yyyy-MM-dd HH:mm')) UTC"
  if ($saved -ge $due) { Write-Log "OK: $what. Nothing to do."; exit 0 }
  # A refresh already going (GitHub's own, late, or one started by hand) is left to finish.
  $runs = (& $gh run list --repo $Repo --workflow refresh.yml --limit 50 --json status,event) | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw "gh run list failed ($LASTEXITCODE)" }
  $going = @($runs | Where-Object { $_.status -ne 'completed' -and $_.event -in 'schedule', 'workflow_dispatch' }).Count
  if ($going -gt 0) { Write-Log "WAIT: $what, but a refresh is already running."; exit 0 }
  if (-not $DryRun) {
    & $gh workflow run refresh.yml --repo $Repo -f collect=true
    if ($LASTEXITCODE -ne 0) { throw "gh workflow run failed ($LASTEXITCODE)" }
  }
  Write-Log "STARTED: $what, and none running, so a refresh was started."
} catch {
  Write-Log "ERROR: $_"
  exit 1
}
