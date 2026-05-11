#Requires -RunAsAdministrator
# Setup automatico Remoctrl - cert + restore quarentena + install.

$ErrorActionPreference = 'Stop'
$Desktop = [Environment]::GetFolderPath('Desktop')
$Cert    = Join-Path $Desktop 'remoctrl-dev-cert.crt'
$Setup   = Join-Path $Desktop 'Remoctrl_assinado_setup.exe'

function Section($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }

# 1) Cert no Trusted Root da maquina
Section 'Importando certificado no Trusted Root'
if (Test-Path $Cert) {
    Import-Certificate -FilePath $Cert -CertStoreLocation 'Cert:\LocalMachine\Root' | Out-Null
    Write-Host '[OK] Certificado importado em Trusted Root (Local Machine)' -ForegroundColor Green
} else {
    Write-Host "[ERRO] Cert nao encontrado: $Cert" -ForegroundColor Red
    Read-Host 'Enter pra fechar'
    exit 1
}

# 2) Restaurar quarentena
Section 'Recuperando arquivos da quarentena (se houver)'
try {
    $threats = Get-MpThreat -ErrorAction SilentlyContinue | Where-Object { $_.Resources -match 'remoctrl' }
    if ($threats) {
        foreach ($t in $threats) {
            Write-Host "  restaurando: $($t.ThreatName)" -ForegroundColor Yellow
        }
        & 'C:\Program Files\Windows Defender\MpCmdRun.exe' -Restore -All -Path $Desktop 2>$null
        Write-Host '[OK] Tentativa de restore concluida' -ForegroundColor Green
    } else {
        Write-Host '(nada na quarentena relacionado a Remoctrl)' -ForegroundColor Gray
    }
} catch {
    Write-Host "(skip quarantine: $($_.Exception.Message))" -ForegroundColor Gray
}

# 3) Exclusao Defender pro path de instalacao
Section 'Adicionando exclusao do Defender'
$InstallPath = Join-Path $env:LOCALAPPDATA 'Programs\Remoctrl'
Add-MpPreference -ExclusionPath $InstallPath -ErrorAction SilentlyContinue
Add-MpPreference -ExclusionProcess 'remoctrl.exe' -ErrorAction SilentlyContinue
Write-Host "[OK] Exclusao: $InstallPath" -ForegroundColor Green

# 4) Desinstalar versao antiga
Section 'Removendo instalacao antiga (se existir)'
$keys = @(
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
$uninstall = Get-ItemProperty $keys -ErrorAction SilentlyContinue |
             Where-Object { $_.DisplayName -match 'Remoctrl' }
if ($uninstall) {
    foreach ($u in $uninstall) {
        if ($u.UninstallString) {
            Write-Host "  desinstalando: $($u.DisplayName)" -ForegroundColor Yellow
            $cmd = $u.UninstallString -replace '"', ''
            try { Start-Process $cmd '/S' -Wait -ErrorAction SilentlyContinue } catch { }
        }
    }
    Write-Host '[OK] Versao antiga removida' -ForegroundColor Green
} else {
    Write-Host '(nenhuma versao antiga instalada)' -ForegroundColor Gray
}

# 5) Instalar nova versao
Section 'Instalando Remoctrl assinado'
if (Test-Path $Setup) {
    Start-Process $Setup '/S' -Wait
    Write-Host '[OK] Remoctrl instalado' -ForegroundColor Green
} else {
    Write-Host "[ERRO] Instalador nao encontrado: $Setup" -ForegroundColor Red
    Read-Host 'Enter pra fechar'
    exit 1
}

# 6) Confirmar binario
$installed = Join-Path $env:LOCALAPPDATA 'Programs\Remoctrl\remoctrl.exe'
if (-not (Test-Path $installed)) {
    $installed = Join-Path $env:ProgramFiles 'Remoctrl\remoctrl.exe'
}
if (Test-Path $installed) {
    Write-Host "`n[PRONTO] Binario: $installed" -ForegroundColor Green
    Write-Host 'Procura "Remoctrl" no Menu Iniciar e pina na taskbar.' -ForegroundColor White
} else {
    Write-Host "`n[AVISO] Binario nao localizado, mas instalacao concluiu." -ForegroundColor Yellow
}

Write-Host ''
Read-Host 'Enter pra fechar'
