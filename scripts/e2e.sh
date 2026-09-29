#!/usr/bin/env bash
# The staging regression suite (tests/e2e/PLAN.md), run as `npm run test:e2e`.
#
# 1. Deploys the working tree's backend to staging, so the suite always tests this code.
# 2. Runs the suite against it, with the site built from the same tree.
# 3. On a full pass of a clean tree, records the commit's tree hash in .git/e2e-passed. The
#    pre-push hook and `deploy.py` (production) both require that record.
# Extra arguments go to Playwright (e.g. -g "R + E"); a filtered run is never recorded.
set -euo pipefail
cd "$(dirname "$0")/.."

clean=1
[ -z "$(git status --porcelain --untracked-files=normal -- . ':!.claude')" ] || clean=0

python3 apps-script/deploy.py --env staging --allow-dirty "e2e run"
npx playwright test --project=staging "$@"

if [ "$clean" = 1 ] && [ "$#" -eq 0 ]; then
  git rev-parse 'HEAD^{tree}' >> "$(git rev-parse --git-dir)/e2e-passed"
  echo "Staging suite passed on $(git rev-parse --short HEAD): recorded, so it can be pushed and deployed to production."
else
  echo "Staging suite passed, but not recorded: uncommitted changes or a filtered run. Commit and run it in full before pushing."
fi
