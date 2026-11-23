# Qodo Hackathon — Day 16: Scan your repo with Arnica

**Status: DRAFT — NOT POSTED. Awaiting user approval (maximality statement + gate pause).**

- Challenge email: Filip Hric at Qodo, 23 Nov 2026 19:04 WIB
  (Gmail id `1a2084acce60ed28`) — "Day 16: Scan your repo with Arnica"
- Discussion: https://github.com/orgs/qodo-hackathon/discussions/18
  ("Day 16: Scan your repo with Arnica")
- Repo: https://github.com/opelphantom96/agent-factory (public, PERSONAL account)
- Outcome: **Core challenge INCOMPLETE — blocked by Arnica's own rule.**
  Arnica's GitHub guide states personal-account integrations are
  prohibited, so no scan could run and there are no findings.
  Nothing was fabricated to produce a screenshot.

## Evidence for the blocker (verified 23 Nov, no browser sign-in needed)

Arnica GitHub setup guide —
https://docs.arnica.io/arnica-documentation/getting-started/scm-integrations/github :

- Warning box: "Arnica supports an integration with organization
  accounts only. It means that integrations with personal accounts are
  prohibited."
- "Only organization owners are able to install GitHub Apps."
- Installation step 4: "Select the applicable organization."

The repo lives in personal account `opelphantom96`, not an
organization, so there is no organization to select and no owner who
could install the app for it. The Day 16 email anticipates exactly
this case: "If your project is in a personal account or you're
waiting for approval, share where you got stuck in the Day 16
Discussion."

## Local diligence done instead of the Arnica scan (23 Nov)

- `npm test`: **21/21 pass**
- `npm run verify`: green (tests OK + demo rebuild OK)
- Secret-pattern grep over the repo: clean — only hits are the
  factory's own `SECRET_PATTERNS` detector in `src/factory/review.js`
  and the words "secrets in code" in ticket T-005 / config
- Zero runtime dependencies; CI pins `actions/checkout@v4` +
  `actions/setup-node@v4`
- Repo HEAD at check time: `2ff1a7b` (master)

## Diagram update

`day15/factory-diagram.png` (regenerated from `day15/make-diagram.py`)
now carries an amber footer line: "Day 16 — security scan (Arnica):
BLOCKED — Arnica supports organization accounts only; personal repos
prohibited. Planned once the repo lives in an org." Attach the updated
PNG to the Discussion comment.

## Discussion comment — copy verbatim to Discussion #18

```
Core challenge status: INCOMPLETE

Repository (or a redacted identifier for a private project): https://github.com/opelphantom96/agent-factory (public)

Repository ownership: personal account

Scan scope: repository opelphantom96/agent-factory, branch master, commit 2ff1a7b — scan never started (integration blocked)

Scan completion status and time: No scan ran. Integration blocked 23 Nov 2026 (setup attempted ~20:50 WIB).

Redacted screenshot or output showing completion and results: N/A — no scan ran. Blocker evidence is Arnica's own documentation, quoted below.

Finding investigated (or "none reported in the completed scan"): none reported — no completed scan exists.

Arnica severity and affected code/dependency, if applicable: N/A

What my coding agent helped inspect: Local diligence instead of the Arnica scan — `npm test` 21/21 pass, `npm run verify` green (tests OK + demo rebuild OK), secret-pattern grep clean (only hits are the factory's own SECRET_PATTERNS detector and the words "secrets in code"), zero runtime dependencies, CI pins actions/checkout@v4 + setup-node@v4.

My decision and reason: No finding to fix or dismiss — nothing was scanned. I did not fabricate a vulnerability or a secret to produce a screenshot, per the challenge instructions.

Optional fix, if made: none.

- Commit / PR: none (no code changed for Day 16)
- Relevant tests and actual results: `npm test` 21/21 pass, `npm run verify` green (23 Nov)
- Qodo review result or blocker: not run — no code changed
- Follow-up Arnica scan result or unresolved verification: unresolved — no scan exists to re-run

Updated ticket-to-main diagram: day15/factory-diagram.png — Arnica step added and marked BLOCKED ("Arnica supports organization accounts only; personal repos prohibited. Planned once the repo lives in an org."). [attach updated diagram]

Optional Slack / Linear / Jira attempt and observed result: not attempted — core scan is blocked, and these are optional extras.

Blocker, exact step and redacted error, if any:
Arnica GitHub setup guide (docs.arnica.io/arnica-documentation/getting-started/scm-integrations/github), installation step 4 "Select the applicable organization": the guide states, in a warning box, "Arnica supports an integration with organization accounts only. It means that integrations with personal accounts are prohibited." It also states "Only organization owners are able to install GitHub Apps." My repository lives in a personal account (opelphantom96), not an organization, so there is no organization to select and no owner who could install the app for it.

Unblock path: move the repository into a GitHub organization I own, or an Arnica exception for personal accounts. Tagging @orenkatz for Arnica guidance.
```

## What still needs the user / parent

1. Approve the Discussion #18 post above (or correct it) — then the
   parent posts it as opelphantom96.
2. Decide on the unblock path for a real scan later: move the repo to
   a GitHub org the user owns, or ask Arnica (@orenkatz /
   support@arnica.io) about personal-account support. NOT done now —
   moving the repo would change the final-submission repo link.
3. Optional firsthand confirmation: a browser run (sign in at
   app.arnica.io → Admin → Integration → GitHub.com → Add) would hit
   the same wall at the GitHub install page (no applicable
   organization). Not required for the post — the docs quote is the
   evidence — but it would add a screenshot of the install page if
   the user wants one.
