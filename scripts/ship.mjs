// "Push to git" for the designer's Codex agent (AGENTS.md). Puts the committed work on top of the
// live site's latest version, pushes it to the `design` branch and waits for the pipeline
// (.github/workflows/design.yml, then deploy.yml) to finish. The last line is always one of
//   RESULT: LIVE | WAITING_FOR_OWNER | NEEDS_OWNER | FAILED | CONFLICT | NOTHING_TO_SHIP | NOT_COMMITTED | SETUP_PROBLEM
// with plain-language details above it.
//
//   node scripts/ship.mjs           push and wait (about 10 minutes)
//   node scripts/ship.mjs --status  only wait for, and report on, the last push
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { lockedFiles } from './locked-files.mjs';

const REPO = 'shorashimstay-agent/shorashim';
const SITE = 'https://shorashimstay.com';
const BRANCH = 'design';
const POLL_MS = 20_000;

function run(cmd, args, { check = true } = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  if (res.error) {
    if (!check) return { ok: false, out: '', err: res.error.message };
    finish('SETUP_PROBLEM', `Could not run \`${cmd}\`: ${res.error.message}. Is it installed and on PATH?`);
  }
  const result = { ok: res.status === 0, out: res.stdout.trim(), err: res.stderr.trim() };
  if (check && !result.ok) finish('SETUP_PROBLEM', `\`${cmd} ${args.join(' ')}\` failed:\n${result.err || result.out}`);
  return result;
}

const git = (...args) => run('git', args);
const gh = (...args) => JSON.parse(run('gh', [...args, '-R', REPO]).out || 'null');

