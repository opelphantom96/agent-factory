# Agent Factory — Qodo Hackathon 2026

> **Build your own software factory.** One ticket in, one reviewed, tested,
> verified change out — or an escalation to a human. Never a silent skip.

The factory is a real, runnable pipeline:

```
ticket → spec → plan review → implement → code review → auto-fix → verify → approve / escalate
```

It proves itself on a real product: **apps/f1-telemetry**, a working F1
lap-telemetry dashboard. Every dashboard feature is added by the factory
itself, driven by a ticket in `tickets/`.

## Quickstart

```bash
npm test            # all tests (node:test, zero dependencies)
npm run verify      # syntax check + tests + demo rebuild
npm run demo        # build the dashboard → apps/f1-telemetry/index.html
node src/factory/index.js run --ticket T-001   # run the factory on a ticket
npm run automation  # watch tickets/ and auto-run new "ready" tickets
```

Node 20+ required. No dependencies to install.

## How the factory works

| Stage | What it does | Gate |
|---|---|---|
| **spec** | Validates the ticket: goal, acceptance criteria, change script, test | Ticket must be complete |
| **plan review** | Generates an implementation plan, reviews it against `AGENTS.md`; Qodo review runs here when the Qodo CLI is available | Plan must satisfy all 5 rules |
| **implement** | Runs the ticket's change script (a real code edit), snapshots files first | Files must actually change |
| **code review** | Diffs the change; local reviewer checks forbidden patterns, test coverage, syntax; Qodo review runs here when available | No blocking findings |
| **auto-fix (PR Resolver)** | Applies known fixes for review findings (e.g. missing test), then re-verifies | Fixed findings re-checked |
| **verify** | `node --test`, `node --check` on all sources, demo rebuild | All green |
| **approve / escalate** | Approves with a report, or escalates with the failing findings | — |

Every stage writes a record to `evidence/runs/`; the per-challenge log is
`evidence/EVIDENCE.md`.

## Qodo integration

The pipeline is built around Qodo as the reviewer. `src/factory/qodo.js`
detects the Qodo CLI and calls it at the **plan-review** and **code-review**
stages (`qodo review`). Until a Qodo account is connected, the factory uses
its local rule-based reviewer and marks every record `qodo: unavailable —
local fallback`, so nothing is ever presented as a Qodo review that was not
one. Wiring the real account is a one-liner: install the Qodo CLI and sign
in — the factory picks it up automatically.

## Repo layout

```
src/factory/        the pipeline (CLI, stages, Qodo adapter, evidence)
src/demo/           the F1 telemetry demo app (data + SVG renderer + features)
tickets/            work items the factory consumes (+ their change scripts)
apps/f1-telemetry/  the generated dashboard (open index.html in a browser)
scripts/            mine-rules (Rule Miner stand-in), automation (ticket watcher),
                    verify (full gate runner)
evidence/           per-challenge evidence log + per-run JSON records
docs/               challenge list, architecture
.github/workflows/  CI: tests + verify + demo build on every push/PR
```

## Hackathon status

- Registered 14 Nov 2026 (late start; catch-up explicitly allowed by the
  rules). Daily challenge emails resume Mon 16 Nov (Week 3).
- Week 1 + Week 2 catch-up is done locally in this repo; Qodo-dependent
  steps (real Qodo reviews, GitHub PRs, Discussion submissions) are wired
  and waiting on the Qodo account + GitHub repo — see `docs/CHALLENGES.md`
  and `evidence/EVIDENCE.md` for the exact status per challenge.
- Final submission: repo link + short write-up via the GitHub Discussion
  link from the daily email, before **3 Dec 2026 15:00 WIB**.

## License

MIT.
