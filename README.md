# AgentAccessBond

AgentAccessBond is a GenLayer Intelligent Contract primitive for bonded agent
web-access accountability. Validators inspect bounded public web policy and
action receipt evidence, then finalized verdicts quarantine an agent identity
and settle bond credits.

Project specification: [docs/README.md](docs/README.md)

Current status: Studionet lifecycle verified. On 2026-07-27, the contract was
deployed on Studionet at `0x4D2827F1BC7C4678DD439eea52de3340Ae9054Bd`; the
public evidence case finalized as `MATERIAL_VIOLATION`, quarantined the agent,
credited the user/challenge bond, and finalized withdrawal. Local `npm run
check` also passed with 11 direct tests and 3 deployment parser tests.
GitHub Actions Check passed on commit `f449855`.
