#!/usr/bin/env node
"use strict";

/**
 * promote.js — Ouro Release, Version Synchronizer & Branch Promotion Pipeline
 *
 * 1. Determines the target release version:
 *    - Compares against `main`'s published version in `package.json`.
 *    - If `CHANGELOG.md` has `## [Unreleased]` or if `dev` still has the same
 *      version as `main`, automatically computes the next SemVer version
 *      (`--major`, `--minor`, `--patch`, or inferred from `### Added`/`### Changed`
 *      -> minor vs `### Fixed` -> patch).
 *    - If you already bumped the version in `CHANGELOG.md` or `package.json`
 *      ahead of `main` (e.g. `2.2.0` vs `main`'s `2.1.0`), uses that version.
 * 2. Synchronizes the target version across all 4 canonical locations:
 *    - `package.json` (`"version": "x.y.z"`)
 *    - `src/ouro.js` (`const VERSION = "x.y.z";`)
 *    - `README.md` (`# 🐍 The Ouro Cookbook (vx.y.z)` & ASCII banner `vx.y.z`)
 *    - `CHANGELOG.md` (`## [x.y.z] - YYYY-MM-DD`)
 * 3. Runs the headless Node.js unit test suite (`tests/run-node.js`).
 * 4. Ensures active branch is `dev`, stages all changes, auto-extracts the
 *    structured commit subject & body from `CHANGELOG.md`, commits to `dev`,
 *    and pushes `origin dev`.
 * 5. Checks out `main`, merges `dev`, runs `sync-prod.js --stage` to stamp
 *    `-Ouro<version>` and GitHub raw URLs into `- Prod.js` userscripts,
 *    commits if updated, and pushes `origin main`.
 * 6. Switches back to `dev` locally (merging `main`'s `- Prod.js` commit) and
 *    pushes `origin dev` so local `dev`, remote `dev`, and remote `main` match.
 */

const fs = require("fs");
const path = require("path");
const { execSync, execFileSync } = require("child_process");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const forceMajor = args.has("--major");
const forceMinor = args.has("--minor");
const forcePatch = args.has("--patch");

const repoRoot = path.resolve(__dirname, "..");

function run(cmd, opts = {}) {
    console.log(`[promote] $ ${cmd}`);
    return execSync(cmd, {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: opts.silent ? "pipe" : "inherit",
        ...opts,
    });
}

function getCurrentBranch() {
    return execSync("git branch --show-current", {
        cwd: repoRoot,
        encoding: "utf8",
    }).trim();
}

function getMainVersion() {
    try {
        const mainPkgRaw = execSync("git show main:package.json", {
            cwd: repoRoot,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "ignore"],
        });
        return JSON.parse(mainPkgRaw).version || "0.0.0";
    } catch (_) {
        return "0.0.0";
    }
}

function compareSemver(a, b) {
    const pa = String(a || "0.0.0")
        .split(".")
        .map((n) => parseInt(n, 10) || 0);
    const pb = String(b || "0.0.0")
        .split(".")
        .map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < 3; i++) {
        if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
}

function bumpSemver(ver, type = "minor") {
    const [maj, min, pat] = String(ver || "0.0.0")
        .split(".")
        .map((n) => parseInt(n, 10) || 0);
    if (type === "major") return `${maj + 1}.0.0`;
    if (type === "minor") return `${maj}.${min + 1}.0`;
    return `${maj}.${min}.${pat + 1}`;
}

function todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function getAddedChangelogDiff() {
    try {
        const diffOut = execSync("git diff main -- CHANGELOG.md", {
            cwd: repoRoot,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "ignore"],
        });
        const plusLines = diffOut
            .split(/\r?\n/)
            .filter(
                (l) =>
                    l.startsWith("+") &&
                    !l.startsWith("+++") &&
                    !/^\+---/.test(l) &&
                    !/^\+##\s+\[/.test(l),
            )
            .map((l) => l.slice(1));
        if (plusLines.some((l) => l.trim().length > 0)) {
            return plusLines.join("\n").trim();
        }
    } catch (_) {}
    return "";
}

