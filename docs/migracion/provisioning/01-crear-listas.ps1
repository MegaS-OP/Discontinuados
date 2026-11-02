#Requires -Version 7.2
<#
.SYNOPSIS
    Aprovisiona de forma idempotente las listas de SharePoint de "Discontinuados Corporativos".

.DESCRIPTION
    Lee ../sharepoint-schema.json (fuente única del modelo) y crea, solo si faltan:
      - niveles de permiso personalizados
      - grupos de SharePoint que contienen a los grupos de Entra ID
      - listas, columnas, índices, validaciones y configuración (versiones, adjuntos, seguridad de ítems propios)
      - ruptura de herencia y asignación de grupos por lista
      - (opcional) filas de los catálogos, y el Id de objeto de cada grupo de planta en Fabricantes

    Es seguro volver a ejecutarlo: no rompe la herencia de una lista que ya es única (hacerlo con
    ClearSubscopes borraría los permisos por ítem que asignan los flujos).

    NO crea los grupos de Entra ID (los gestiona IT): ver 00-crear-grupos-entra.ps1.
    NO crea el sitio ni cambia su política de uso compartido: ver docs/migracion/04-seguridad.md.

    ⚠️ ESTADO: escrito contra PnP.PowerShell 2.x, NO ejecutado ni probado contra un tenant.
    Probar primero con -WhatIf y luego en un sitio de desarrollo.

.PARAMETER SiteUrl
    Sitio destino, p. ej. https://contoso.sharepoint.com/sites/discontinuados-corp

.PARAMETER ClientId
    Id de la app registrada en Entra ID para PnP.PowerShell (obligatorio desde PnP.PowerShell 2.x).

.PARAMETER SeedCatalogs
    Carga las filas de Companias, Fabricantes, UnidadesNegocio y HitosCatalogo desde el bloque "seed" del esquema.

.PARAMETER SkipPermissions
    Crea listas y columnas pero no toca permisos (útil para un primer ensayo).

.EXAMPLE
    ./01-crear-listas.ps1 -SiteUrl https://contoso.sharepoint.com/sites/discontinuados-corp -ClientId <guid> -WhatIf

.EXAMPLE
    ./01-crear-listas.ps1 -SiteUrl https://contoso.sharepoint.com/sites/discontinuados-corp -ClientId <guid> -SeedCatalogs
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [Parameter(Mandatory = $true)][string]$SiteUrl,
    [Parameter(Mandatory = $true)][string]$ClientId,
    [string]$SchemaPath = (Join-Path $PSScriptRoot '..' 'sharepoint-schema.json'),
    [switch]$SeedCatalogs,
    [switch]$SkipPermissions
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

