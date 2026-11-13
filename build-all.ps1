<#
  A multi-target build script for tauri
#>

[CmdLetBinding()]
Param(
  [string]$Version = ""
)

# The name of the product to build
$NAME = 'MOBZTree'

if ($Version -eq "") {
  $version = .\get-toml-setting.ps1 ./src-tauri/Cargo.toml package version
  Write-Output "Building version $Version..."
}

# return

function BuildTarget([string]$Target, [string]$version, [string]$code) {
  [string]$exe = "./src-tauri/target/$Target/release/$($NAME).exe"
  [string]$release = "./releases/$($NAME)_$($code)_$($version)"
  [string]$zip = "$($release).zip"

  # Write-Output "Building $exe $($release).exe $zip"
  # return

  Write-Output "`n`===> Building $code ($Target)...`n"

  &npm run tauri build -- -- --target=$Target
  if (Test-Path "$($release).exe" -PathType Leaf) {
    Write-Warning "Replacing '$($release).exe'"
    Remove-Item "$($release).exe"
  }
  Move-Item $exe "$($release).exe"

  if (Test-Path $zip -PathType Leaf) {
    Write-Warning "Replacing '$zip'"
    Remove-Item $zip
  }
  Compress-Archive "$($release).exe" $zip

  Write-Output "`n`n===> $zip created`n"
}

function BuildTargetWSL([string]$Target, [string]$version, [string]$code) {
  [string]$release = "./releases/$($NAME)_$($code)_$($version)"
  [string]$zip = "$($release).zip"

  [string]$releases = (Resolve-Path "./releases").Path

  Write-Output "`n`===> Building $code ($Target) via WSL...`n"

  &wsl --cd ~/MOBZTree -- bash -c -i "git pull && npm install && npm run tauri build -- -- --target=$Target"
  &wsl --cd ~/MOBZTree -- bash -c "cp ./src-tauri/target/$Target/release/$NAME ``wslpath `"$releases`"``/$($NAME)_$($code)_$($version)"

  if (Test-Path $zip -PathType Leaf) {
    Write-Warning "Replacing '$zip'"
    Remove-Item $zip
  }
  Compress-Archive $release $zip

  Write-Output "`n`n===> $zip created`n"
}

# Windows x64
BuildTarget 'x86_64-pc-windows-msvc' $Version 'win-x64'
# Windows arm64
BuildTarget 'aarch64-pc-windows-msvc' $Version 'win-arm64'

# Linux arm64 via WSL
BuildTargetWSL 'aarch64-unknown-linux-gnu' $Version 'linux-arm64'