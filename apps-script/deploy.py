#!/usr/bin/env python3
"""Push apps-script/ to a Shorashim Apps Script project and point its web app deployment at it.

Usage:
  python3 apps-script/deploy.py --env staging ["description"]   # staging (npm run test:e2e does this)
  python3 apps-script/deploy.py ["description"]                 # production
  python3 apps-script/deploy.py --app console [--env staging]   # the owner console (console/)
  python3 apps-script/deploy.py --status                        # which commit each env is running

Two apps share this script. `booking` (default) is the booking web app in apps-script/. `console`
is the owner console in console/: a separate project whose web app only the owner account can
open. It calls the booking web app's signed `console` actions and is given that app's URL and
signing secret in its own generated Config.js. Its IDs are stored under console* keys in the same
config files.

Every deployed version is labelled with the commit it came from ("a1b2c3d description"), so
--status shows exactly what is live. Guards:
- the backend files (apps-script/, shared/) must be committed; staging accepts --allow-dirty, which
  labels the version "<sha>-dirty", so work in progress can be tried there;
- production also requires the staging suite (npm run test:e2e) to have passed on this exact
  commit. --force skips that, for emergencies only.

--content-only updates the project code without releasing it to the web app. Use it before
adding OAuth scopes: the owner authorizes them by running `setup` in the editor, and only then
is the new version released, so the live web app never runs with unauthorized scopes.

The booking rules come from shared/rules.js, the same module the website imports; the `export `
keyword is stripped on the way up so Apps Script sees plain globals.

IDs and secrets live in ~/.config/gcloud/shorashim/booking-config.json (production) and
booking-config.staging.json, never in this public repo. They are written into a generated
Config.js file that exists only inside the Apps Script project. The first run creates the project
and a web app deployment whose URL then stays fixed.
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys

from google.auth.transport.requests import AuthorizedSession, Request
from google.oauth2.credentials import Credentials

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
SHARED = ROOT / "shared"
CONSOLE = ROOT / "console"
CRED_DIR = pathlib.Path.home() / ".config/gcloud/shorashim"
ENVS = {
    "production": {"config": CRED_DIR / "booking-config.json", "title": "Shorashim Booking"},
    "staging": {"config": CRED_DIR / "booking-config.staging.json", "title": "Shorashim Booking (staging)"},
}
BACKEND_PATHS = ("apps-script", "shared", "console")
# Where each app keeps its project IDs in the env config file, and its project title suffix.
APPS = {
    "booking": {"script": "scriptId", "deployment": "deploymentId", "url": "webAppUrl", "title": ""},
    "console": {"script": "consoleScriptId", "deployment": "consoleDeploymentId", "url": "consoleUrl", "title": " Console"},
}
API = "https://script.googleapis.com/v1"
CONFIG_KEYS = (
    "calendars", "hmacSecret", "ownerEmail", "notifyEmail", "webAppUrl", "recaptchaSecret", "adminSheetId",
    "availabilitySheetId", "testHooks", "pricesUrl",
)


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()


def e2e_passed(tree):
    """scripts/e2e.sh appends the tree hash of every commit the staging suite passed on."""
    marker = pathlib.Path(git("rev-parse", "--absolute-git-dir")) / "e2e-passed"
    return marker.exists() and tree in marker.read_text().split()


def session():
    creds = Credentials.from_authorized_user_file(str(CRED_DIR / "token.json"))
    creds.refresh(Request())
    return AuthorizedSession(creds)


def call(s, method, url, **kwargs):
    r = s.request(method, url, **kwargs)
    if not r.ok:
        sys.exit(f"{method} {url} -> {r.status_code}: {r.text[:800]}")
    return r.json()


def save(path, cfg):
    path.write_text(json.dumps(cfg, indent=2, ensure_ascii=False))
    path.chmod(0o600)


def apps_script_source(module_text):
    """Apps Script has no modules: every file shares one global scope. Dropping the `export `
    keyword turns shared/rules.js back into the plain globals the script expects, which is why it
    is written with `var` and function declarations and no export list."""
    return re.sub(r"^export ", "", module_text, flags=re.M)


def project_files(cfg):
    files = [{"name": "appsscript", "type": "JSON", "source": (HERE / "appsscript.json").read_text()}]
    files.append({"name": "rules", "type": "SERVER_JS", "source": apps_script_source((SHARED / "rules.js").read_text())})
    for path in sorted((HERE / "src").iterdir()):
        kind = {".js": "SERVER_JS", ".html": "HTML"}.get(path.suffix)
        if kind:
            files.append({"name": path.stem, "type": kind, "source": path.read_text()})
    config = {key: cfg.get(key, "") for key in CONFIG_KEYS}
    config["testHooks"] = cfg.get("testHooks") is True
    source = "// Generated by deploy.py. Do not edit.\nvar CONFIG = " + json.dumps(config, indent=2, ensure_ascii=False) + ";\n"
    files.append({"name": "Config", "type": "SERVER_JS", "source": source})
    return files


def console_files(cfg):
    """The console project: its manifest, page and server file, plus a generated Config.js with the
    booking web app's URL and the shared signing secret. Never committed, like the booking Config.js."""
    files = [
        {"name": "appsscript", "type": "JSON", "source": (CONSOLE / "appsscript.json").read_text()},
        {"name": "Server", "type": "SERVER_JS", "source": (CONSOLE / "Server.js").read_text()},
        {"name": "Console", "type": "HTML", "source": (CONSOLE / "Console.html").read_text()},
    ]
    config = {"bookingUrl": cfg["webAppUrl"], "hmacSecret": cfg["hmacSecret"]}
    source = "// Generated by deploy.py. Do not edit.\nvar CONFIG = " + json.dumps(config, indent=2) + ";\n"
    files.append({"name": "Config", "type": "SERVER_JS", "source": source})
    return files


