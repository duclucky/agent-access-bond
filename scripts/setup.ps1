$ErrorActionPreference = "Stop"
if (-not (Test-Path ".venv\Scripts\python.exe")) {
  $pyList = py --list 2>$null
  if ($LASTEXITCODE -eq 0 -and ($pyList -match "3\.12")) {
    py -3.12 -m venv .venv
  } else {
    Write-Host "Python 3.12 launcher entry not available; falling back to python on PATH."
    python -m venv .venv
  }
}
.\.venv\Scripts\python.exe --version
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm install
