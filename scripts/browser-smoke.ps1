param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

function Run-AgentBrowser {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  $output = & npx -y agent-browser @Args 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "agent-browser failed for '$($Args -join ' ')':`n$output"
  }
  return ($output -join "`n")
}

function Run-AgentBrowserWithRetry {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  $attempt = 0
  while ($attempt -lt 3) {
    try {
      return Run-AgentBrowser @Args
    } catch {
      $attempt++
      if ($attempt -ge 3) {
        throw
      }
      Start-Sleep -Milliseconds 800
    }
  }
}

function Get-StableUrl {
  for ($i = 0; $i -lt 6; $i++) {
    $current = (Run-AgentBrowser get url).Trim()
    if ($current -and $current -ne "about:blank") {
      return $current
    }
    Start-Sleep -Milliseconds 600
  }
  return "about:blank"
}

try {
  try {
    Run-AgentBrowser close | Out-Null
  } catch {
  }

  Run-AgentBrowserWithRetry open $BaseUrl | Out-Null
  Run-AgentBrowserWithRetry wait 2000 | Out-Null
  $urlAfterRoot = Get-StableUrl
  if ($urlAfterRoot -notmatch "/login$") {
    throw "Expected root to redirect to /login, got: $urlAfterRoot"
  }

  Run-AgentBrowserWithRetry open "$BaseUrl/login" | Out-Null
  Run-AgentBrowserWithRetry wait 2000 | Out-Null
  $loginSnapshot = Run-AgentBrowser snapshot -i
  if ($loginSnapshot -notmatch 'link "Continue"') {
    throw "Login page snapshot check failed."
  }

  Run-AgentBrowserWithRetry open "$BaseUrl/rooms" | Out-Null
  Run-AgentBrowserWithRetry wait 2000 | Out-Null
  $roomsSnapshot = Run-AgentBrowser snapshot -i
  if ($roomsSnapshot -notmatch 'option "Sharing Type \(All\)"') {
    throw "Rooms page snapshot check failed."
  }

  Run-AgentBrowserWithRetry open "$BaseUrl/hostel" | Out-Null
  Run-AgentBrowserWithRetry wait 2000 | Out-Null
  $hostelSnapshot = Run-AgentBrowser snapshot -i
  if ($hostelSnapshot -notmatch 'button "Add Block"') {
    throw "Hostel page snapshot check failed."
  }

  Run-AgentBrowserWithRetry open "$BaseUrl/dashboard" | Out-Null
  Run-AgentBrowserWithRetry wait 2000 | Out-Null
  $dashboardSnapshot = Run-AgentBrowser snapshot -i
  if ($dashboardSnapshot -notmatch "Total Beds") {
    throw "Dashboard page snapshot check failed."
  }

  Write-Host "Browser smoke test passed." -ForegroundColor Green
} finally {
  try {
    Run-AgentBrowser close | Out-Null
  } catch {
  }
}
