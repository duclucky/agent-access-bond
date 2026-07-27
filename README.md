# AgentAccessBond

AgentAccessBond is a GenLayer Intelligent Contract primitive for bonded agent
web-access accountability. Validators inspect bounded public web policy and
action receipt evidence, then finalized verdicts quarantine or restore an agent
identity and settle bond credits.

Project specification: [docs/README.md](docs/README.md)

Current status: local verification pass. On 2026-07-27, `npm run check` passed:
one contract linted and validated, 9 direct tests passed, 3 deployment parser
tests passed, and frontend TypeScript/build checks passed. Studionet lifecycle,
public CI, public repository, and deployment evidence remain pending until
verified by fresh commands.