def app_files(app, cfg):
    return console_files(cfg) if app == "console" else project_files(cfg)


def push_version(s, cfg, description, app="booking"):
    script = f"{API}/projects/{cfg[APPS[app]['script']]}"
    call(s, "PUT", f"{script}/content", json={"files": app_files(app, cfg)})
    return call(s, "POST", f"{script}/versions", json={"description": description[:250]})["versionNumber"]


def status():
    s = session()
    for env, spec in ENVS.items():
        cfg = json.loads(spec["config"].read_text())
        for app, keys in APPS.items():
            if not cfg.get(keys["deployment"]):
                print(f"{env:<11} {app:<8} not deployed")
                continue
            script_id = cfg[keys["script"]]
            dep = call(s, "GET", f"{API}/projects/{script_id}/deployments/{cfg[keys['deployment']]}")
            version = dep["deploymentConfig"].get("versionNumber")
            desc = next(
                (v.get("description", "") for v in call(s, "GET", f"{API}/projects/{script_id}/versions").get("versions", [])
                 if v.get("versionNumber") == version),
                "",
            )
            print(f"{env:<11} {app:<8} version {version}: {desc}")
    print(f"{'HEAD':<11} {git('rev-parse', '--short', 'HEAD')} {git('log', '-1', '--format=%s')}")


def main():
    p = argparse.ArgumentParser(description="Deploy the booking backend to Apps Script.")
    p.add_argument("description", nargs="?", default="deploy")
    p.add_argument("--env", choices=ENVS, default="production")
    p.add_argument("--app", choices=APPS, default="booking", help="booking web app (default) or the owner console")
    p.add_argument("--content-only", action="store_true", help="update the editor code without releasing it")
    p.add_argument("--allow-dirty", action="store_true", help="staging only: deploy uncommitted backend changes")
    p.add_argument("--force", action="store_true", help="production only: skip the staging-suite check")
    p.add_argument("--status", action="store_true", help="show which commit each environment runs")
    args = p.parse_args()
    if args.status:
        return status()

    sha = git("rev-parse", "--short", "HEAD")
    dirty = bool(git("status", "--porcelain", "--", *BACKEND_PATHS))
    if dirty and not (args.allow_dirty and args.env == "staging"):
        sys.exit(
            "Uncommitted changes in apps-script/, shared/ or console/. Commit them first"
            + (", or use --allow-dirty to try them on staging." if args.env == "staging" else ".")
        )
    if args.env == "production" and not args.force and not e2e_passed(git("rev-parse", "HEAD^{tree}")):
        sys.exit(f"The staging suite has not passed on {sha}. Run `npm run test:e2e` first (or --force in an emergency).")
    label = f"{sha}{'-dirty' if dirty else ''} {args.description}"

    spec = ENVS[args.env]
    cfg = json.loads(spec["config"].read_text())
    keys = APPS[args.app]
    if args.app == "console" and not cfg.get("webAppUrl"):
        sys.exit("Deploy the booking web app to this environment first: the console needs its URL.")
    s = session()

    if not cfg.get(keys["script"]):
        cfg[keys["script"]] = call(s, "POST", f"{API}/projects", json={"title": spec["title"].replace("Booking", "Booking" + keys["title"])})["scriptId"]
        save(spec["config"], cfg)

    if not cfg.get(keys["deployment"]):
        version = push_version(s, cfg, "initial", args.app)
        dep = call(
            s,
            "POST",
            f"{API}/projects/{cfg[keys['script']]}/deployments",
            json={"versionNumber": version, "manifestFileName": "appsscript", "description": "web app"},
        )
        cfg[keys["deployment"]] = dep["deploymentId"]
        cfg[keys["url"]] = next(
            (p["webApp"]["url"] for p in dep.get("entryPoints", []) if "webApp" in p),
            f"https://script.google.com/macros/s/{dep['deploymentId']}/exec",
        )
        save(spec["config"], cfg)

    script_id = cfg[keys["script"]]
    if args.content_only:
        call(s, "PUT", f"{API}/projects/{script_id}/content", json={"files": app_files(args.app, cfg)})
        print(f"[{args.env} {args.app}] Updated project code only (not released to the web app).")
        print(f"Editor:  https://script.google.com/d/{script_id}/edit")
        return

    version = push_version(s, cfg, label, args.app)
    call(
        s,
        "PUT",
        f"{API}/projects/{script_id}/deployments/{cfg[keys['deployment']]}",
        json={
            "deploymentConfig": {
                "scriptId": script_id,
                "versionNumber": version,
                "manifestFileName": "appsscript",
                "description": label[:250],
            }
        },
    )
    print(f"[{args.env} {args.app}] Deployed version {version}: {label}")
    print(f"Web app: {cfg[keys['url']]}")
    print(f"Editor:  https://script.google.com/d/{script_id}/edit")


if __name__ == "__main__":
    main()
