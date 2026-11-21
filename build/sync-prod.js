#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const stage = args.has("--stage");
const checkOnly = args.has("--check");

const repoRoot = path.resolve(__dirname, "..");
const userscriptsDir = path.join(repoRoot, "src/userscripts");

// [Best Practice] Extract Ouro version directly from package.json
const { version: ouroVersion } = require(path.join(repoRoot, "package.json"));

function getCurrentBranch() {
    try {
        return execSync("git branch --show-current", {
            cwd: repoRoot,
            encoding: "utf8",
        }).trim();
    } catch (_) {
        return "";
    }
}

function toProdContent(devContent) {
    return (
        devContent
            // 1. Swap DEV for Prod in the userscript name
            .replace(/^(\/\/\s*@name\s+.*?)(\s*-\s*DEV)(\s*)$/m, "$1 - Prod$3")
            // 2. Append the Ouro version with NO spaces (Tampermonkey compliant)
            .replace(
                /^(\/\/\s*@version\s+[\d\.]+)(.*)$/m,
                `$1-Ouro${ouroVersion}`,
            )
            // 3. Swap local @require paths for GitHub raw URLs
            .replace(
                /^(\/\/\s*@require\s+)file:\/\/\/Users\/christophe\/bin\/ouro\/(src|tests)\/(.+)$/gm,
                "$1https://raw.githubusercontent.com/16-9/ouro/main/$2/$3",
            )
    );
}

const branch = getCurrentBranch();
if (!force && !checkOnly && branch !== "main") {
    console.log(
        `[sync-prod] Current branch is '${branch || "detached"}'. Skipping Prod userscript sync (only runs on 'main' or with --force).`,
    );
    process.exit(0);
}

const entries = fs.readdirSync(userscriptsDir);
const devFiles = entries.filter((f) => /- DEV(\.user)?\.js$/i.test(f));

let updatedCount = 0;

for (const devFile of devFiles) {
    const devPath = path.join(userscriptsDir, devFile);
    const prodFile = devFile.replace(/- DEV((\.user)?\.js)$/i, "- Prod$1");
    const prodPath = path.join(userscriptsDir, prodFile);

    const devSource = fs.readFileSync(devPath, "utf8");
    const expectedProd = toProdContent(devSource);
    const currentProd = fs.existsSync(prodPath)
        ? fs.readFileSync(prodPath, "utf8")
        : null;

    if (checkOnly) {
        if (currentProd !== expectedProd) {
            console.error(
                `[sync-prod] Out of sync: ${prodFile} does not match ${devFile}`,
            );
            process.exit(1);
        }
        continue;
    }

    if (currentProd !== expectedProd) {
        fs.writeFileSync(prodPath, expectedProd, "utf8");
        updatedCount++;
        console.log(
            `[sync-prod] Updated: ${path.relative(repoRoot, prodPath)}`,
        );
    } else {
        console.log(
            `[sync-prod] Up to date: ${path.relative(repoRoot, prodPath)}`,
        );
    }

    if (stage) {
        execSync(`git add "${prodPath}"`, { cwd: repoRoot, stdio: "inherit" });
    }
}

process.exit(0);
