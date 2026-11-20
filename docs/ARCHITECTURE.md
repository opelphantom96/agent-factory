# Architecture — Agent Factory

## Concept

A software factory is a loop, not a single tool. The factory turns a
**ticket** into a **reviewed, tested, verified change** — or an **escalation**.
Each stage has one job, one gate, and one evidence record. No stage can
silently skip the next one.

```
                 ┌─────────────────────────────────────────────┐
                 │  tickets/*.json  (goal, acceptance, change, │
                 │  test, status: ready)                       │
                 └──────────────────────┬──────────────────────┘
                                        ▼
  1. spec          validate ticket completeness
  2. plan review   generate plan → review vs AGENTS.md rules
                   (+ Qodo review when the CLI is available)
  3. implement     run the ticket's change script (real code edit)
  4. code review   diff review: forbidden patterns, test coverage,
                   syntax (+ Qodo review when available)
  5. auto-fix      PR Resolver: apply known fixes, re-verify
  6. verify        node --test · node --check · demo rebuild
  7. approve /     all green + no blocking findings → APPROVED
     escalate      otherwise → ESCALATED with the findings list
                   Day 14: a Qodo portal workflow adds the
                   "Qodo approved" label when a finished PR review has
                   zero Medium+ findings — except PRs touching the
                   guarded path scripts/**, which always stay for a
                   person (see review/workflow-day-14.md). The label is
                   not a merge decision and does not replace CI, tests,
                   or acceptance checks. Workflow NOT yet live in the
                   portal (Day 14 INCOMPLETE — no portal access).
                                        │
                                        ▼
                 evidence/runs/<ticket>-<ts>.json
                 apps/f1-telemetry/index.html (rebuilt demo)
```

## Modules

| File | Responsibility |
|---|---|
| `src/factory/index.js` | CLI (`run --ticket <id>`, `list`) + pipeline orchestration |
| `src/factory/tickets.js` | Ticket loading + validation (spec stage) |
| `src/factory/review.js` | Local rule-based reviewer (plan + code review) |
| `src/factory/qodo.js` | Qodo adapter: detect CLI, run `qodo review`, merge findings |
| `src/factory/fixer.js` | PR Resolver: known auto-fixes + re-verification |
| `src/factory/evidence.js` | Evidence records (JSON per run) |
| `src/demo/telemetry.js` | Deterministic F1 lap telemetry data + stats |
| `src/demo/render.js` | SVG dashboard generator |
| `src/demo/features.js` | Plugin registry: each ticket adds one feature here |
| `scripts/mine-rules.mjs` | Rule Miner stand-in: propose AGENTS.md rules from code |
| `scripts/automation.mjs` | Ticket watcher: auto-run new `ready` tickets |
| `scripts/verify.mjs` | Full gate runner (syntax + tests + demo build) |

## The demo app (the factory's product)

`apps/f1-telemetry` is a static dashboard generated from a deterministic lap
dataset (5.412 km, 542 samples, speed / throttle / brake / gear). It is
built by `src/demo/render.js` and extended through `src/demo/features.js`,
a plugin registry: each factory ticket appends exactly one feature
(DRS zones, lap comparison, legend, …) and its test. The dashboard is
dependency-free HTML + inline SVG — open `index.html` in any browser.

## Qodo integration points

- **Plan review** (`review.js` + `qodo.js`): when the Qodo CLI is present,
  the plan is sent to Qodo review; its findings are merged with the local
  rule check. Without it, the local reviewer runs and the record is marked
  `qodo: unavailable — local fallback`.
- **Code review**: same pattern on the diff.
- **Rule Miner**: `scripts/mine-rules.mjs` is the local stand-in; the real
  Qodo Rule Miner replaces its output once the account is connected.
- **Codebase Wisdom**: the plan-review stage is the integration point —
  ticket review against the codebase before building.
- **PR Resolver**: `src/factory/fixer.js` implements the skill's loop
  (findings → fixes → re-verify) with a local fix registry; Qodo findings
  flow through the same path when available.

Nothing here fakes a Qodo result. Every evidence record states whether Qodo
ran or the local fallback ran.

## Design choices

- **Zero dependencies.** The factory must run anywhere Node runs, including
  CI and a fresh laptop. `node:test` for tests, `node --check` for syntax.
- **Change scripts, not magic.** A ticket's change is an explicit script
  (`tickets/changes/*.mjs`) that edits code. Reviewable, repeatable,
  diffable — exactly what a coding agent's edit should be.
- **Evidence is a first-class output.** Every stage writes a record. If a
  stage left no trace, it did not run (AGENTS.md rule 4).
- **Escalate, don't weaken.** A failing gate can only be resolved by a fix
  or a human decision — never by loosening the check (AGENTS.md rule 5).
