<#
  A multi-target build script for tauri
#>

[CmdLetBinding()]
Param(
  # Target(s) to build. Valid targets are win-x86, win-x64, win-arm64, linux-arm64, mac-arm64
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

function BuildTarget([string]$target, [string]$version, [string]$code) {
  [string]$exe = "./src-tauri/target/$target/release/$($NAME).exe"
  [string]$release = "./releases/$($NAME)_$($code)_$($version)"
  [string]$zip = "$($release).zip"

  # Write-Output "Building $exe $($release).exe $zip"
  # return

  Write-Output "===> Building $code ($target)..."

  &npm run tauri build -- -- --target=$target
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

<#
  Build a Mac version via ssh to (a/my) Mac. WARNING: The dmg bundle will allways have the *current* version number of the app,
  not the one passed on the command line!

  WARNING: to create the dmg bundle, you must be logged in to the Mac!
#>
function BuildTargetMac([string]$target, [string]$version, [string]$code) {
  [string]$release = "./releases/$($NAME)_$($code)_$($version)"
  [string]$zip = "$($release).zip"
  [string]$dmg = "$($release).dmg"

  Write-Output "===> Building $code ($target) via Mac..."

  # Need zah -l here to force a login shell
  # For MacOS, we need to build a bundle
  ssh mobzmini.fritz.box "zsh -c -l 'cd ~/Projects/MOBZTree && git pull && npm install && npm run tauri build -- --target=$target --bundles dmg'"
  scp "mobzmini.fritz.box:~/Projects/MOBZTree/src-tauri/target/$target/release/bundle/dmg/$($NAME)_$($version)_aarch64.dmg" $dmg

  # TODO: dmg's seem to be pretty compressed so maybe zipping is superfluous?
  if (Test-Path $zip -PathType Leaf) {
    Write-Warning "Replacing '$zip'"
    Remove-Item $zip
  }
  Compress-Archive $dmg $zip

  Write-Output "`n===> $zip created`n"
}

function BuildTargetWSL([string]$target, [string]$version, [string]$code) {
  [string]$release = "./releases/$($NAME)_$($code)_$($version)"
  [string]$zip = "$($release).zip"

  [string]$releases = (Resolve-Path "./releases").Path

  Write-Output "===> Building $code ($target) via WSL..."

  # Need bash -i here to force an interactive shell
  &wsl --cd ~/MOBZTree -- bash -c -i "git pull && npm install && npm run tauri build -- --target=$target"
  &wsl --cd ~/MOBZTree -- bash -c "cp ./src-tauri/target/$target/release/$NAME ``wslpath `"$releases`"``/$($NAME)_$($code)_$($version)"

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
