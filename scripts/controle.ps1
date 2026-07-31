# Orquestrador do Controle Financeiro (backend + frontend)
# Uso: .\controle.ps1            -> inicia e aguarda Ctrl+C
#      .\controle.ps1 parar      -> apenas encerra
#      .\controle.ps1 reiniciar  -> encerra e sobe de novo

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root 'backend'
$FrontendDir = Join-Path $Root 'frontend'
$BackendPort = 3001
$FrontendPort = 5173

function Read-EnvPort {
  $envFile = Join-Path $BackendDir '.env'
  if (-not (Test-Path $envFile)) { return 3001 }
  $line = Get-Content $envFile -ErrorAction SilentlyContinue | Where-Object { $_ -match '^\s*PORT\s*=\s*(\d+)\s*$' } | Select-Object -First 1
  if ($line -match '(\d+)') { return [int]$Matches[1] }
  return 3001
}

function Ensure-EnvFiles {
  $backendExample = Join-Path $BackendDir '.env.example'
  $frontendExample = Join-Path $FrontendDir '.env.example'
  $backendEnv = Join-Path $BackendDir '.env'
  $frontendEnv = Join-Path $FrontendDir '.env'
  if ((Test-Path $backendExample) -and -not (Test-Path $backendEnv)) {
    Copy-Item $backendExample $backendEnv
    Write-Host 'Criado backend\.env a partir do .env.example'
  }
  if ((Test-Path $frontendExample) -and -not (Test-Path $frontendEnv)) {
    Copy-Item $frontendExample $frontendEnv
    Write-Host 'Criado frontend\.env a partir do .env.example'
  }
}

function Stop-PortListeners([int]$Port) {
  $lines = netstat -ano | Select-String ":$Port\s+.*LISTENING"
  foreach ($line in $lines) {
    if ($line.Line -match '\s(\d+)\s*$') {
      $procId = [int]$Matches[1]
      if ($procId -gt 0) {
        Write-Host "  Encerrando PID $procId (porta $Port)..."
        & taskkill /PID $procId /T /F 2>$null | Out-Null
      }
    }
  }
}

function Stop-Services {
  Write-Host 'Parando servicos...'
  & taskkill /FI 'WINDOWTITLE eq Controle Financeiro Backend*' /T /F 2>$null | Out-Null
  & taskkill /FI 'WINDOWTITLE eq Controle Financeiro Frontend*' /T /F 2>$null | Out-Null
  Stop-PortListeners -Port $script:BackendPort
  Stop-PortListeners -Port $FrontendPort
  Start-Sleep -Seconds 1
  Write-Host 'Servicos parados.'
}

function Ensure-Dependencies([string]$Dir) {
  if (-not (Test-Path (Join-Path $Dir 'node_modules'))) {
    Write-Host "Instalando dependencias em $Dir ..."
    Push-Location $Dir
    try { & npm install } finally { Pop-Location }
  }
}

function Start-Services {
  Ensure-EnvFiles
  $script:BackendPort = Read-EnvPort
  Ensure-Dependencies $BackendDir
  Ensure-Dependencies $FrontendDir

  Write-Host "Iniciando backend (porta $($script:BackendPort))..."
  Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/k', 'title Controle Financeiro Backend && npm run dev' `
    -WorkingDirectory $BackendDir

  Start-Sleep -Seconds 2

  Write-Host 'Iniciando frontend (porta 5173)...'
  Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/k', 'title Controle Financeiro Frontend && npm run dev' `
    -WorkingDirectory $FrontendDir

  Write-Host ''
  Write-Host 'Servicos em execucao.'
  Write-Host "  API:  http://localhost:$($script:BackendPort)/api/health"
  Write-Host '  App:  http://localhost:5173'
  Write-Host ''
  Write-Host 'Pressione Ctrl+C para Parar ou Reiniciar.'
}

function Show-InterruptMenu {
  Write-Host ''
  Write-Host '----------------------------------------'
  Write-Host ' Ctrl+C detectado. O que deseja fazer?'
  Write-Host '  [P] Parar os servicos e sair'
  Write-Host '  [R] Reiniciar os servicos'
  Write-Host '  [C] Continuar (manter rodando)'
  Write-Host '----------------------------------------'
  $choice = Read-Host 'Escolha'
  if (-not $choice) { return 'C' }
  return $choice.Trim().ToUpperInvariant()
}

function Wait-WithControlC {
  $script:interrupted = $false
  $handler = [ConsoleCancelEventHandler] {
    param($sender, $e)
    $e.Cancel = $true
    $script:interrupted = $true
  }
  [Console]::add_CancelKeyPress($handler)
  try {
    while ($true) {
      $script:interrupted = $false
      while (-not $script:interrupted) {
        Start-Sleep -Milliseconds 400
      }

      $opt = Show-InterruptMenu
      switch ($opt) {
        'P' {
          Stop-Services
          return
        }
        'R' {
          Stop-Services
          Start-Sleep -Seconds 1
          Start-Services
        }
        default {
          Write-Host 'Continuando. Pressione Ctrl+C novamente para opções.'
        }
      }
    }
  }
  finally {
    [Console]::remove_CancelKeyPress($handler)
  }
}

$script:BackendPort = Read-EnvPort
$mode = if ($args.Count -gt 0) { "$($args[0])".Trim().ToLowerInvariant() } else { 'iniciar' }

switch ($mode) {
  'parar' {
    Stop-Services
  }
  'reiniciar' {
    Stop-Services
    Start-Sleep -Seconds 1
    Start-Services
    Wait-WithControlC
  }
  default {
    # Evita duplicar se ja estiver rodando
    $busy = netstat -ano | Select-String ":$($script:BackendPort)\s+.*LISTENING"
    $busyFront = netstat -ano | Select-String ":$FrontendPort\s+.*LISTENING"
    if ($busy -or $busyFront) {
      Write-Host 'Detectados servicos ja ativos. Reiniciando para unificar o controle...'
      Stop-Services
      Start-Sleep -Seconds 1
    }
    Start-Services
    Wait-WithControlC
  }
}
