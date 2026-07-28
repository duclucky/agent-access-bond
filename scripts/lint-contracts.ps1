$ErrorActionPreference = "Stop"
$env:PYTHONUTF8 = "1"

$python = Join-Path $PSScriptRoot "..\.venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
  throw "Missing .venv. Run npm run setup first."
}

$contracts = @(
  Get-ChildItem -Path (Join-Path $PSScriptRoot "..\contracts") -Filter "*.py" -File |
    Where-Object { $_.Name -ne "__init__.py" }
)

if ($contracts.Count -eq 0) {
  throw "No project contracts exist."
}

foreach ($contract in $contracts) {
  & $python -m genvm_linter.cli check $contract.FullName
  if ($LASTEXITCODE -ne 0) {
    throw "Contract lint failed: $($contract.FullName)"
  }
}