# ───────────────────────── utilidades ─────────────────────────
function Write-Step([string]$Message) { Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-Skip([string]$Message) { Write-Host "    = $Message (ya existe)" -ForegroundColor DarkGray }

function Get-Prop {
    param($Object, [string]$Name)
    $p = $Object.PSObject.Properties[$Name]
    if ($null -eq $p) { return $null }
    return $p.Value
}

function Invoke-Change {
    [CmdletBinding(SupportsShouldProcess = $true)]
    param([string]$Target, [string]$Action, [scriptblock]$Script)
    if ($PSCmdlet.ShouldProcess($Target, $Action)) { & $Script }
}

function ConvertTo-XmlText([string]$Text) { return [System.Security.SecurityElement]::Escape($Text) }

function Get-EntraGroupObjectId {
    param([string]$DisplayName)
    $g = $null
    if (Get-Command Get-PnPEntraIDGroup -ErrorAction SilentlyContinue) {
        $g = Get-PnPEntraIDGroup -Identity $DisplayName -ErrorAction SilentlyContinue
    }
    elseif (Get-Command Get-PnPAzureADGroup -ErrorAction SilentlyContinue) {
        $g = Get-PnPAzureADGroup -Identity $DisplayName -ErrorAction SilentlyContinue
    }
    if ($null -eq $g) { return $null }
    return [string]$g.Id
}

# ───────────────────────── XML de columnas ─────────────────────────
function New-FieldXml {
    param($Column, [hashtable]$ListIds)

    $name = $Column.internalName
    $attr = [System.Collections.Generic.List[string]]::new()
    $attr.Add("Name=`"$name`"")
    $attr.Add("StaticName=`"$name`"")
    $attr.Add("DisplayName=`"$(ConvertTo-XmlText $Column.displayName)`"")
    if ($Column.required) { $attr.Add('Required="TRUE"') }
    if ($Column.indexed) { $attr.Add('Indexed="TRUE"') }
    if ($Column.unique) { $attr.Add('EnforceUniqueValues="TRUE"') }
    $description = Get-Prop $Column 'description'
    if ($description) { $attr.Add("Description=`"$(ConvertTo-XmlText $description)`"") }

    $inner = ''
    $default = $Column.default
    $defaultFormula = Get-Prop $Column 'defaultFormula'

    switch ($Column.type) {
        'Text' {
            $attr.Add('Type="Text"')
            $max = Get-Prop $Column 'maxLength'
            if ($max) { $attr.Add("MaxLength=`"$max`"") }
            if ($null -ne $default) { $inner += "<Default>$(ConvertTo-XmlText ([string]$default))</Default>" }
        }
        'Note' {
            $attr.Add('Type="Note"'); $attr.Add('NumLines="6"'); $attr.Add('RichText="FALSE"')
        }
        'Number' {
            $attr.Add('Type="Number"')
            $min = Get-Prop $Column 'min'; $max = Get-Prop $Column 'max'; $dec = Get-Prop $Column 'decimals'
            if ($null -ne $min) { $attr.Add("Min=`"$min`"") }
            if ($null -ne $max) { $attr.Add("Max=`"$max`"") }
            if ($null -ne $dec) { $attr.Add("Decimals=`"$dec`"") }
            if ($null -ne $default) { $inner += "<Default>$default</Default>" }
        }
        'Boolean' {
            $attr.Add('Type="Boolean"')
            $bool = if ($default -eq $true) { 1 } else { 0 }
            $inner += "<Default>$bool</Default>"
        }
        'Choice' {
            $attr.Add('Type="Choice"'); $attr.Add('Format="Dropdown"')
            $choices = (Get-Prop $Column 'choices') | ForEach-Object { "<CHOICE>$(ConvertTo-XmlText $_)</CHOICE>" }
            $inner += "<CHOICES>$($choices -join '')</CHOICES>"
            if ($null -ne $default) { $inner += "<Default>$(ConvertTo-XmlText ([string]$default))</Default>" }
        }
        'DateTime' {
            $attr.Add('Type="DateTime"')
            $attr.Add("Format=`"$(Get-Prop $Column 'format')`"")
            if ($defaultFormula) { $inner += "<DefaultFormula>$(ConvertTo-XmlText $defaultFormula)</DefaultFormula>" }
        }
        'Lookup' {
            $target = $Column.lookup.list
            if (-not $ListIds.ContainsKey($target)) { throw "La lista destino '$target' de '$name' no existe todavía." }
            $attr.Add('Type="Lookup"')
            $attr.Add("List=`"{$($ListIds[$target])}`"")
            $attr.Add("ShowField=`"$($Column.lookup.showField)`"")
            $attr.Add("RelationshipDeleteBehavior=`"$($Column.lookup.onDelete)`"")
        }
        'Calculated' {
            $attr.Add('Type="Calculated"'); $attr.Add("ResultType=`"$(Get-Prop $Column 'resultType')`"")
            $attr.Add('ReadOnly="TRUE"')
            $refs = (Get-Prop $Column 'fieldRefs') | ForEach-Object { "<FieldRef Name=`"$_`"/>" }
            $inner += "<Formula>$(ConvertTo-XmlText (Get-Prop $Column 'formula'))</Formula><FieldRefs>$($refs -join '')</FieldRefs>"
        }
        default { throw "Tipo de columna no soportado: $($Column.type) ($name)" }
    }
    return "<Field $($attr -join ' ')>$inner</Field>"
}

# ───────────────────────── inicio ─────────────────────────
if (-not (Test-Path $SchemaPath)) { throw "No se encuentra el esquema: $SchemaPath" }
$schema = Get-Content -Raw -Encoding utf8 $SchemaPath | ConvertFrom-Json -Depth 20

Write-Step "Conectando a $SiteUrl"
Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId

$spGroupByRole = @{}
$missingEntra = [System.Collections.Generic.List[string]]::new()

# Nombres de nivel de permiso integrados: dependen del idioma del sitio, se resuelven por tipo.
$builtIn = @{}
foreach ($def in (Get-PnPRoleDefinition)) {
    switch ($def.RoleTypeKind.ToString()) {
        'Reader' { $builtIn['Reader'] = $def.Name }
        'Contributor' { $builtIn['Contribute'] = $def.Name }
        'Administrator' { $builtIn['FullControl'] = $def.Name }
    }
}
function Resolve-RoleName([string]$Level) {
    if ($builtIn.ContainsKey($Level)) { return $builtIn[$Level] }
    return $Level
}

# ───────────────────────── 1. niveles de permiso ─────────────────────────
if (-not $SkipPermissions) {
    Write-Step 'Niveles de permiso personalizados'
    foreach ($pl in $schema.permissionLevels) {
        $existing = Get-PnPRoleDefinition -Identity $pl.name -ErrorAction SilentlyContinue
        if ($existing) { Write-Skip $pl.name; continue }
        Invoke-Change -Target $pl.name -Action 'Crear nivel de permiso' -Script {
            Add-PnPRoleDefinition -RoleName $pl.name -Clone (Resolve-RoleName $pl.cloneOf) `
                -Exclude ([string[]]$pl.exclude) -Description $pl.description | Out-Null
        }
    }

    # ───────────────────────── 2. grupos de SharePoint ─────────────────────────
    Write-Step 'Grupos de SharePoint (contenedores de los grupos de Entra ID)'
    function Ensure-SpGroup([string]$Title, [string]$Description) {
        if (Get-PnPGroup -Identity $Title -ErrorAction SilentlyContinue) { Write-Skip $Title; return }
        Invoke-Change -Target $Title -Action 'Crear grupo de SharePoint' -Script {
            New-PnPGroup -Title $Title -Description $Description | Out-Null
        }
    }
    function Ensure-GroupMember([string]$SpGroup, [string]$EntraGroupName) {
        $oid = Get-EntraGroupObjectId -DisplayName $EntraGroupName
        if (-not $oid) { $missingEntra.Add($EntraGroupName); return }
        $login = "c:0t.c|tenant|$oid"
        $members = @(Get-PnPGroupMember -Group $SpGroup -ErrorAction SilentlyContinue | ForEach-Object { $_.LoginName })
        if ($members -contains $login) { return }
        Invoke-Change -Target "$EntraGroupName -> $SpGroup" -Action 'Agregar miembro' -Script {
            Add-PnPGroupMember -LoginName $login -Group $SpGroup
        }
    }

    foreach ($g in $schema.groups.corporativos) {
        $spGroupByRole[$g.role] = $g.spGroup
        Ensure-SpGroup $g.spGroup $g.description
        Ensure-GroupMember $g.spGroup $g.entraGroup
    }
    $plantas = $schema.groups.plantasContenedor
    $spGroupByRole['Plantas'] = $plantas.spGroup
    Ensure-SpGroup $plantas.spGroup $plantas.descripcion
    foreach ($p in $schema.groups.plantas) { Ensure-GroupMember $plantas.spGroup $p.entraGroup }

    # Los propietarios del sitio son los del grupo SG-Discontinuados-Owners.
    $ownersGroup = Get-PnPGroup -AssociatedOwnerGroup
    $ownersEntra = ($schema.groups.corporativos | Where-Object { $_.role -eq 'Owners' }).entraGroup
    Ensure-GroupMember $ownersGroup.Title $ownersEntra
}

# ───────────────────────── 3. listas ─────────────────────────
$listIds = @{}
foreach ($l in $schema.lists) {
    Write-Step "Lista $($l.name)"
    $existingList = Get-PnPList -Identity $l.name -ErrorAction SilentlyContinue
    if ($existingList) { Write-Skip $l.name }
    else {
        Invoke-Change -Target $l.name -Action 'Crear lista' -Script {
            New-PnPList -Title $l.name -Template GenericList -OnQuickLaunch:$true | Out-Null
        }
    }
    $spList = Get-PnPList -Identity $l.name -Includes Id, HasUniqueRoleAssignments -ErrorAction SilentlyContinue
    if ($null -eq $spList) { Write-Warning "Simulación (-WhatIf): se omiten columnas de $($l.name)"; continue }
    $listIds[$l.name] = $spList.Id

    # Columnas
    foreach ($c in $l.columns) {
        $name = $c.internalName
        $field = Get-PnPField -List $l.name -Identity $name -ErrorAction SilentlyContinue
        if ($name -eq 'Title') {
            Invoke-Change -Target "$($l.name).Title" -Action 'Ajustar columna Title' -Script {
                Set-PnPField -List $l.name -Identity 'Title' -Values @{ Title = $c.displayName; Required = [bool]$c.required }
                if ($c.indexed) { Set-PnPField -List $l.name -Identity 'Title' -Values @{ Indexed = $true } }
                if ($c.unique) { Set-PnPField -List $l.name -Identity 'Title' -Values @{ EnforceUniqueValues = $true } }
            }
            continue
        }
        if ($field) {
            if ($c.indexed -and -not $field.Indexed) {
                Invoke-Change -Target "$($l.name).$name" -Action 'Indexar columna' -Script {
                    Set-PnPField -List $l.name -Identity $name -Values @{ Indexed = $true }
                }
            }
            else { Write-Skip "$($l.name).$name" }
            continue
        }
        $xml = New-FieldXml -Column $c -ListIds $listIds
        Invoke-Change -Target "$($l.name).$name" -Action 'Crear columna' -Script {
            Add-PnPFieldFromXml -List $l.name -FieldXml $xml | Out-Null
        }
    }

    # Configuración de la lista (CSOM: versiones, adjuntos, carpetas, seguridad de ítems propios, validación)
    $readSec = if ((Get-Prop $l 'readSecurity') -eq 'Own') { 2 } else { 1 }
    $writeSec = switch (Get-Prop $l 'writeSecurity') { 'Own' { 2 } 'None' { 4 } default { 1 } }
    Invoke-Change -Target $l.name -Action 'Configurar lista' -Script {
        $ctxList = Get-PnPList -Identity $l.name
        $ctxList.Description = $l.purpose
        $ctxList.EnableVersioning = [bool]$l.versioning.enabled
        if ($l.versioning.enabled) { $ctxList.MajorVersionLimit = [int]$l.versioning.majorVersions }
        $ctxList.EnableAttachments = [bool]$l.attachments
        $ctxList.EnableFolderCreation = [bool]$l.folders
        $ctxList.EnableModeration = [bool]$l.contentApproval
        $ctxList.ReadSecurity = $readSec
        $ctxList.WriteSecurity = $writeSec
        $lv = Get-Prop $l 'listValidation'
        if ($lv) { $ctxList.ValidationFormula = $lv.formula; $ctxList.ValidationMessage = $lv.message }
        $ctxList.Update()
        Invoke-PnPQuery
    }

    # Permisos de lista
    if (-not $SkipPermissions) {
        if (-not $spList.HasUniqueRoleAssignments) {
            Invoke-Change -Target $l.name -Action 'Romper herencia (primera vez)' -Script {
                Set-PnPList -Identity $l.name -BreakRoleInheritance -CopyRoleAssignments:$false -ClearSubscopes
            }
        }
        else { Write-Skip "Herencia rota en $($l.name)" }
        foreach ($a in $l.permissions.assignments.PSObject.Properties) {
            $spGroup = $spGroupByRole[$a.Name]
            $role = Resolve-RoleName $a.Value
            Invoke-Change -Target "$($l.name): $spGroup = $role" -Action 'Asignar permiso' -Script {
                Set-PnPListPermission -Identity $l.name -Group $spGroup -AddRole $role
            }
        }
    }
}

# ───────────────────────── 4. catálogos ─────────────────────────
if ($SeedCatalogs) {
    Write-Step 'Carga de catálogos'
    foreach ($entry in $schema.seed.PSObject.Properties) {
        $listName = $entry.Name
        $present = @(Get-PnPListItem -List $listName -Fields 'Title' -PageSize 500 | ForEach-Object { $_['Title'] })
        foreach ($row in $entry.Value) {
            if ($present -contains $row.Title) { continue }
            $values = @{}
            foreach ($p in $row.PSObject.Properties) { $values[$p.Name] = $p.Value }
            Invoke-Change -Target "$listName / $($row.Title)" -Action 'Agregar fila de catálogo' -Script {
                Add-PnPListItem -List $listName -Values $values | Out-Null
            }
        }
    }

    Write-Step 'Id de objeto de los grupos de planta en Fabricantes'
    foreach ($item in (Get-PnPListItem -List 'Fabricantes' -PageSize 500)) {
        $grupo = $item['GrupoEntra']
        if (-not $grupo -or $item['GrupoEntraId']) { continue }
        $oid = Get-EntraGroupObjectId -DisplayName $grupo
        if (-not $oid) { Write-Warning "Grupo Entra inexistente: $grupo"; continue }
        Invoke-Change -Target $grupo -Action 'Guardar GrupoEntraId' -Script {
            Set-PnPListItem -List 'Fabricantes' -Identity $item.Id -Values @{ GrupoEntraId = $oid } | Out-Null
        }
    }
}

if ($missingEntra.Count -gt 0) {
    Write-Warning ("Faltan grupos de Entra ID (créelos con 00-crear-grupos-entra.ps1 y vuelva a ejecutar): " +
        (($missingEntra | Sort-Object -Unique) -join ', '))
}
Write-Step 'Listo.'
