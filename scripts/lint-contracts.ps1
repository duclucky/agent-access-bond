$ErrorActionPreference = "Stop"
$env:PYTHONUTF8 = "1"
.\.venv\Scripts\python.exe -m genvm_linter check contracts\agent_access_bond.py

