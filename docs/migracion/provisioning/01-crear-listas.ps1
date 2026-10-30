# =============================================================================
# 01-crear-listas.ps1
# Provisioning idempotente del sitio SharePoint para "Discontinuados Corporativos"
#
# Prereqs:
#   - PnP.PowerShell >= 2.x instalado: Install-Module PnP.PowerShell
#   - Cuenta con permisos de Administrador de Sitio sobre $SiteUrl
#   - Los grupos Entra ID SG-Discontinuados-* deben existir previamente
#
# Uso:
#   .\01-crear-listas.ps1 -SiteUrl "https://<tenant>.sharepoint.com/sites/discontinuados-corp"
#
# El script es idempotente: si una lista o columna ya existe, no la recrea.
# =============================================================================

param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl,

    [string]$GroupPrefix = "SG-Discontinuados"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# 0. Conexión
# ---------------------------------------------------------------------------
Write-Host "Conectando a $SiteUrl ..." -ForegroundColor Cyan
Connect-PnPOnline -Url $SiteUrl -Interactive

# ---------------------------------------------------------------------------
# Helper: crear columna solo si no existe
# ---------------------------------------------------------------------------
function Add-ColumnIfNotExists {
    param(
        [string]$ListName,
        [string]$InternalName,
        [string]$DisplayName,
        [string]$Type,           # Text | Note | Number | Boolean | DateTime | Choice | Lookup | User | Currency
        [bool]  $Required = $false,
        [string]$DefaultValue = $null,
        [string[]]$Choices = @(),
        [string]$LookupList = $null,
        [string]$LookupField = "Title",
        [bool]  $AddToDefaultView = $true
    )

    $existing = Get-PnPField -List $ListName -Identity $InternalName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  [OK] Columna '$InternalName' ya existe en '$ListName'" -ForegroundColor DarkGray
        return
    }

    $params = @{
        List        = $ListName
        InternalName= $InternalName
        DisplayName = $DisplayName
        Type        = $Type
        Required    = $Required
        AddToDefaultView = $AddToDefaultView
    }
    if ($DefaultValue)      { $params['DefaultValue'] = $DefaultValue }
    if ($Choices.Count -gt 0) { $params['Choices'] = $Choices }
    if ($LookupList) {
        $params['LookupList'] = $LookupList
        $params['LookupField'] = $LookupField
    }

    Add-PnPField @params | Out-Null
    Write-Host "  [+] Columna '$InternalName' creada en '$ListName'" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Helper: crear índice si no existe
# ---------------------------------------------------------------------------
function Add-IndexIfNotExists {
    param(
        [string]$ListName,
        [string]$FieldName
    )
    $list   = Get-PnPList -Identity $ListName
    $field  = Get-PnPField -List $ListName -Identity $FieldName -ErrorAction SilentlyContinue
    if (-not $field) { Write-Warning "Campo '$FieldName' no encontrado en '$ListName'"; return }
    if ($field.Indexed) {
        Write-Host "  [OK] Índice '$FieldName' ya existe en '$ListName'" -ForegroundColor DarkGray
        return
    }
    $field.Indexed = $true
    $field.Update()
    Invoke-PnPQuery
    Write-Host "  [+] Índice '$FieldName' creado en '$ListName'" -ForegroundColor Green
}

# ---------------------------------------------------------------------------
# Helper: crear lista si no existe
# ---------------------------------------------------------------------------
function New-ListIfNotExists {
    param(
        [string]$InternalName,
        [string]$Title,
        [string]$Template = "GenericList"
    )
    $existing = Get-PnPList -Identity $InternalName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "[OK] Lista '$InternalName' ya existe" -ForegroundColor DarkGray
        return $existing
    }
    $list = New-PnPList -Title $Title -Url "lists/$InternalName" -Template $Template
    Write-Host "[+] Lista '$InternalName' creada" -ForegroundColor Green
    return $list
}

