# Qodo Hackathon — Day 15: Show your factory

**Status (updated 21 Nov 08:17 WIB): post 1 LIVE + Discussion #17 SUBMITTED;
posts 2–5 UNVERIFIED.** Post 1: https://x.com/CrissNoo12/status/2123771284001828977
(verified live 20 Nov 22:41 WIB). Discussion comment:
https://github.com/orgs/qodo-hackathon/discussions/17#discussioncomment-19775063.
Confirmation of posts 2–5 still waiting on the user. The thread text below
was drafted 20 Nov ~20:29 WIB, when Day 14 was still honestly INCOMPLETE —
its Day 14 wording is now STALE (Day 14 COMPLETE 20 Nov 22:38 WIB, see
below). If posts 2–5 have NOT been posted yet, use the CORRECTED post 5
further down.

- Challenge email: Filip Hric at Qodo, 20 Nov 2026 19:00:39 WIB
  (Gmail id `1a1f8d48688ab267`) — "Day 15: Show your factory"
- Platform chosen: **X/Twitter** — account @CrissNoo12 (NOT Premium, every
  post ≤ 280 characters, verified by script below)
- Diagram: `factory-diagram.png` in this folder — attach to post 1
- Repo: https://github.com/opelphantom96/agent-factory

## Day 14 status — CORRECTED 21 Nov (was "INCOMPLETE" when drafted)

Day 14 is **COMPLETE since 20 Nov 22:38 WIB** (Discussion #16 comment
19777864). The workflow `agent-factory-quality-gate` is ACTIVE in the Qodo
portal (created 21:34 WIB) and the `scripts/**` guard is saved; observed
live — PR #5 got the "Qodo approved" label 22:19 WIB (clean review),
PR #4 clean review 22:29 WIB, NO label (guard blocks `scripts/**`).
The gate fix (ticket T-007) still stands: 26 files gated, 21/21 tests pass.
The thread below (posts 1–5 as drafted 20 Nov) says Day 14 is "still in
progress" — that wording is now WRONG. Use the corrected post 5 below if
posts 2–5 have not been posted yet. If they were already posted with the
old wording, do not re-post; the Discussion #17 comment already submitted
may also carry the old wording.

### Post 5 CORRECTED (267/280 — recount after any edit)

```
What works: the full loop, real @QodoAI reviews on PR #1, a custom review profile, a reusable skill — and the Day 14 approval workflow is now live: PR #5 earned the Qodo approved label, PR #4 stayed unlabeled behind the scripts/** guard. Repo: https://github.com/opelphantom96/agent-factory
```

## X thread — copy verbatim, one post at a time

### Post 1 (190/280) — attach `factory-diagram.png`

```
Day 15 of the @QodoAI hackathon: time to show the factory instead of just building it.

One ticket in, one reviewed and tested change out. Or it escalates to a human. Never a silent skip. 🧵
```

### Post 2 (177/280)

```
How it runs:

ticket → spec → plan review → implement → code review → auto-fix → verify → approve / escalate

Every stage writes evidence. A stage that left no trace didn't run.
```

### Post 3 (189/280)

```
Concrete example: my verify gate claimed to syntax-check every source file. It didn't — it never checked the ticket change scripts the factory actually runs.

Ticket T-007 closed that hole.
```

### Post 4 (239/280)

```
One lesson from 14 days: a failing gate gets fixed or escalated. Never loosened just to make a run green.

So far the factory has approved 5 tickets on a real F1 telemetry dashboard: DRS zones, lap compare, legend, top speed, review setup.
```

### Post 5 (274/280 — recount after any edit)

```
What works: the full loop, real @QodoAI reviews on PR #1, a custom review profile, a reusable skill.
Still in progress: the Day 14 approval workflow — the gate fix is in (T-007), but the workflow + guard still need creating in the Qodo portal.

Repo: https://github.com/opelphantom96/agent-factory
```

Character counts verified with X rules (any URL counts 23 chars, emoji
counts 2). Recount if any post is edited before posting.

## Day 15 Discussion comment — submit AFTER the post is live

Post the link in the Day 15 Discussion (open it via the "Submit your Day 15
link" button in the Day 15 email). Replace `[POST_URL]` with the real post
URL first.

```
Day 15 — Show your factory

Here's how my Agent Factory works: [POST_URL]

One ticket in, one reviewed, tested, verified change out — or an escalation to a human. Ticket → spec → plan review → implement → code review → auto-fix (PR Resolver) → verify → approve / escalate, and every stage writes evidence to evidence/runs/.

Concrete example: ticket T-007 closed a hole in the verify gate — it never syntax-checked the ticket change scripts the factory actually runs. Lesson: a failing gate gets fixed or escalated, never loosened.

Repo: https://github.com/opelphantom96/agent-factory

Honest note (STALE as drafted — Day 14 COMPLETE 20 Nov 22:38 WIB, workflow live, PR #5 labelled, PR #4 guard-proven): the comment already submitted as 19775063 may carry the old "still in progress" wording. Corrected wording if re-posting: "Day 14's approval workflow is live — the gate fix is done (T-007), the workflow + guard are created in the Qodo portal, PR #5 earned the Qodo approved label and PR #4 stayed unlabeled behind the scripts/** guard."
```

## What the user still needs to do

1. Confirm whether thread posts 2–5 were posted on @CrissNoo12. If NOT
   yet posted, use the CORRECTED post 5 above (Day 14 is complete now).
   If already posted with the old wording, nothing to re-post.
2. (Done, no action): post 1 is live and the Discussion #17 comment is
   submitted. Day 14 needs nothing more — workflow + guard live, both PRs
   observed, Discussion #16 comment posted.
