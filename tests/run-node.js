// tests/run-node.js — Fast CLI test runner for Sublime Text (Cmd+B)
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Minimal browser globals so ouro.js initializes cleanly in Node
globalThis.window = globalThis;
globalThis.unsafeWindow = globalThis;
globalThis.location = {
    href: "file:///Users/christophe/bin/ouro/tests/ouro_test.html",
};
globalThis.GM_getValue = () => null;
globalThis.GM_setValue = () => {};
globalThis.GM_deleteValue = () => {};
globalThis.GM_listValues = () => [];
globalThis.GM_addStyle = () => {};

const root = path.resolve(__dirname, "..");

// Load core & test suite into global context
const files = ["src/ouro.js", "tests/test.js"];

for (const file of files) {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    vm.runInThisContext(code, { filename: file });
}

// Initialize Ouro and run the test suite
Ouro.boros;
Ouro.exportTo(globalThis);
registerOuroTests();

const allPassed = Test.run();
process.exit(allPassed ? 0 : 1);