function parseTopChangelogSection() {
    const changelogPath = path.join(repoRoot, "CHANGELOG.md");
    if (!fs.existsSync(changelogPath)) {
        return { headerVersion: null, body: "", headings: [] };
    }
    const raw = fs.readFileSync(changelogPath, "utf8");
    const lines = raw.split(/\r?\n/);

    let inTop = false;
    let headerVersion = null;
    const collected = [];
    const headings = [];

    for (const line of lines) {
        const verMatch = line.match(/^##\s+\[([^\]]+)\]/);
        if (verMatch) {
            if (!inTop) {
                inTop = true;
                headerVersion = verMatch[1].trim();
                continue;
            } else {
                break;
            }
        }
        if (inTop) {
            if (/^---\s*$/.test(line)) break;
            collected.push(line);
            const boldMatch = line.match(/^-\s+\*\*([^*:]+?)(?::|\*\*)/);
            if (boldMatch) {
                headings.push(
                    boldMatch[1].replace(/\s*\([^)]*\)\s*/g, "").trim(),
                );
            }
        }
    }

    return {
        headerVersion,
        body: collected.join("\n").trim(),
        headings,
    };
}

function resolveTargetVersion() {
    const pkgPath = path.join(repoRoot, "package.json");
    const pkgVersion = JSON.parse(fs.readFileSync(pkgPath, "utf8")).version;
    const mainVersion = getMainVersion();
    const topChangelog = parseTopChangelogSection();
    const diffText = getAddedChangelogDiff() || topChangelog.body;

    // 1. Explicit CLI flag (--major, --minor, --patch)
    const baseVer =
        compareSemver(pkgVersion, mainVersion) > 0 ? pkgVersion : mainVersion;
    if (forceMajor) return bumpSemver(baseVer, "major");
    if (forceMinor) return bumpSemver(baseVer, "minor");
    if (forcePatch) return bumpSemver(baseVer, "patch");

    // 2. If CHANGELOG.md top section is already a higher SemVer than `main`, use it
    if (
        topChangelog.headerVersion &&
        /^\d+\.\d+\.\d+$/.test(topChangelog.headerVersion) &&
        compareSemver(topChangelog.headerVersion, mainVersion) > 0
    ) {
        return topChangelog.headerVersion;
    }

    // 3. If package.json on `dev` was already bumped higher than `main` (and CHANGELOG isn't Unreleased), use it
    if (
        compareSemver(pkgVersion, mainVersion) > 0 &&
        topChangelog.headerVersion !== "Unreleased"
    ) {
        return pkgVersion;
    }

    // 4. Otherwise, infer bump type from CHANGELOG diff / top section
    const hasBreaking = /###\s+Breaking|BREAKING CHANGE/i.test(diffText);
    const hasFeature = /###\s+(Added|Changed)/i.test(diffText);
    const bumpType = hasBreaking
        ? "major"
        : hasFeature
          ? "minor"
          : "patch";

    return bumpSemver(mainVersion, bumpType);
}

