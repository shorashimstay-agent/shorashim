# The designer's pipeline

Since 2026-10-09 the designer (GitHub `sarayagent-alt`, write access) works in this repo with Codex
desktop instead of front-2. She says "push to git"; everything else happens on its own:

1. Her Codex follows `AGENTS.md`: it commits and runs `node scripts/ship.mjs`, which rebases her work
   onto `origin/main`, refuses changes to owner files, and pushes it to the `design` branch.
2. `.github/workflows/design.yml` runs the checks: a gitleaks scan of the new commits, the unit
   tests, `tsc`, `tests/ci` (the page loads without errors, the booking form sends a complete request
   to a fake backend, axe WCAG 2.1 AA, the legal pages build) and `scripts/design-contract.mjs` (the
   form wiring, the accessibility hooks, no hard-coded ₪ price, no new script tag).
3. It opens a pull request from `design` to `main`. When no file in it is in `.github/CODEOWNERS`, it
   rebase-merges it and starts `deploy.yml`, which publishes to Pages and checks the live site
   (`scripts/live-check.mjs`). `ship.mjs` waits for all of it and tells Codex the result.
4. A pull request that touches an owner file stays open until the owner approves it. Review it as
   `shorashimstay-agent`, then merge it from this account (a merge by a person starts the deploy;
   one made by the workflow's token does not).

## What enforces it

- **Ruleset "main"**: changes reach `main` only through a pull request whose `checks` job passed,
  with a code-owner approval for files in `.github/CODEOWNERS`; only rebase merges; no force-push
  or deletion. The admin role bypasses it, so `shorashimstay-agent` keeps pushing to `main`
  directly (the pre-push hook still asks for the staging suite).
- **Pages deploys from Actions**, and the `github-pages` environment accepts only `main`. Nothing
  she pushes to another branch, `gh-pages` included, can reach the live site.
- CODEOWNERS is read from `main`, so a pull request cannot loosen its own rules; `.github/` is
  itself an owner file.
- `AGENTS.md` is hers to edit (user decision, 2026-10-09). It only guides her Codex; nothing above
  depends on it, so an edit there can make Codex less helpful but cannot unlock anything.
- The repo is public: secret-scanning push protection is the first net, gitleaks in `design.yml`
  the second.

## When she changes policy text

The packages, prices wording and cancellation policy live in `src/data/booking.ts`, an owner file.
A change she wants there comes to the owner as a request; make it together with the matching
change to the terms in `src/legal/content.ts` (front-2's rule still holds: her policy wins, and the
terms follow it, keeping statutory rights and how the booking system works).

## Her machine

Codex desktop with a clone of this repo, Node 22+, git logged in as `sarayagent-alt`, and the GitHub
CLI (`gh auth login` as `sarayagent-alt`; `ship.mjs` uses it to follow the runs).