# ---------------------------------------------------------------------------
# Helper: asignar nivel de permiso a un grupo en una lista
# ---------------------------------------------------------------------------
function Set-ListPermission {
    param(
        [string]$ListName,
        [string]$GroupName,
        [string]$PermissionLevel
    )
    try {
        Set-PnPListPermission -Identity $ListName -Group $GroupName -AddRole $PermissionLevel
        Write-Host "  [+] Permiso '$PermissionLevel' asignado a '$GroupName' en '$ListName'" -ForegroundColor Green
    }
    catch {
        Write-Warning "  Error asignando permiso a $GroupName en $ListName : $_"
    }
}

# ---------------------------------------------------------------------------
# 1. Niveles de permiso personalizados
# ---------------------------------------------------------------------------
Write-Host "`n=== 1. Niveles de permiso personalizados ===" -ForegroundColor Yellow

# "Contribuir sin eliminar"
$contribSinElim = Get-PnPRoleDefinition -Identity "Contribuir sin eliminar" -ErrorAction SilentlyContinue
if (-not $contribSinElim) {
    # Copiar definición "Contribuir" y quitar DeleteListItems + DeleteVersions
    Add-PnPRoleDefinition `
        -RoleName "Contribuir sin eliminar" `
        -Description "Puede agregar y editar ítems, pero no eliminarlos." `
        -Clone "Contribuir" `
        -Exclude DeleteListItems,DeleteVersions
    Write-Host "[+] Nivel 'Contribuir sin eliminar' creado" -ForegroundColor Green
}
else {
    Write-Host "[OK] Nivel 'Contribuir sin eliminar' ya existe" -ForegroundColor DarkGray
}

