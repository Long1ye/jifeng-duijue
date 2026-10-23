param([switch]$SmokeTest)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$projectRoot = Split-Path -Parent $PSScriptRoot
$script:gameProcess = $null
$script:stdoutRead = $null
$script:stderrRead = $null
$script:startedAt = $null
$script:phase = 'stopped'
$script:smokeResult = $null
$script:smokeError = $null
$script:urls = New-Object 'System.Collections.Generic.List[string]'

# Separate checkouts may run independently; a checkout owns only its own child process.
$hash = [System.Security.Cryptography.SHA256]::Create()
$identity = ([BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($projectRoot.ToLowerInvariant())))).Replace('-', '').Substring(0, 16)
$hash.Dispose()
$created = $false
$mutex = New-Object System.Threading.Mutex($true, "Local\MidlineLanLauncher-$identity", [ref]$created)
if (-not $created) {
  [System.Windows.Forms.MessageBox]::Show('局域网启动器已经打开，请使用现有窗口。', '疾风对决') | Out-Null
  $mutex.Dispose()
  exit 0
}

$form = New-Object System.Windows.Forms.Form
$form.Text = '疾风对决 · 局域网双人对战'
$form.ClientSize = New-Object System.Drawing.Size(660, 460)
$form.StartPosition = 'CenterScreen'
$form.FormBorderStyle = 'FixedSingle'
$form.MaximizeBox = $false
$form.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 10)
$form.AutoScaleMode = 'Dpi'
$form.Icon = [System.Drawing.SystemIcons]::Application

function Add-Label($text, $x, $y, $width, $height) {
  $label = New-Object System.Windows.Forms.Label
  $label.Text = $text
  $label.SetBounds($x, $y, $width, $height)
  $form.Controls.Add($label)
  return $label
}
function Add-Button($text, $x, $y, $width) {
  $button = New-Object System.Windows.Forms.Button
  $button.Text = $text
  $button.SetBounds($x, $y, $width, 38)
  $form.Controls.Add($button)
  return $button
}

$heading = Add-Label '局域网双人对战' 24 22 600 38
$heading.Font = New-Object System.Drawing.Font('Microsoft YaHei UI', 17)
$subtitle = Add-Label '两台电脑连接同一网络，打开同一个网址即可加入。' 26 68 605 28
$statusLabel = Add-Label '正在准备启动…' 26 112 605 30
$statusLabel.AccessibleName = '服务状态'
$addressLabel = Add-Label '分享给另一位玩家的网址' 26 157 600 26
$addresses = New-Object System.Windows.Forms.ComboBox
$addresses.DropDownStyle = 'DropDownList'
$addresses.SetBounds(26, 187, 606, 32)
$addresses.AccessibleName = '局域网网址'
$form.Controls.Add($addresses)
$copyButton = Add-Button '复制网址' 26 233 140
$openButton = Add-Button '打开游戏' 180 233 140
$startButton = Add-Button '启动服务' 334 233 140
$stopButton = Add-Button '停止服务' 488 233 144
$copyButton.Enabled = $false
$openButton.Enabled = $false
$stopButton.Enabled = $false
$hint = Add-Label "1. 本机与另一台电脑打开上方网址。`r`n2. 一人创建房间，另一人输入房间码，双方准备后开局。`r`n3. 对战期间保持此窗口打开；关闭窗口会停止本机服务。" 26 294 606 84
$feedback = Add-Label '' 26 388 475 42
$logButton = Add-Button '查看日志' 500 390 132
$log = New-Object System.Windows.Forms.TextBox
$log.Multiline = $true
$log.ReadOnly = $true
$log.ScrollBars = 'Vertical'
$log.SetBounds(26, 463, 606, 164)
$log.Font = New-Object System.Drawing.Font('Consolas', 9)
$log.Visible = $false
$log.AccessibleName = '服务日志'
$form.Controls.Add($log)

function Add-Log([string]$line) {
  if ([string]::IsNullOrWhiteSpace($line)) { return }
  $clean = $line -replace '\x1B\[[0-9;]*[A-Za-z]', ''
  $log.AppendText("$clean`r`n")
  if ($log.TextLength -gt 24000) { $log.Text = $log.Text.Substring($log.TextLength - 18000) }
  $log.SelectionStart = $log.TextLength
  $log.ScrollToCaret()
}

function Set-Phase([string]$phase, [string]$message) {
  $script:phase = $phase
  $statusLabel.Text = $message
  $startButton.Enabled = $phase -eq 'stopped' -or $phase -eq 'error'
  $stopButton.Enabled = $phase -eq 'starting' -or $phase -eq 'running'
  $canShare = $phase -eq 'running' -and $addresses.Items.Count -gt 0
  $copyButton.Enabled = $canShare
  $openButton.Enabled = $canShare
}

