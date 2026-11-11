[CmdLetBinding()]
Param(
  [Parameter(Mandatory)]
  [string]$Version
)

$NAME = 'MOBZTree'

function BuildTarget([string]$Target, [string]$version, [string]$extension, [string]$code) {
  [string]$exe = "./src-tauri/target/$Target/release/$($NAME)$($extension)"
  [string]$release = "./releases/$($NAME)_$($code)_$($version)"
  [string]$zip = "$($release).zip"

  Write-Output "Building $exe $release$extension $zip"
  # return

  &npm run tauri build -- -- --target=$Target
  if (Test-Path $release$extension -PathType Leaf) {
    Write-Warning "Removing '$release$extension'"
    Remove-Item $release$extension
  }
  Move-Item $exe $release$extension
  if (Test-Path $zip -PathType Leaf) {
    Write-Warning "Removing '$zip'"
    Remove-Item $zip
  }
  Compress-Archive $release$extension $zip
}

function BuildTargetWSL([string]$Target, [string]$version, [string]$extension, [string]$code) {
  &npm run tauri build -- -- --target=$target
  Move-Item "./src-tauri/target/$Target/release/$NAME$extension" "./releases/$NAME_$code_$version"
}

# Windows x64
BuildTarget 'x86_64-pc-windows-msvc' $Version '.exe' 'win-x64'
# Windows arm64
BuildTarget 'aarch64-pc-windows-msvc' $Version '.exe' 'win-arm64'
