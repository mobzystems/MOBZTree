<#
  Read a setting from a TOML file. Returns everything as a string.
  Support removing comments from the end of string values
#>

[CmdletBinding()]
Param(
  [Parameter(Mandatory)]
  $TomlFile,
  [Parameter(Mandatory)]
  $Section,
  [Parameter(Mandatory)]
  $Key
)

$currentSection = ""
$returnValue = $null

foreach ($line in (Get-Content $TomlFile -Encoding utf8)) {
  if ($line.StartsWith("[")) {

    # Lines starting with [ start a section
    $currentSection = $line.Trim("[", "]")
    # Write-Verbose "Starting section '$currentSection'"

  } elseif (!$line.Trim().StartsWith("#")) { # Skip comments

    # When in the correct section...
    if ($currentSection -eq $Section) {
      $setting = ConvertFrom-StringData -StringData $line
      if ($setting.ContainsKey($Key)) {
        # Save the return value. If another one comes along it will overwrite this one
        [string]$s = $setting[$Key]
        if ($s.StartsWith('"') -and !$s.EndsWith('"')) {
          // We have an unclosed string! Try to peel off the comment
          $i = $s.LastIndexOf('#')
          if ($i -ge 0) {
            Write-Verbose "Removing comment from '$s'"
            $s = $s.Substring(0, $i - 1)
          }
        }
        # Remove quotes around the value if present
        $returnValue = $s.trim('"')
      }
    }
  }
}

if ($null -ne $returnValue) {
  $returnValue
} else {
  Write-Error "Could not find key '$Key' in section '$Section' in file '$CargoFile'"
}
