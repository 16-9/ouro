// ==UserScript==
// @name         Ouro Framework Test Suite
// @namespace    http://tampermonkey.net/
// @version      8.2
// @description  Validate the Ouro framework with correct initialization timing
// @author       Christophe
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_addStyle
// @match        file:///*/ouro_test.html

// @require      file:///Users/christophe/bin/ouro/src/ouro.js
// @require      file:///Users/christophe/bin/ouro/src/scraper.js
// @require      file:///Users/christophe/bin/ouro/src/graph.js
// @require      file:///Users/christophe/bin/ouro/src/storage.js
// @require      file:///Users/christophe/bin/ouro/tests/test.js
// ==/UserScript==

// --- LOCAL DEVELOPMENT REQUIRES (Point directly to your Mac repo) ---
// @require      file:///Users/christophe/bin/ouro/src/ouro.js
// @require      file:///Users/christophe/bin/ouro/src/scraper.js
// @require      file:///Users/christophe/bin/ouro/src/graph.js
// @require      file:///Users/christophe/bin/ouro/src/storage.js
// @require      file:///Users/christophe/bin/ouro/tests/test.js

// --- GITHUB CLOUD REQUIRES (Uncomment when testing from main branch) ---
// @require      https://raw.githubusercontent.com/16-9/ouro/main/src/ouro.js
// @require      https://raw.githubusercontent.com/16-9/ouro/main/src/scraper.js
// @require      https://raw.githubusercontent.com/16-9/ouro/main/src/graph.js
// @require      https://raw.githubusercontent.com/16-9/ouro/main/src/storage.js
// @require      https://raw.githubusercontent.com/16-9/ouro/main/tests/test.js

/* global Ouro HTMLPage Page registerOuroTests Test runtests */

(function () {
    "use strict";

    // 0. Mirror console.log / info / warn / error to <div id="UnitTests">
    (function hookConsoleToDOM() {
        GM_addStyle(`
            #UnitTests {
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size: 12px;
                line-height: 1.45;
            }
            #UnitTests .console-span {
                display: block;
                white-space: pre-wrap;
                word-break: break-word;
                padding: 2px 6px;
                border-bottom: 1px solid rgba(128, 128, 128, 0.15);
            }
            #UnitTests .console-info  { color: #0969da; }
            #UnitTests .console-warn  { color: #9a6700; background: rgba(255, 212, 59, 0.12); }
            #UnitTests .console-error { color: #cf222e; background: rgba(255, 129, 130, 0.12); font-weight: 600; }
        `);

        const formatArg = (arg) => {
            if (typeof arg === "string") return arg;
            if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
            if (typeof arg === "object" && arg !== null) {
                try {
                    return JSON.stringify(arg);
                } catch (_) {
                    return String(arg);
                }
            }
            return String(arg);
        };

        const appendSpan = (level, args) => {
            const container = document.getElementById("UnitTests");
            if (!container) return;

            const span = document.createElement("span");
            span.className = `console-span console-${level}`;
            span.textContent = args.map(formatArg).join(" ");
            container.appendChild(span);
        };

        const levels = ["log", "info", "warn", "error"];
        const originals = {};

        for (const level of levels) {
            originals[level] = console[level].bind(console);

            const wrapped = (...args) => {
                originals[level](...args);
                appendSpan(level, args);
            };

            console[level] = wrapped;
            if (typeof unsafeWindow !== "undefined" && unsafeWindow.console) {
                unsafeWindow.console[level] = wrapped;
            }
        }
    })();

    // 1. Initialize Ouro core engine and export globals
    Ouro.boros;
    Ouro.exportTo(unsafeWindow);

    console.groupCollapsed("[Ouro — Page Definitions]");

    const testPage = HTMLPage.register({
        name: "testPage",
        description: "Run Ouro tests",
        class: { routeTemplate: "/ouro_test.html" },
        scrape() {
            this.data = { status: "testing" };
        },
        process() {
            if (typeof registerOuroTests === "function") {
                registerOuroTests();
            }

            if (typeof Test !== "undefined") {
                unsafeWindow.Test = Test;
                unsafeWindow.runtests = runtests;
                Test.run();
            }
        },
    });

    Object.defineProperty(Array.prototype, "parallel", {
        value: async function (asyncCallback) {
            return Promise.all(this.map(asyncCallback));
        },
        writable: true,
        configurable: true,
        enumerable: false,
    });

    function pageProcess(url = window.location.href) {
        console.log(`[Ouro — SPA Router] URL changed to: ${url}`);

        Page.process(url)
            .then((activePage) => {
                if (typeof unsafeWindow !== "undefined") {
                    unsafeWindow.thisPage = activePage;
                }
            })
            .catch((err) => {
                console.error(
                    "[Ouro — ❌ Fatal Crash] The lifecycle threw an error:",
                    err,
                );
            });
    }

    (function watchSPA() {
        let lastUrl = window.location.href;

        const checkUrlChange = () => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                setTimeout(() => pageProcess(currentUrl), 100);
            }
        };

        window.addEventListener("popstate", checkUrlChange);

        const originalPush = history.pushState;
        history.pushState = function () {
            originalPush.apply(this, arguments);
            checkUrlChange();
        };

        const originalReplace = history.replaceState;
        history.replaceState = function () {
            originalReplace.apply(this, arguments);
            checkUrlChange();
        };
    })();

    console.groupEnd();

    pageProcess();
})();
