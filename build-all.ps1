<#
  A multi-target build script for tauri
#>

[CmdLetBinding()]
Param(
  # Target(s) to build. Valid targets are win-x86, win-x64, win-arm64 and linux-arm64
  [string[]]$Target = "all",
  # Optional version number. If not specified, read from Cargo.toml
  [string]$Version = ""
)

# The name of the product to build
$NAME = 'MOBZTree'

if ($Version -eq "") {
  $version = .\get-toml-setting.ps1 ./src-tauri/Cargo.toml package version
}

Write-Output "Building version $Version...`n"

# return

function BuildTarget([string]$Target, [string]$version, [string]$code) {
  [string]$exe = "./src-tauri/target/$Target/release/$($NAME).exe"
  [string]$release = "./releases/$($NAME)_$($code)_$($version)"
  [string]$zip = "$($release).zip"

  # Write-Output "Building $exe $($release).exe $zip"
  # return

  Write-Output "===> Building $code ($Target)..."

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

  Write-Output "`n===> $zip created`n"
}

function BuildTargetMac([string]$Target, [string]$version, [string]$code) {
  [string]$release = "./releases/$($NAME)_$($code)_$($version)"
  [string]$zip = "$($release).zip"

  Write-Output "===> Building $code ($Target) via Mac..."

  # Need zah -l here to force a login shell
  ssh mobzmini.fritz.box "zsh -c -l 'cd ~/Projects/MOBZTree && git pull && npm install && npm run tauri build -- -- --target=$Target'"
  scp "mobzmini.fritz.box:~/Projects/MOBZTree/src-tauri/target/$Target/release/$NAME" $release

  if (Test-Path $zip -PathType Leaf) {
    Write-Warning "Replacing '$zip'"
    Remove-Item $zip
  }
  Compress-Archive $release $zip

  Write-Output "`n===> $zip created`n"
}

function BuildTargetWSL([string]$Target, [string]$version, [string]$code) {
  [string]$release = "./releases/$($NAME)_$($code)_$($version)"
  [string]$zip = "$($release).zip"

  [string]$releases = (Resolve-Path "./releases").Path

  Write-Output "===> Building $code ($Target) via WSL..."

  # Need bash -i here to force an interactive shell
  &wsl --cd ~/MOBZTree -- bash -c -i "git pull && npm install && npm run tauri build -- -- --target=$Target"
  &wsl --cd ~/MOBZTree -- bash -c "cp ./src-tauri/target/$Target/release/$NAME ``wslpath `"$releases`"``/$($NAME)_$($code)_$($version)"

  if (Test-Path $zip -PathType Leaf) {
    Write-Warning "Replacing '$zip'"
    Remove-Item $zip
  }
  Compress-Archive $release $zip

  Write-Output "`n===> $zip created`n"
}

if ($Target -eq "all" -or $Target.Contains('win-x86')) {
  # Windows x86
  BuildTarget 'i686-pc-windows-msvc' $Version 'win-x86'
}

if ($Target -eq "all" -or $Target.Contains('win-x64')) {
  # Windows x64
  BuildTarget 'x86_64-pc-windows-msvc' $Version 'win-x64'
}

if ($Target -eq "all" -or $Target.Contains('win-arm64')) {
  # Windows arm64
  BuildTarget 'aarch64-pc-windows-msvc' $Version 'win-arm64'
}

if ($Target -eq "all" -or $Target.Contains('linux-arm64')) {
  # Linux arm64 via WSL
  BuildTargetWSL 'aarch64-unknown-linux-gnu' $Version 'linux-arm64'
}

if ($Target -eq "all" -or $Target.Contains('mac-arm64')) {
  # Mac arm64 via Mac
  BuildTargetMac 'aarch64-apple-darwin' $Version 'mac-arm64'
}
