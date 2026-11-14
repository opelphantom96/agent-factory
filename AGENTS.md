# AGENTS.md — Agent Factory

## Project

**Agent Factory** is an autonomous software-development pipeline. A ticket goes in
one end; a reviewed, tested, verified change comes out the other end — or an
escalation to a human, never a silent skip.

Pipeline: **spec → plan review → implement → code review → auto-fix
(PR Resolver) → verify → approve / escalate.**

The factory proves itself on a real product: **apps/f1-telemetry**, a working
F1 lap-telemetry dashboard (speed / throttle / brake / gear traces as SVG).
Every feature of the demo app is added by the factory itself, driven by a
ticket in `tickets/`.

This repo is the entry for the **Qodo Hackathon 2026** ("Build your own
software factory", 2 Nov – 2 Dec 2026). Challenge evidence lives in
`evidence/EVIDENCE.md`; the challenge list in `docs/CHALLENGES.md`.

## Setup

- Node.js 20+ (developed on Node 24). **Zero runtime dependencies** —
  `npm install` is a no-op.
- Build the demo dashboard: `npm run demo` → open `apps/f1-telemetry/index.html`
- Run the factory on a ticket: `node src/factory/index.js run --ticket T-001`
- Watch for new tickets (automation stand-in): `npm run automation`

## Verify

- `npm test` — all tests (node:test, zero dependencies)
- `npm run verify` — syntax-check every source file, run tests, rebuild demo

## Rules

1. **Every change ships with a test** that fails before the change and passes
   after it. A ticket without a test is not ready.
2. **No new runtime dependencies** without a note in the ticket. The factory
   stays zero-dependency so it runs anywhere Node runs.
3. **No secrets, tokens, or credentials** in code, tickets, or evidence. Ever.
4. **Every pipeline stage writes its result to the evidence log**
   (`evidence/runs/`). A stage that ran but left no trace did not run.
5. **If a gate fails twice, escalate to a human** — never silently skip a
   gate, never weaken a check to make a run green.
