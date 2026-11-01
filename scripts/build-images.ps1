# Construit les images sur une machine connectée et les exporte dans une archive
# unique, à transférer vers l'infra isolée. Usage : .\scripts\build-images.ps1 -Tag 1.19.0
param([Parameter(Mandatory = $true)][string]$Tag)

# Pas de "Stop" global : docker écrit sa progression sur stderr, ce que PowerShell 5 prend pour une erreur
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
# Keycloak est fourni par le cluster : son image ne sert qu'au developpement local, on ne la construit pas
$services = "postgres", "backend", "frontend"
$images = $services | ForEach-Object { "apiculteur/${_}:$Tag" }

$env:TAG = $Tag
# La construction du frontend echoue parfois sans raison (npm) : jusqu'a trois essais
foreach ($try in 1..3) {
    docker compose -f "$root\docker-compose.yml" build @services
    if ($LASTEXITCODE -eq 0) { break }
    if ($try -eq 3) { throw "La construction des images a echoue." }
    Write-Host "Construction interrompue, nouvel essai ($($try + 1)/3)..."
}

New-Item -ItemType Directory -Force "$root\dist" | Out-Null
$archive = "$root\dist\apiculteur-images-$Tag.tar"
docker save -o $archive $images
if ($LASTEXITCODE -ne 0) { throw "L'export des images a echoue." }

Write-Host "Archive prete : $archive"
Write-Host "Puis, sans Docker ni acces externe : python scripts/push-images.py <archive> <registre> <namespace>"
Write-Host "(voir Contexte.md)."
