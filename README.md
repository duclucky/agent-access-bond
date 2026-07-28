# AgentAccessBond

AgentAccessBond is a GenLayer Projects-track application for bonded web-agent
accountability. Validators inspect bounded public `robots.txt`, policy, and
action-receipt evidence. A finalized semantic verdict can quarantine the agent,
settle operator and challenge bonds, and make `can_execute(agent_id)` return
`false`.

## Current Status

- Category: `Projects`
- Network: `Studionet`
- Active contract:
  [`0x37826aA6a75F033D67169b2F8D2616382Ca06522`](https://explorer-studio.genlayer.com/address/0x37826aA6a75F033D67169b2F8D2616382Ca06522)
- Contract source commit: `e8f918130cf853f88611c3fd267c1a5cc913eda7`
- Canonical demo verdict: `MATERIAL_VIOLATION / DISALLOWED_PATH`
- Canonical consequence: agent `QUARANTINED`, case `RESOLVED`,
  `can_execute=false`, user credit withdrawn
- Local verification: 20 direct contract tests, 9 deployment/script tests,
  20 frontend tests, contract lint, TypeScript, and production build
- Production frontend:
  [`https://agent-access-bond.vercel.app`](https://agent-access-bond.vercel.app)
- Browser-wallet proof: `PENDING_USER_WALLET_PROOF`
- Current-revision CI:
  [`Check`](https://github.com/duclucky/agent-access-bond/actions/workflows/check.yml)

The active revision and safe projected lifecycle evidence are stored in
[`docs/evidence/studionet/deployment.json`](docs/evidence/studionet/deployment.json).
Historical revisions are retained under
[`docs/evidence/studionet/revisions/`](docs/evidence/studionet/revisions/).
Vercel deployment evidence is stored in
[`docs/evidence/studionet/frontend-hosting.json`](docs/evidence/studionet/frontend-hosting.json).

## Product

The React application in `frontend/` connects an EIP-1193 injected wallet or
MetaMask Connect, enforces
Studionet configuration, signs real contract writes, tracks submitted,
accepted, finalized, failed, and retry states, and refreshes canonical contract
views after finalization. It does not use local storage as canonical state or
simulate wallet signatures, gas, balances, or finality.

Supported lifecycle actions:

- create and accept a bonded agent;
- open, adjudicate, retry, or bilaterally cancel an evidence case;
- withdraw earned credit;
- bilaterally close an agent;
- read agent, case, verdict, credit, accounting, and execution eligibility.

## Verification

```powershell
npm run check
```

The command fails fast and runs contract lint/validation, direct tests, script
tests, frontend tests, TypeScript checks, and the production Vite build.

For local product use:

```powershell
npm --prefix frontend run dev -- --host 127.0.0.1
```

Copy only public values from `frontend/.env.example` into ignored
`frontend/.env.local`. Never place a private key in a `VITE_*` variable.

## Documentation

The technical specification, public interface, claim-to-code matrix, evidence
status, and limitations are in [`docs/README.md`](docs/README.md).
