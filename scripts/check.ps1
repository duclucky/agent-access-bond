$ErrorActionPreference = "Stop"

function Invoke-CheckedNpmScript {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Name
  )

  & npm.cmd run $Name
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Invoke-CheckedNpmScript "lint:contracts"
Invoke-CheckedNpmScript "test:direct"
Invoke-CheckedNpmScript "test:deployment"
Invoke-CheckedNpmScript "test:frontend"
Invoke-CheckedNpmScript "lint"
Invoke-CheckedNpmScript "build"