function Stop-Game {
  if ($script:gameProcess) {
    if (-not $script:gameProcess.HasExited) {
      # Kill only the process tree that this window started, never other Node services.
      $killer = New-Object System.Diagnostics.ProcessStartInfo
      $killer.FileName = Join-Path $env:SystemRoot 'System32\taskkill.exe'
      $killer.Arguments = "/PID $($script:gameProcess.Id) /T /F"
      $killer.UseShellExecute = $false
      $killer.CreateNoWindow = $true
      $killProcess = [System.Diagnostics.Process]::Start($killer)
      $killProcess.WaitForExit(5000) | Out-Null
      $killProcess.Dispose()
      $script:gameProcess.WaitForExit(3000) | Out-Null
    }
    $script:gameProcess.Dispose()
  }
  $script:gameProcess = $null
  $script:stdoutRead = $null
  $script:stderrRead = $null
  $script:urls.Clear()
  $addresses.Items.Clear()
  Set-Phase 'stopped' '服务已停止。点击“启动服务”可重新开始。'
}

function Start-Game {
  if ($script:gameProcess -and -not $script:gameProcess.HasExited) { return }
  try {
    Stop-Game
    $feedback.Text = ''
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $node) { throw '未找到 Node.js。请先安装 Node.js，再重新打开启动器。' }
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules\tsx\package.json'))) {
      throw '游戏依赖尚未安装。请先在项目目录运行 npm install，再打开启动器。'
    }
    # Prefer 5180; busy ports belong to existing services and are left untouched.
    $port = 0
    foreach ($candidate in 5180..5190) {
      $probe = $null
      try {
        $probe = New-Object System.Net.Sockets.TcpListener([Net.IPAddress]::Any, $candidate)
        $probe.Start(); $port = $candidate; break
      } catch { } finally { if ($probe) { $probe.Stop() } }
    }
    if (-not $port) { throw '5180–5190 端口均被占用，请关闭不用的游戏服务后重试。' }
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $node.Source
    $info.Arguments = '--import tsx server/index.ts'
    $info.WorkingDirectory = $projectRoot
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = [Text.Encoding]::UTF8
    $info.StandardErrorEncoding = [Text.Encoding]::UTF8
    $info.EnvironmentVariables['PORT'] = [string]$port
    $info.EnvironmentVariables['NO_COLOR'] = '1'
    $script:gameProcess = [System.Diagnostics.Process]::Start($info)
    $script:stdoutRead = $script:gameProcess.StandardOutput.ReadLineAsync()
    $script:stderrRead = $script:gameProcess.StandardError.ReadLineAsync()
    $script:startedAt = [DateTime]::UtcNow
    Add-Log "启动局域网服务，端口 $port"
    Set-Phase 'starting' '正在启动对战服务，请稍候…'
  } catch {
    $problem = $_.Exception.Message
    Stop-Game
    Add-Log $problem
    Set-Phase 'error' $problem
    if ($SmokeTest) { $script:smokeError = $problem; $form.Close() }
  }
}

function Read-ServiceLine([string]$line) {
  Add-Log $line
  if ($line -match 'http://(?:\d{1,3}\.){3}\d{1,3}:\d+/three\.html\?[^\s]+') {
    $url = $Matches[0]
    if ($url -notmatch '^http://127\.' -and -not $script:urls.Contains($url)) {
      $script:urls.Add($url)
      [void]$addresses.Items.Add($url)
      if ($addresses.SelectedIndex -lt 0) { $addresses.SelectedIndex = 0 }
      Set-Phase 'running' '服务已启动，可以复制网址邀请另一位玩家。'
    }
  }
}

