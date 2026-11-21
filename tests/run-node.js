// tests/run-node.js — Fast CLI test runner for Sublime Text (Cmd+B)
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Minimal browser globals so ouro.js, scraper.js, and graph.js initialize cleanly in Node
globalThis.window = globalThis;
globalThis.unsafeWindow = globalThis;
globalThis.location = {
    href: "file:///Users/christophe/bin/ouro/tests/ouro_test.html",
};
if (typeof globalThis.HTMLElement === "undefined") {
    globalThis.HTMLElement = class HTMLElement {};
}
const gmStore = new Map();
globalThis.GM_getValue = (k, def) => (gmStore.has(k) ? gmStore.get(k) : def);
globalThis.GM_setValue = (k, v) => {
    gmStore.set(k, v);
};
globalThis.GM_deleteValue = (k) => {
    gmStore.delete(k);
};
globalThis.GM_listValues = () => Array.from(gmStore.keys());
globalThis.GM_addStyle = () => {};

if (typeof globalThis.localStorage === "undefined") {
    const localMap = new Map();
    globalThis.localStorage = {
        getItem: (k) => (localMap.has(k) ? localMap.get(k) : null),
        setItem: (k, v) => localMap.set(k, String(v)),
        removeItem: (k) => localMap.delete(k),
        clear: () => localMap.clear(),
        key: (i) => Array.from(localMap.keys())[i] ?? null,
        get length() {
            return localMap.size;
        },
    };
}

const root = path.resolve(__dirname, "..");

// Load core, scraper, graph, storage & test suite into global context
const files = [
    "src/ouro.js",
    "src/scraper.js",
    "src/graph.js",
    "src/storage.js",
    "tests/test.js",
];

for (const file of files) {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInThisContext(code, { filename: file });
}

// Syntax-check all userscripts and build scripts
for (const dirRel of ["src/userscripts", "build"]) {
    const dirPath = path.join(root, dirRel);
    if (fs.existsSync(dirPath)) {
        for (const entry of fs.readdirSync(dirPath)) {
            if (!entry.endsWith(".js")) continue;
            const fullPath = path.join(dirPath, entry);
            const src = fs.readFileSync(fullPath, "utf8");
            new vm.Script(src, { filename: `${dirRel}/${entry}` });
        }
    }
}

// Initialize Ouro and run the test suite
Ouro.boros;
Ouro.exportTo(globalThis);
registerOuroTests();

const allPassed = Test.run();
process.exit(allPassed ? 0 : 1);