function finish(result, message) {
  console.log(`\n${message}\nRESULT: ${result}`);
  process.exit(result === 'FAILED' || result === 'SETUP_PROBLEM' ? 1 : 0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const minutes = (since) => Math.round((Date.now() - since) / 60_000);

async function waitFor(what, timeoutMs, probe) {
  const started = Date.now();
  let lastNote = started;
  for (;;) {
    const value = probe();
    if (value) return value;
    if (Date.now() - started > timeoutMs) finish('FAILED', `Gave up waiting for ${what} after ${minutes(started)} minutes. Run \`node scripts/ship.mjs --status\` later to check again.`);
    if (Date.now() - lastNote >= 60_000) {
      console.log(`… still waiting for ${what} (${minutes(started)} min)`);
      lastNote = Date.now();
    }
    await sleep(POLL_MS);
  }
}

/** The lines of a failed run's log that say what went wrong. */
function failureExcerpt(runId) {
  const log = run('gh', ['run', 'view', String(runId), '--log-failed', '-R', REPO], { check: false }).out;
  const lines = log
    .split('\n')
    .map((l) => l.replace(/^[^\t]*\t[^\t]*\t(\S+Z )?/, ''))
    .filter((l) => /error|fail|✘|expected|missing|leak|cannot|not found/i.test(l))
    .slice(0, 40);
  return lines.join('\n') || log.split('\n').slice(-40).join('\n');
}

function preflight() {
  const origin = run('git', ['remote', 'get-url', 'origin'], { check: false }).out;
  if (!origin.includes(REPO)) finish('SETUP_PROBLEM', `This folder is not a clone of ${REPO} (origin is "${origin}").`);
  if (!run('gh', ['auth', 'status'], { check: false }).ok) finish('SETUP_PROBLEM', 'The GitHub CLI is not logged in. Run `gh auth login` once (as sarayagent-alt).');
}

function push() {
  if (run('git', ['status', '--porcelain']).out) {
    finish('NOT_COMMITTED', 'There are changes that are not committed yet. Commit them (git add -A && git commit -m "…"), then run this again.');
  }
  git('fetch', '--prune', 'origin');
  const rebase = run('git', ['rebase', 'origin/main'], { check: false });
  if (!rebase.ok) {
    const conflicts = run('git', ['diff', '--name-only', '--diff-filter=U'], { check: false }).out;
    run('git', ['rebase', '--abort'], { check: false });
    finish(
      'CONFLICT',
      `The live site changed in the same places as this work:\n${conflicts || rebase.err}\n` +
        'Run `git rebase origin/main`, resolve the conflicts keeping both sides\' intent, `git rebase --continue`, then ship again. ' +
        'If a conflict is in a file listed in .github/CODEOWNERS, take the version from origin/main.'
    );
  }
  const changed = git('diff', '--name-only', 'origin/main...HEAD').out.split('\n').filter(Boolean);
  if (!changed.length) finish('NOTHING_TO_SHIP', 'Everything here is already on the live site; there is nothing new to push.');
  // A push holding an owner file would wait for approval, and every later design push would queue
  // behind it, so such changes are refused here and go to the owner instead.
  const locked = lockedFiles(changed);
  if (locked.length) {
    finish(
      'NEEDS_OWNER',
      `This work changes files reserved for the owner (.github/CODEOWNERS):\n${locked.join('\n')}\n` +
        'Undo those changes with `git checkout origin/main -- <file>` (or `git rm` for new files), commit, and ship again; ' +
        'what they were meant to do needs the owner.'
    );
  }
  const sha = git('rev-parse', 'HEAD').out;
  git('push', '--force-with-lease', 'origin', `HEAD:refs/heads/${BRANCH}`);
  fs.writeFileSync(path.join(git('rev-parse', '--git-dir').out, 'ship-last'), sha);
  console.log(`Pushed ${changed.length} changed file(s). Checking and publishing; this takes about 10 minutes.`);
  return sha;
}

async function report(sha) {
  const design = await waitFor('the checks to start', 5 * 60_000, () => gh('run', 'list', '--workflow', 'design.yml', '--commit', sha, '--limit', '1', '--json', 'databaseId,status,conclusion')?.[0]);
  const checked = await waitFor('the checks', 30 * 60_000, () => {
    const r = gh('run', 'view', String(design.databaseId), '--json', 'status,conclusion,databaseId');
    return r.status === 'completed' && r;
  });
  if (checked.conclusion === 'cancelled') finish('FAILED', 'This push was replaced by a newer one before it finished. Run `node scripts/ship.mjs --status` to follow the newest.');
  if (checked.conclusion !== 'success') finish('FAILED', `The checks failed, so nothing changed on the live site. What went wrong:\n${failureExcerpt(checked.databaseId)}`);

  const pr = gh('pr', 'list', '--head', BRANCH, '--state', 'all', '--limit', '10', '--json', 'number,state,url,headRefOid,mergeCommit').find((p) => p.headRefOid === sha);
  if (!pr) finish('FAILED', 'The checks passed but no pull request was made for this push. The owner needs to look at the "Design push" workflow.');
  if (pr.state === 'OPEN') {
    finish('WAITING_FOR_OWNER', `The checks passed. This change touches parts of the site reserved for the owner (booking, legal or technical files), so it goes live once the owner approves it: ${pr.url}`);
  }
  if (pr.state !== 'MERGED') finish('FAILED', `The request for this push was closed without going live: ${pr.url}`);

  const merged = pr.mergeCommit.oid;
  const deploy = await waitFor('the deploy to start', 5 * 60_000, () =>
    gh('run', 'list', '--workflow', 'deploy.yml', '--branch', 'main', '--limit', '20', '--json', 'databaseId,headSha').find((r) => r.headSha === merged)
  );
  const deployed = await waitFor('the deploy', 30 * 60_000, () => {
    const r = gh('run', 'view', String(deploy.databaseId), '--json', 'status,conclusion,databaseId');
    return r.status === 'completed' && r;
  });
  if (deployed.conclusion !== 'success') finish('FAILED', `The change passed the checks but publishing failed:\n${failureExcerpt(deployed.databaseId)}`);
  finish('LIVE', `The change is live on ${SITE}. (It may take a minute to show; refresh the page.)`);
}

preflight();
let sha;
if (process.argv.includes('--status')) {
  const last = path.join(git('rev-parse', '--git-dir').out, 'ship-last');
  sha = fs.existsSync(last) ? fs.readFileSync(last, 'utf8').trim() : git('rev-parse', 'HEAD').out;
} else {
  sha = push();
}
await report(sha);