function Test-RunningService {
  $url = [string]$addresses.SelectedItem
  $localUrl = $url -replace 'http://[\d.]+:', 'http://127.0.0.1:'
  $response = Invoke-WebRequest -Uri $localUrl -UseBasicParsing -TimeoutSec 20
  if ($response.StatusCode -ne 200) { throw '游戏页面未成功加载。' }
  $socket = New-Object System.Net.WebSockets.ClientWebSocket
  $cancel = New-Object System.Threading.CancellationTokenSource(10000)
  try {
    $wsUrl = ($localUrl -replace '^http:', 'ws:') -replace '/three\.html\?.*$', '/battle'
    $socket.ConnectAsync([Uri]$wsUrl, $cancel.Token).GetAwaiter().GetResult()
    $payload = [Text.Encoding]::UTF8.GetBytes('{"type":"ping","at":1}')
    $segment = New-Object 'System.ArraySegment[byte]' -ArgumentList @(,$payload)
    $socket.SendAsync($segment, [Net.WebSockets.WebSocketMessageType]::Text, $true, $cancel.Token).GetAwaiter().GetResult()
    $bytes = New-Object byte[] 4096
    $receive = New-Object 'System.ArraySegment[byte]' -ArgumentList @(,$bytes)
    $reply = $socket.ReceiveAsync($receive, $cancel.Token).GetAwaiter().GetResult()
    $message = [Text.Encoding]::UTF8.GetString($bytes, 0, $reply.Count) | ConvertFrom-Json
    if ($message.type -ne 'pong' -or $message.at -ne 1) { throw '对战服务心跳验证失败。' }
  } finally { $socket.Dispose(); $cancel.Dispose() }
  if (-not $copyButton.Enabled -or -not $openButton.Enabled) { throw '启动器按钮未就绪。' }
  $captureDir = Join-Path $projectRoot '.cache\lan-launcher'
  [void][IO.Directory]::CreateDirectory($captureDir)
  $capture = Join-Path $captureDir 'launcher.png'
  $bitmap = New-Object Drawing.Bitmap($form.Width, $form.Height)
  try { $form.DrawToBitmap($bitmap, (New-Object Drawing.Rectangle(0, 0, $form.Width, $form.Height))); $bitmap.Save($capture) }
  finally { $bitmap.Dispose() }
  $script:smokeResult = @{ url = $url; http = 200; websocket = 'pong'; copyEnabled = $copyButton.Enabled; screenshot = $capture; childPid = $script:gameProcess.Id }
}

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 100
$timer.Add_Tick({
  if (-not $script:gameProcess) { return }
  try {
    # Poll asynchronous reads on the UI thread; no blocking ReadLine or background PS runspace.
    foreach ($stream in @('stdout', 'stderr')) {
      for ($i = 0; $i -lt 30; $i++) {
        $task = if ($stream -eq 'stdout') { $script:stdoutRead } else { $script:stderrRead }
        if (-not $task -or -not $task.IsCompleted) { break }
        $line = $task.GetAwaiter().GetResult()
        if ($stream -eq 'stdout') { $script:stdoutRead = $null } else { $script:stderrRead = $null }
        if ($null -eq $line) { break }
        Read-ServiceLine $line
        if ($stream -eq 'stdout') { $script:stdoutRead = $script:gameProcess.StandardOutput.ReadLineAsync() }
        else { $script:stderrRead = $script:gameProcess.StandardError.ReadLineAsync() }
      }
    }
    if ($script:gameProcess.HasExited) {
      $exitCode = $script:gameProcess.ExitCode
      Stop-Game
      Set-Phase 'error' "服务已退出（代码 $exitCode）。点击“查看日志”检查原因。"
      if ($SmokeTest) { throw "服务退出：$exitCode" }
    } elseif ($script:phase -eq 'starting' -and ([DateTime]::UtcNow - $script:startedAt).TotalSeconds -gt 60) {
      Stop-Game
      Set-Phase 'error' '启动超时，或没有可分享的局域网 IPv4 地址。请检查网络与日志。'
      if ($SmokeTest) { throw '启动超时' }
    } elseif ($SmokeTest -and $script:phase -eq 'running') {
      $timer.Stop()
      Test-RunningService
      $form.Close()
    }
  } catch {
    $problem = $_.Exception.Message
    Add-Log $problem
    Stop-Game
    Set-Phase 'error' $problem
    if ($SmokeTest) { $script:smokeError = $problem; $form.Close() }
  }
})

$addresses.Add_SelectedIndexChanged({ $feedback.Text = '' })
$copyButton.Add_Click({
  try { [Windows.Forms.Clipboard]::SetText([string]$addresses.SelectedItem); $feedback.Text = '网址已复制，发送给同一局域网的另一位玩家即可。' }
  catch { $feedback.Text = '剪贴板暂时不可用，请稍后重试。' }
})
$openButton.Add_Click({
  try { Start-Process -FilePath ([string]$addresses.SelectedItem) | Out-Null }
  catch { $feedback.Text = '无法打开浏览器，请复制网址后手动打开。' }
})
$startButton.Add_Click({ Start-Game })
$stopButton.Add_Click({ Stop-Game })
$logButton.Add_Click({
  $log.Visible = -not $log.Visible
  $form.ClientSize = New-Object Drawing.Size(660, $(if ($log.Visible) { 650 } else { 460 }))
  $logButton.Text = if ($log.Visible) { '收起日志' } else { '查看日志' }
})
$form.Add_Shown({ $timer.Start(); Start-Game })
$form.Add_FormClosing({ $timer.Stop(); Stop-Game })
try { [void]$form.ShowDialog() }
finally { $timer.Dispose(); $form.Dispose(); $mutex.ReleaseMutex(); $mutex.Dispose() }
if ($SmokeTest) {
  if ($script:smokeError) { throw $script:smokeError }
  if (-not $script:smokeResult) { throw '启动器未完成验证。' }
  $script:smokeResult['childStopped'] = -not [bool](Get-Process -Id $script:smokeResult.childPid -ErrorAction SilentlyContinue)
  if (-not $script:smokeResult.childStopped) { throw '关闭启动器后服务仍在运行。' }
  $script:smokeResult | ConvertTo-Json -Compress
}

