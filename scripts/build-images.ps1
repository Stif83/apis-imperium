# Construit les images sur une machine connectée et les exporte dans une archive
# unique, à transférer vers l'infra isolée. Usage : .\scripts\build-images.ps1 -Tag 1.0.0
param([string]$Tag = "1.0.0")

# Pas de "Stop" global : docker écrit sa progression sur stderr, ce que PowerShell 5 prend pour une erreur
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
# Keycloak est fourni par le cluster : son image ne sert qu'au developpement local
$images = "postgres", "backend", "frontend" | ForEach-Object { "apiculteur/${_}:$Tag" }

$env:TAG = $Tag
docker compose -f "$root\docker-compose.yml" build
if ($LASTEXITCODE -ne 0) { throw "La construction des images a echoue." }

New-Item -ItemType Directory -Force "$root\dist" | Out-Null
$archive = "$root\dist\apiculteur-images-$Tag.tar"
docker save -o $archive $images
if ($LASTEXITCODE -ne 0) { throw "L'export des images a echoue." }

Write-Host "Archive prete : $archive"
Write-Host "Puis, sans Docker ni acces externe : python scripts/push-images.py <archive> <registre> <namespace>"
Write-Host "(voir Contexte.md)."
