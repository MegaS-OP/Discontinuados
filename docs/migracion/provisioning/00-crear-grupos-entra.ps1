#Requires -Version 7.2
#Requires -Modules Microsoft.Graph.Groups
<#
.SYNOPSIS
    Crea (si faltan) los grupos de seguridad de Entra ID que usa la app. Idempotente.

.DESCRIPTION
    Lee ../sharepoint-schema.json y crea 4 grupos corporativos + 1 grupo por fabricante (35 en total).
    Los grupos NO se llenan: agregar miembros es decisión de IT / del dueño de negocio.
    Requiere el permiso Group.ReadWrite.All (o rol Groups Administrator) en Microsoft Graph.

    ⚠️ ESTADO: NO ejecutado ni probado contra un tenant. Probar con -WhatIf.

.EXAMPLE
    ./00-crear-grupos-entra.ps1 -WhatIf
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$SchemaPath = (Join-Path $PSScriptRoot '..' 'sharepoint-schema.json')
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$schema = Get-Content -Raw -Encoding utf8 $SchemaPath | ConvertFrom-Json -Depth 20
Connect-MgGraph -Scopes 'Group.ReadWrite.All' -NoWelcome

$wanted = @()
foreach ($g in $schema.groups.corporativos) { $wanted += [pscustomobject]@{ Name = $g.entraGroup; Description = $g.description } }
foreach ($p in $schema.groups.plantas) {
    $wanted += [pscustomobject]@{ Name = $p.entraGroup; Description = "Usuarios de la planta/fabricante '$($p.fabricante)'. Ven solo los productos de su fabricante." }
}

foreach ($w in $wanted) {
    $safeName = $w.Name.Replace("'", "''")
    $existing = Get-MgGroup -Filter "displayName eq '$safeName'" -ConsistencyLevel eventual
    if ($existing) { Write-Host "    = $($w.Name) (ya existe)" -ForegroundColor DarkGray; continue }
    if ($PSCmdlet.ShouldProcess($w.Name, 'Crear grupo de seguridad')) {
        New-MgGroup -DisplayName $w.Name -Description $w.Description `
            -MailEnabled:$false -SecurityEnabled:$true -MailNickname ($w.Name -replace '[^A-Za-z0-9-]', '') | Out-Null
        Write-Host "    + $($w.Name)" -ForegroundColor Green
    }
}