# "Solo agregar" (append-only, para lista Actividades)
$soloAgregar = Get-PnPRoleDefinition -Identity "Solo agregar" -ErrorAction SilentlyContinue
if (-not $soloAgregar) {
    Add-PnPRoleDefinition `
        -RoleName "Solo agregar" `
        -Description "Solo puede agregar ítems nuevos. No puede editar ni eliminar." `
        -Clone "Contribuir" `
        -Exclude EditListItems,DeleteListItems,DeleteVersions
    Write-Host "[+] Nivel 'Solo agregar' creado" -ForegroundColor Green
}
else {
    Write-Host "[OK] Nivel 'Solo agregar' ya existe" -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------------
# 2. Listas de catálogo
# ---------------------------------------------------------------------------
Write-Host "`n=== 2. Catálogo: Cias ===" -ForegroundColor Yellow

New-ListIfNotExists -InternalName "Cias" -Title "Compañías"
# Title ya existe como columna por defecto en GenericList
Set-PnPField -List "Cias" -Identity "Title" -Values @{ Title = "Código Cía" } | Out-Null

Add-ColumnIfNotExists -ListName "Cias" -InternalName "NombreCompleto" -DisplayName "Nombre completo" -Type "Text"
Add-ColumnIfNotExists -ListName "Cias" -InternalName "Activa" -DisplayName "Activa" -Type "Boolean" -DefaultValue "1"

# Catálogo: rompe herencia y asigna lectura a todos
$ctx = Get-PnPContext
$list = Get-PnPList -Identity "Cias"
$list.BreakRoleInheritance($true, $false)
$list.Update()
Invoke-PnPQuery
Write-Host "[+] Herencia rota en lista Cias" -ForegroundColor Green

Set-ListPermission -ListName "Cias" -GroupName "$GroupPrefix-Admin"   -PermissionLevel "Control total"
Set-ListPermission -ListName "Cias" -GroupName "$GroupPrefix-Editor"  -PermissionLevel "Leer"
Set-ListPermission -ListName "Cias" -GroupName "$GroupPrefix-Planta"  -PermissionLevel "Leer"
Set-ListPermission -ListName "Cias" -GroupName "$GroupPrefix-Viewers" -PermissionLevel "Leer"

Write-Host "`n=== 2b. Catálogo: Fabricantes ===" -ForegroundColor Yellow
New-ListIfNotExists -InternalName "Fabricantes" -Title "Fabricantes"
Set-PnPField -List "Fabricantes" -Identity "Title" -Values @{ Title = "Código Fabricante" } | Out-Null
Add-ColumnIfNotExists -ListName "Fabricantes" -InternalName "NombreCompleto" -DisplayName "Nombre completo" -Type "Text"
Add-ColumnIfNotExists -ListName "Fabricantes" -InternalName "Pais" -DisplayName "País" -Type "Text"
Add-ColumnIfNotExists -ListName "Fabricantes" -InternalName "Activo" -DisplayName "Activo" -Type "Boolean" -DefaultValue "1"

$list = Get-PnPList -Identity "Fabricantes"
$list.BreakRoleInheritance($true, $false)
$list.Update()
Invoke-PnPQuery
Set-ListPermission -ListName "Fabricantes" -GroupName "$GroupPrefix-Admin"   -PermissionLevel "Control total"
Set-ListPermission -ListName "Fabricantes" -GroupName "$GroupPrefix-Editor"  -PermissionLevel "Leer"
Set-ListPermission -ListName "Fabricantes" -GroupName "$GroupPrefix-Planta"  -PermissionLevel "Leer"
Set-ListPermission -ListName "Fabricantes" -GroupName "$GroupPrefix-Viewers" -PermissionLevel "Leer"

Write-Host "`n=== 2c. Catálogo: BUs ===" -ForegroundColor Yellow
New-ListIfNotExists -InternalName "BUs" -Title "Unidades de Negocio"
Set-PnPField -List "BUs" -Identity "Title" -Values @{ Title = "Código BU" } | Out-Null
Add-ColumnIfNotExists -ListName "BUs" -InternalName "NombreCompleto" -DisplayName "Nombre completo" -Type "Text"
Add-ColumnIfNotExists -ListName "BUs" -InternalName "Activa" -DisplayName "Activa" -Type "Boolean" -DefaultValue "1"

$list = Get-PnPList -Identity "BUs"
$list.BreakRoleInheritance($true, $false)
$list.Update()
Invoke-PnPQuery
Set-ListPermission -ListName "BUs" -GroupName "$GroupPrefix-Admin"   -PermissionLevel "Control total"
Set-ListPermission -ListName "BUs" -GroupName "$GroupPrefix-Editor"  -PermissionLevel "Leer"
Set-ListPermission -ListName "BUs" -GroupName "$GroupPrefix-Planta"  -PermissionLevel "Leer"
Set-ListPermission -ListName "BUs" -GroupName "$GroupPrefix-Viewers" -PermissionLevel "Leer"

# ---------------------------------------------------------------------------
# 3. HitosTemplate
# ---------------------------------------------------------------------------
Write-Host "`n=== 3. Catálogo: HitosTemplate ===" -ForegroundColor Yellow
New-ListIfNotExists -InternalName "HitosTemplate" -Title "Plantilla de Hitos"
Set-PnPField -List "HitosTemplate" -Identity "Title" -Values @{ Title = "Nombre del hito" } | Out-Null

Add-ColumnIfNotExists -ListName "HitosTemplate" -InternalName "Etapa" -DisplayName "Etapa" -Type "Number" -Required $true
Add-ColumnIfNotExists -ListName "HitosTemplate" -InternalName "Orden" -DisplayName "Orden" -Type "Number" -Required $true
Add-ColumnIfNotExists -ListName "HitosTemplate" -InternalName "ResponsableDefault" -DisplayName "Responsable por defecto" -Type "Text"
Add-ColumnIfNotExists -ListName "HitosTemplate" -InternalName "TieneNotas" -DisplayName "Tiene campo Notas" -Type "Boolean" -DefaultValue "0"
Add-ColumnIfNotExists -ListName "HitosTemplate" -InternalName "TieneCostos" -DisplayName "Tiene campos de costo" -Type "Boolean" -DefaultValue "0"
Add-ColumnIfNotExists -ListName "HitosTemplate" -InternalName "TieneImpactoGranel" -DisplayName "Tiene campos de granel" -Type "Boolean" -DefaultValue "0"
Add-ColumnIfNotExists -ListName "HitosTemplate" -InternalName "TieneFechaOC" -DisplayName "Tiene fecha de OC" -Type "Boolean" -DefaultValue "0"

$list = Get-PnPList -Identity "HitosTemplate"
$list.BreakRoleInheritance($true, $false)
$list.Update()
Invoke-PnPQuery
Set-ListPermission -ListName "HitosTemplate" -GroupName "$GroupPrefix-Admin"   -PermissionLevel "Control total"
Set-ListPermission -ListName "HitosTemplate" -GroupName "$GroupPrefix-Editor"  -PermissionLevel "Leer"
Set-ListPermission -ListName "HitosTemplate" -GroupName "$GroupPrefix-Planta"  -PermissionLevel "Leer"
Set-ListPermission -ListName "HitosTemplate" -GroupName "$GroupPrefix-Viewers" -PermissionLevel "Leer"

# ---------------------------------------------------------------------------
# 4. Lista: Discontinuados (transaccional)
# ---------------------------------------------------------------------------
Write-Host "`n=== 4. Lista transaccional: Discontinuados ===" -ForegroundColor Yellow
New-ListIfNotExists -InternalName "Discontinuados" -Title "Discontinuados"
Set-PnPField -List "Discontinuados" -Identity "Title" -Values @{ Title = "ID Proceso" } | Out-Null

Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "CodigoSKU"      -DisplayName "Código SKU"            -Type "Text"
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "NombreProducto" -DisplayName "Descripción del producto" -Type "Text"    -Required $true
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "Cia"            -DisplayName "Compañía"              -Type "Lookup"  -Required $true -LookupList "Cias"
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "Fabricante"     -DisplayName "Fabricante / Planta"   -Type "Lookup"  -Required $true -LookupList "Fabricantes"
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "BU"             -DisplayName "Business Unit"         -Type "Lookup"  -Required $true -LookupList "BUs"
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "MPH"            -DisplayName "MPH"                   -Type "Text"
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "LevantadoDesdePlanta" -DisplayName "¿Levantado desde planta?" -Type "Choice" `
    -Choices @("Sí", "No", "No especificado") -DefaultValue "No especificado"
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "Observaciones"  -DisplayName "Observaciones"         -Type "Note"
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "EtapaActual"    -DisplayName "Etapa actual"          -Type "Number"  -Required $true -DefaultValue "0"
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "Progreso"       -DisplayName "Progreso (%)"          -Type "Number"  -DefaultValue "0"
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "UltimoHito"     -DisplayName "Último hito completado" -Type "Text"   -DefaultValue "Inicio proceso"
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "FechaUltimoHito" -DisplayName "Fecha último hito"   -Type "DateTime"
Add-ColumnIfNotExists -ListName "Discontinuados" -InternalName "FechaInicio"    -DisplayName "Fecha de inicio"       -Type "DateTime" -Required $true

# Columna calculada EtapaLabel
$etapaLabelExists = Get-PnPField -List "Discontinuados" -Identity "EtapaLabel" -ErrorAction SilentlyContinue
if (-not $etapaLabelExists) {
    Add-PnPField -List "Discontinuados" -InternalName "EtapaLabel" -DisplayName "Etapa (texto)" `
        -Type "Calculated" -Formula '=CHOOSE([EtapaActual]+1,"Detección","Análisis","Confirmación")' `
        -ResultType "Text" | Out-Null
    Write-Host "  [+] Columna calculada 'EtapaLabel' creada" -ForegroundColor Green
}

# Índices
Write-Host "  Creando índices en Discontinuados..." -ForegroundColor Cyan
Add-IndexIfNotExists -ListName "Discontinuados" -FieldName "Title"
Add-IndexIfNotExists -ListName "Discontinuados" -FieldName "CodigoSKU"
Add-IndexIfNotExists -ListName "Discontinuados" -FieldName "Cia"
Add-IndexIfNotExists -ListName "Discontinuados" -FieldName "Fabricante"
Add-IndexIfNotExists -ListName "Discontinuados" -FieldName "BU"
Add-IndexIfNotExists -ListName "Discontinuados" -FieldName "EtapaActual"
Add-IndexIfNotExists -ListName "Discontinuados" -FieldName "FechaInicio"

# Versiones
$list = Get-PnPList -Identity "Discontinuados"
$list.EnableVersioning = $true
$list.MajorVersionLimit = 500
$list.EnableAttachments = $false
$list.Update()
Invoke-PnPQuery
Write-Host "  [+] Versiones habilitadas en Discontinuados (máx. 500)" -ForegroundColor Green

# Validaciones de columna (EtapaActual y Progreso)
# Se aplican via REST ya que PnP no tiene cmdlet directo para column validation
$headers = @{
    "Accept" = "application/json;odata=verbose"
    "Content-Type" = "application/json;odata=verbose"
    "X-RequestDigest" = (Get-PnPRequestDigest)
}

# ---------------------------------------------------------------------------
# 5. Lista: Hitos (transaccional)
# ---------------------------------------------------------------------------
Write-Host "`n=== 5. Lista transaccional: Hitos ===" -ForegroundColor Yellow
New-ListIfNotExists -InternalName "Hitos" -Title "Hitos"
Set-PnPField -List "Hitos" -Identity "Title" -Values @{ Title = "ID Hito" } | Out-Null

Add-ColumnIfNotExists -ListName "Hitos" -InternalName "Producto"         -DisplayName "Producto"              -Type "Lookup"  -Required $true -LookupList "Discontinuados"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "Etapa"            -DisplayName "Etapa"                 -Type "Number"  -Required $true
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "Label"            -DisplayName "Nombre del hito"       -Type "Choice"  -Required $true `
    -Choices @(
        "Detección del SKU a discontinuar",
        "Presentación de Presupuesto Anual",
        "Análisis de Template de Discontinuación",
        "Aviso a Supply Corp y S&OP Global",
        "Inventario PT",
        "Notificación a Mkt Corp y Aviso a Planta",
        "Análisis de impacto planta",
        "Costo destrucción PT",
        "Costo destrucción materiales",
        "Costo inventario API",
        "Productos en cola de producción",
        "Última OC",
        "Confirmación con Mkt Corp",
        "Notificación a todos los departamentos",
        "Inactivación del código en sistema",
        "Plan de desagote de inventario"
    )
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "Responsable"      -DisplayName "Área responsable"      -Type "Text"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "Done"             -DisplayName "Completado"            -Type "Boolean" -DefaultValue "0"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "FechaCompromiso"  -DisplayName "Fecha compromiso"      -Type "DateTime"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "FechaReal"        -DisplayName "Fecha real"            -Type "DateTime"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "Notas"            -DisplayName "Notas"                 -Type "Note"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "OfreceUnidades"   -DisplayName "Ofrece unidades"       -Type "Text"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "ImpactoGranelLleva" -DisplayName "¿Lleva granel?"     -Type "Choice" -Choices @("Sí","No","N/A")
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "ImpactoGranelValor" -DisplayName "Valor impacto granel" -Type "Currency"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "ResolucionFinal"  -DisplayName "Resolución final"      -Type "Note"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "ValorItem"        -DisplayName "Costo unitario"        -Type "Currency"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "ValorInventario"  -DisplayName "Valor de inventario"   -Type "Currency"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "FechaUltimaOC"   -DisplayName "Fecha última OC"        -Type "DateTime"
Add-ColumnIfNotExists -ListName "Hitos" -InternalName "Orden"            -DisplayName "Orden"                 -Type "Number"  -Required $true

# Índices
Add-IndexIfNotExists -ListName "Hitos" -FieldName "Producto"
Add-IndexIfNotExists -ListName "Hitos" -FieldName "Etapa"
Add-IndexIfNotExists -ListName "Hitos" -FieldName "Label"
Add-IndexIfNotExists -ListName "Hitos" -FieldName "Done"

# Versiones
$list = Get-PnPList -Identity "Hitos"
$list.EnableVersioning = $true
$list.MajorVersionLimit = 100
$list.EnableAttachments = $false
$list.Update()
Invoke-PnPQuery

# ---------------------------------------------------------------------------
# 6. Lista: Actividades (log append-only)
# ---------------------------------------------------------------------------
Write-Host "`n=== 6. Lista transaccional: Actividades ===" -ForegroundColor Yellow
New-ListIfNotExists -InternalName "Actividades" -Title "Actividades"
Set-PnPField -List "Actividades" -Identity "Title" -Values @{ Title = "ID Actividad" } | Out-Null

Add-ColumnIfNotExists -ListName "Actividades" -InternalName "Producto"        -DisplayName "Producto"         -Type "Lookup"  -Required $true -LookupList "Discontinuados"
Add-ColumnIfNotExists -ListName "Actividades" -InternalName "Texto"           -DisplayName "Texto"            -Type "Note"    -Required $true
Add-ColumnIfNotExists -ListName "Actividades" -InternalName "FechaActividad"  -DisplayName "Fecha y hora"     -Type "DateTime" -Required $true
Add-ColumnIfNotExists -ListName "Actividades" -InternalName "TipoActividad"   -DisplayName "Tipo"             -Type "Choice" `
    -Choices @("Comentario","Avance de etapa","Sistema","Hito completado") -DefaultValue "Comentario"

# Índices
Add-IndexIfNotExists -ListName "Actividades" -FieldName "Producto"
Add-IndexIfNotExists -ListName "Actividades" -FieldName "FechaActividad"

# Romper herencia y asignar nivel "Solo agregar" a Editors y Planta
$list = Get-PnPList -Identity "Actividades"
$list.BreakRoleInheritance($true, $false)
$list.Update()
Invoke-PnPQuery
Write-Host "[+] Herencia rota en lista Actividades" -ForegroundColor Green

Set-ListPermission -ListName "Actividades" -GroupName "$GroupPrefix-Admin"   -PermissionLevel "Control total"
Set-ListPermission -ListName "Actividades" -GroupName "$GroupPrefix-Editor"  -PermissionLevel "Solo agregar"
Set-ListPermission -ListName "Actividades" -GroupName "$GroupPrefix-Planta"  -PermissionLevel "Solo agregar"
Set-ListPermission -ListName "Actividades" -GroupName "$GroupPrefix-Viewers" -PermissionLevel "Leer"

# Versiones — importante para log de auditoría
$list = Get-PnPList -Identity "Actividades"
$list.EnableVersioning = $true
$list.MajorVersionLimit = 500
$list.EnableAttachments = $false
$list.Update()
Invoke-PnPQuery

# ---------------------------------------------------------------------------
# 7. Resumen final
# ---------------------------------------------------------------------------
Write-Host "`n=== Provisioning completado ===" -ForegroundColor Green
Write-Host @"
Listas creadas/verificadas:
  - Cias
  - Fabricantes
  - BUs
  - HitosTemplate
  - Discontinuados
  - Hitos
  - Actividades

Niveles de permiso personalizados:
  - Contribuir sin eliminar
  - Solo agregar

Próximos pasos:
  1. Poblar los catálogos (Cias, Fabricantes, BUs, HitosTemplate) con datos del seed.
  2. Ejecutar scripts de migración de datos (02-cargar-*.ps1).
  3. Crear los grupos Entra ID SG-Discontinuados-Planta-{Fabricante} para cada planta.
  4. Configurar flujos Power Automate (PA-Discontinuados-*).
  5. Ejecutar script de verificación (05-verificar.ps1).
"@