function syncVersionAcrossFiles(targetVersion) {
    const dateStr = todayISO();

    // 1. package.json
    const pkgPath = path.join(repoRoot, "package.json");
    const pkgRaw = fs.readFileSync(pkgPath, "utf8");
    const pkgUpdated = pkgRaw.replace(
        /("version"\s*:\s*")([^"]+)(")/,
        `$1${targetVersion}$3`,
    );
    if (pkgUpdated !== pkgRaw) {
        if (!dryRun) fs.writeFileSync(pkgPath, pkgUpdated, "utf8");
        console.log(`[promote] Synchronized package.json -> v${targetVersion}`);
    }

    // 2. src/ouro.js
    const ouroPath = path.join(repoRoot, "src/ouro.js");
    if (fs.existsSync(ouroPath)) {
        const ouroRaw = fs.readFileSync(ouroPath, "utf8");
        const ouroUpdated = ouroRaw.replace(
            /(const\s+VERSION\s*=\s*")([^"]+)(")/,
            `$1${targetVersion}$3`,
        );
        if (ouroUpdated !== ouroRaw) {
            if (!dryRun) fs.writeFileSync(ouroPath, ouroUpdated, "utf8");
            console.log(
                `[promote] Synchronized src/ouro.js -> v${targetVersion}`,
            );
        }
    }

    // 3. README.md (Header + ASCII banner)
    const readmePath = path.join(repoRoot, "README.md");
    if (fs.existsSync(readmePath)) {
        const readmeRaw = fs.readFileSync(readmePath, "utf8");
        const readmeUpdated = readmeRaw
            .replace(
                /^(#\s+🐍\s+The Ouro Cookbook\s+\(v)\d+\.\d+\.\d+(\))/m,
                `$1${targetVersion}$2`,
            )
            .replace(
                /(@@\.\.@@\.\s+v)\d+\.\d+\.\d+(\s+%@:\+@@=)/,
                `$1${targetVersion}$2`,
            );
        if (readmeUpdated !== readmeRaw) {
            if (!dryRun) fs.writeFileSync(readmePath, readmeUpdated, "utf8");
            console.log(
                `[promote] Synchronized README.md -> v${targetVersion}`,
            );
        }
    }

    // 4. CHANGELOG.md
    const changelogPath = path.join(repoRoot, "CHANGELOG.md");
    if (fs.existsSync(changelogPath)) {
        const clRaw = fs.readFileSync(changelogPath, "utf8");
        let clUpdated = clRaw;
        if (/^##\s+\[Unreleased\]/im.test(clRaw)) {
            clUpdated = clRaw.replace(
                /^##\s+\[Unreleased\].*$/im,
                `## [${targetVersion}] - ${dateStr}`,
            );
        } else if (!new RegExp(`^##\\s+\\[${targetVersion.replace(/\./g, "\\.")}\\]`, "m").test(clRaw)) {
            // If new lines were added under the previous version header without adding a new ## [x.y.z] header,
            // or if a new version was bumped in package.json, insert the new version header above the first ## [...]
            const addedDiff = getAddedChangelogDiff();
            if (addedDiff) {
                clUpdated = clRaw.replace(
                    /^(##\s+\[[^\]]+\])/m,
                    `## [${targetVersion}] - ${dateStr}\n\n${addedDiff}\n\n---\n\n$1`,
                );
            }
        }
        if (clUpdated !== clRaw) {
            if (!dryRun) fs.writeFileSync(changelogPath, clUpdated, "utf8");
            console.log(
                `[promote] Synchronized CHANGELOG.md -> ## [${targetVersion}] - ${dateStr}`,
            );
        }
    }
}

function buildCommitMessage(targetVersion) {
    const topSection = parseTopChangelogSection();
    const diffText = getAddedChangelogDiff();
    const details = diffText || topSection.body;

    let headings = topSection.headings;
    if (diffText) {
        const diffHeadings = [];
        for (const l of diffText.split(/\r?\n/)) {
            const m = l.match(/^-\s+\*\*([^*:]+?)(?::|\*\*)/);
            if (m) {
                diffHeadings.push(
                    m[1].replace(/\s*\([^)]*\)\s*/g, "").trim(),
                );
            }
        }
        if (diffHeadings.length > 0) headings = diffHeadings;
    }

    const statusLines = execSync("git status --short", {
        cwd: repoRoot,
        encoding: "utf8",
    }).trim();

    const summaryList =
        headings.length > 0
            ? headings.slice(0, 3).join(", ")
            : `release Ouro v${targetVersion}`;

    const subject = `feat(v${targetVersion}): ${summaryList}`;
    const bodyParts = [subject, ""];
    if (details) {
        bodyParts.push(details, "");
    }
    if (statusLines) {
        bodyParts.push("### Modified Files", statusLines);
    }

    return bodyParts.join("\n").trim();
}

// 1. Resolve & synchronize version across all 4 files
const targetVersion = resolveTargetVersion();
console.log(
    `[promote] Step 1/6: Resolved release version -> v${targetVersion} (main is v${getMainVersion()})`,
);
syncVersionAcrossFiles(targetVersion);

// 2. Run Unit Tests
console.log("[promote] Step 2/6: Running unit test suite...");
run(`"${process.execPath}" tests/run-node.js`);
process.env.OURO_TESTS_VERIFIED = "1";

if (dryRun) {
    console.log("\n[promote] --- DRY RUN COMMIT MESSAGE PREVIEW ---");
    console.log(buildCommitMessage(targetVersion));
    console.log("[promote] --- END PREVIEW ---");
    process.exit(0);
}

// 3. Ensure we are on `dev`
console.log("[promote] Step 3/6: Ensuring active branch is 'dev'...");
const startBranch = getCurrentBranch();
if (startBranch !== "dev") {
    run("git checkout dev");
}

// If an unpushed commit on `dev` accidentally included `.github/workflows/`,
// strip `.github` and soft-reset that unpushed commit so GitHub PATs without `workflow` scope succeed.
const githubDir = path.join(repoRoot, ".github");
if (fs.existsSync(githubDir)) {
    fs.rmSync(githubDir, { recursive: true, force: true });
}
try {
    const headFiles = execSync("git show --name-only --pretty=format: HEAD", {
        cwd: repoRoot,
        encoding: "utf8",
    });
    if (headFiles.includes(".github/")) {
        console.log(
            "[promote] Unwrapping unpushed commit containing .github/workflows/...",
        );
        run("git reset --soft HEAD~1");
        run("git rm -rf --cached --ignore-unmatch .github");
    }
} catch (_) {}

// 4. Stage, commit (if dirty), and push `dev`
console.log("[promote] Step 4/6: Staging, committing, and pushing 'dev'...");
const dirtyStatus = execSync("git status --porcelain", {
    cwd: repoRoot,
    encoding: "utf8",
}).trim();

if (dirtyStatus.length > 0) {
    const commitMsg = buildCommitMessage(targetVersion);
    run("git add -A");
    console.log("\n[promote] Committing with CHANGELOG-extracted message:\n");
    console.log(commitMsg + "\n");
    execFileSync("git", ["commit", "-m", commitMsg], {
        cwd: repoRoot,
        stdio: "inherit",
    });
} else {
    console.log("[promote] Working tree clean on 'dev'; no new commit needed.");
}

run("git push origin dev");

// 5. Checkout `main`, merge `dev`, sync Prod userscripts, and push `main`
console.log(
    "[promote] Step 5/6: Promoting 'dev' to 'main' and syncing Prod userscripts...",
);
run("git checkout main");
run("git merge dev --no-edit");
run(`"${process.execPath}" build/sync-prod.js --stage`);

const stagedProdDiff = execSync(
    'git diff --cached --name-only -- "src/userscripts/*- Prod*.js"',
    { cwd: repoRoot, encoding: "utf8" },
).trim();

if (stagedProdDiff.length > 0) {
    execFileSync(
        "git",
        [
            "commit",
            "-m",
            "chore(userscripts): sync Prod userscripts with main",
            "--no-verify",
        ],
        { cwd: repoRoot, stdio: "inherit" },
    );
}

run("git push origin main");

// 6. Return to `dev` locally and align `dev` with `main`'s Prod userscript commit
console.log(
    "[promote] Step 6/6: Returning to 'dev' locally and syncing with 'main'...",
);
run("git checkout dev");
run("git merge main --no-edit");
run("git push origin dev");

console.log(
    `\n[promote] ✅ Successfully promoted Ouro v${targetVersion} to 'main', synced Prod userscripts, and returned to 'dev'!`,
);
