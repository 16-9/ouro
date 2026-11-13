/* global unsafeWindow Ouro Extension Class Trait globalThis GM_xmlhttpRequest GM_addStyle */
Ouro.pageSystemExtension = new Extension(
    "Page System",
    "Comprehensive scraping and routing framework built on top of Ouro classes, traits, and native wrappers.",
    function () {
        // ============================================================================
        // ROUTE URL as an extension to native URL
        // ============================================================================
        const RouteURL = Class({
            name: "RouteURL",
            description:
                "A reactive, single-source-of-truth URL template and router.",

            traits: [
                Trait.native(URL, {
                    state: "native",
                    only: [
                        "href",
                        "pathname",
                        "search",
                        "searchParams",
                        "hash",
                        "host",
                        "toJSON",
                    ],
                    alias: { toJSON: "nativeToJSON" },
                }),
            ],

            // --- FLATTENED PROPERTIES ---
            builder: "",
            args: {},
            pattern: null, // Keeps a reference to the canonical Regex for variable extraction
            patterns: [], // The combined array of all valid match patterns
            variables: [],
            _providedPatterns: [], // Temporary storage during initialization

            // --- FLATTENED METHODS ---
            initialize: function (...inputs) {
                // 1. Defensively unpack if a raw routeTemplate array was passed directly
                if (inputs.length === 1 && Array.isArray(inputs[0])) {
                    inputs = inputs[0];
                }

                let builderString = "no route";
                let args = {};
                let matchPatterns = [];

                if (inputs.length > 0) {
                    // 1. The first element is ALWAYS the canonical builder string
                    builderString = inputs[0];

                    // 2. Dynamically sort the remaining arguments by type
                    for (let i = 1; i < inputs.length; i++) {
                        const item = inputs[i];

                        if (
                            typeof item === "object" &&
                            item !== null &&
                            !Array.isArray(item) &&
                            !(item instanceof RegExp)
                        ) {
                            args = item;
                        } else if (item !== undefined) {
                            matchPatterns.push(item);
                        }
                    }
                }

                // Pre-compile all strings into RegExp objects immediately
                this._providedPatterns = matchPatterns.map((pat) => {
                    if (pat instanceof RegExp || typeof pat === "function")
                        return pat;

                    if (typeof pat === "string") {
                        if (pat.includes("*")) {
                            const regexStr = pat
                                .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
                                .replace(/\*/g, ".*");
                            return new RegExp(`^${regexStr}$`, "i");
                        } else {
                            const escaped = pat.replace(
                                /[.*+?^${}()|[\]\\]/g,
                                "\\$&",
                            );
                            return new RegExp(escaped, "i");
                        }
                    }
                    return pat;
                });

                this.args = args;
                this.builder = builderString; // Triggers after.builder
            },

            build: function () {
                const hasAllVariables = this.variables.every(
                    (varName) =>
                        Object.prototype.hasOwnProperty.call(
                            this.args,
                            varName,
                        ) &&
                        this.args[varName] !== undefined &&
                        this.args[varName] !== null,
                );

                if (
                    !hasAllVariables ||
                    !this.builder ||
                    this.builder === "no route"
                ) {
                    this._nativeObject = undefined;
                    return;
                }

                try {
                    let actualUrl = this.builder;
                    for (const varName of this.variables) {
                        const rawValue = this.args[varName];
                        actualUrl = actualUrl
                            .split(`\${${varName}}`)
                            .join(rawValue);
                    }
                    this._nativeObject = new URL(actualUrl);
                } catch (err) {
                    this._nativeObject = undefined;
                }
            },

            match: function (testUrlStr) {
                if (!this.patterns || this.patterns.length === 0) return null;

                for (const pat of this.patterns) {
                    // 1. Function matcher
                    if (typeof pat === "function") {
                        if (pat(testUrlStr)) return {};
                    }
                    // 2. RegExp Matcher
                    else if (pat instanceof RegExp) {
                        const result = testUrlStr.match(pat);
                        if (result) {
                            if (pat === this.pattern) {
                                const extracted = {};
                                this.variables.forEach((varName, idx) => {
                                    extracted[varName] = result[idx + 1];
                                });
                                return extracted;
                            }
                            return {};
                        }
                    }
                }

                return null; // No match found
            },

            get signature() {
                const obsfuscatedKeys = "url|token|key";
                const obsfuscated = new RegExp(obsfuscatedKeys, "i");
                const sign = Object.entries(this.args || {})
                    .filter(([k]) => !obsfuscated.test(k))
                    .map(([k, v]) => v)
                    .join("|");
                return sign === "" ? "_blank_" : sign;
            },

            // --- AOP ADVICE ---
            after: {
                builder(newBuilder) {
                    const builderStr = Array.isArray(newBuilder)
                        ? newBuilder[0]
                        : newBuilder;

                    if (
                        !builderStr ||
                        typeof builderStr !== "string" ||
                        builderStr === "no route"
                    ) {
                        this.variables = [];
                        this.pattern = null;
                        this.patterns = [];
                        this._nativeObject = undefined;
                        return;
                    }

                    let patternTarget = builderStr
                        .replace(/^https?:/i, "")
                        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const parts = patternTarget.split(/\\\$\\\{(.+?)\\\}/);

                    this.variables = parts.filter((_, i) => i % 2 !== 0);
                    const mappedRegex = parts
                        .map((part, i) => (i % 2 === 0 ? part : "([^/?#]+)"))
                        .join("");

                    this.pattern = new RegExp(
                        `${mappedRegex}(?:[?#].*)?$`,
                        "i",
                    );
                    this.patterns = [this.pattern].concat(
                        this._providedPatterns || [],
                    );

                    this.build();
                },

                args() {
                    this.build();
                },
            },
        });

        // ============================================================================
        // DOMValue as an extension of DOM element
        // ============================================================================
        const NativeElement = Class({
            name: "NativeElement",
            traits: [Trait.native(HTMLElement, { state: "element" })],
            initialize: function (el) {
                this._elementObject = el;
            },
        });

        const DOMValue = Class({
            name: "DOMValue",
            kindOf: NativeElement,
            private: {
                instance: {
                    _value: undefined,
                    _debug: false,
                },
            },
            get v() {
                const el = this.element();
                if (this._value !== undefined) {
                    return typeof this._value === "function"
                        ? this._value(el)
                        : this._value;
                }
                return el
                    ? (el.innerText || el.textContent || "").trim()
                    : null;
            },
            set v(newVal) {
                this._value = newVal;
            },
            get e() {
                return this.element();
            },
            class: {
                isA: function (arg) {
                    return (
                        arg instanceof this ||
                        (arg && arg.constructor?.__meta?.name === "DOMValue")
                    );
                },
                create: function (tag = "div", options = {}) {
                    const el =
                        typeof tag === "string"
                            ? document.createElement(tag)
                            : tag;
                    const wrapped = new this(el, options.value);
                    if (!el) return wrapped;

                    if (options.id) el.id = options.id;
                    if (options.className) el.className = options.className;
                    if (options.text !== undefined)
                        el.textContent = options.text;
                    if (options.html !== undefined) el.innerHTML = options.html;
                    if (options.css) wrapped.css(options.css);
                    if (options.attrs) wrapped.attr(options.attrs);
                    if (options.on && typeof options.on === "object") {
                        for (const [evt, handler] of Object.entries(
                            options.on,
                        )) {
                            wrapped.on(evt, handler);
                        }
                    }
                    if (Array.isArray(options.children)) {
                        wrapped.append(...options.children);
                    }
                    if (options.parent) {
                        wrapped.appendTo(options.parent);
                    }
                    return wrapped;
                },
            },

            initialize: function (
                el = null,
                extractedData = undefined,
                debug = false,
            ) {
                this._elementObject = el;
                this._value = extractedData;
                this._debug = debug;

                this[Symbol.toPrimitive] = function (hint) {
                    if (this._debug)
                        console.debug("[Ouro — Page] HINT: ", hint);
                    const val = this._value;

                    if (val !== null && typeof val === "object") {
                        return hint === "string" ? JSON.stringify(val) : NaN;
                    }
                    if (hint === "number") return Number(val);
                    if (hint === "string") return String(val);
                    return String(val);
                };
            },

            values: function () {
                const unwrap = (item) => {
                    if (DOMValue.isA(item)) {
                        return item.values();
                    }
                    if (Array.isArray(item)) return item.map(unwrap);
                    if (item !== null && typeof item === "object") {
                        return Object.fromEntries(
                            Object.entries(item).map(([k, v]) => [
                                k,
                                unwrap(v),
                            ]),
                        );
                    }
                    return item;
                };
                return unwrap(this.v);
            },
            toJSON: function () {
                return this.values();
            },
            toString: function () {
                const val = this._value;
                return val !== null && typeof val === "object"
                    ? JSON.stringify(val)
                    : String(val);
            },
            valueOf: function () {
                const val = this._value;
                return val !== null && typeof val === "object"
                    ? val
                    : Number(val);
            },
            css: function (styles) {
                const el = this.element();
                if (!el) return this;
                if (typeof styles === "string") {
                    el.style.cssText = styles;
                } else if (styles && typeof styles === "object") {
                    Object.assign(el.style, styles);
                }
                return this;
            },
            attr: function (nameOrObj, ...rest) {
                const [val] = rest;
                const el = this.element();
                if (!el)
                    return rest.length === 0 && typeof nameOrObj === "string"
                        ? undefined
                        : this;
                if (rest.length === 0 && typeof nameOrObj === "string") {
                    return el.getAttribute
                        ? el.getAttribute(nameOrObj)
                        : el[nameOrObj];
                }
                if (typeof nameOrObj === "string") {
                    if (val === null || val === undefined) {
                        el.removeAttribute?.(nameOrObj);
                    } else if (el.setAttribute) {
                        el.setAttribute(nameOrObj, val);
                    } else {
                        el[nameOrObj] = val;
                    }
                } else if (nameOrObj && typeof nameOrObj === "object") {
                    for (const [k, v] of Object.entries(nameOrObj)) {
                        if (v === null || v === undefined)
                            el.removeAttribute?.(k);
                        else if (el.setAttribute) el.setAttribute(k, v);
                        else el[k] = v;
                    }
                }
                return this;
            },
            on: function (event, handler, options = undefined) {
                const el = this.element();
                if (
                    el &&
                    typeof el.addEventListener === "function" &&
                    typeof handler === "function"
                ) {
                    el.addEventListener(event, handler, options);
                }
                return this;
            },
            append: function (...children) {
                const el = this.element();
                if (!el || typeof el.appendChild !== "function") return this;
                for (const child of children) {
                    if (child === null || child === undefined) continue;
                    const node = DOMValue.isA(child)
                        ? child.element()
                        : typeof child === "string"
                          ? document.createTextNode(child)
                          : child;
                    if (node) el.appendChild(node);
                }
                return this;
            },
            appendTo: function (parent) {
                const el = this.element();
                const target = DOMValue.isA(parent) ? parent.element() : parent;
                if (el && target && typeof target.appendChild === "function") {
                    target.appendChild(el);
                }
                return this;
            },
            wrap: function (wrapperTag = "div", styles = {}) {
                const el = this.element();
                if (!el || !el.parentNode) return null;
                const wrapper =
                    typeof wrapperTag === "string"
                        ? document.createElement(wrapperTag)
                        : wrapperTag;
                if (styles && typeof styles === "object") {
                    Object.assign(wrapper.style, styles);
                }
                el.parentNode.insertBefore(wrapper, el);
                wrapper.appendChild(el);
                return wrapper;
            },
            linkify: function (href, attrs = {}) {
                const el = this.element();
                if (!el || !href || !el.parentElement) return this;
                if (!el.parentElement.matches("a")) {
                    const link = document.createElement("a");
                    link.href = href;
                    Object.assign(link, attrs);
                    el.parentNode.insertBefore(link, el);
                    link.appendChild(el);
                }
                return this;
            },
            badge: function (
                htmlString,
                position = "top-left",
                customStyles = {},
            ) {
                const el = this.element();
                if (!el || !htmlString || !el.parentNode) return null;

                let wrapper = el.parentElement;
                if (
                    !wrapper ||
                    !wrapper.classList.contains("ouro-badge-wrapper")
                ) {
                    wrapper = document.createElement("div");
                    wrapper.className = "ouro-badge-wrapper";
                    Object.assign(wrapper.style, {
                        position: "relative",
                        display: "inline-block",
                    });
                    el.parentNode.insertBefore(wrapper, el);
                    wrapper.appendChild(el);
                }

                const tempDiv = document.createElement("div");
                tempDiv.innerHTML = htmlString.trim();
                const overlay = tempDiv.firstElementChild || tempDiv;

                const posMap = {
                    "top-left": { top: "5px", left: "5px" },
                    "bottom-left": { bottom: "5px", left: "5px" },
                    "top-right": { top: "5px", right: "5px" },
                    "bottom-right": { bottom: "5px", right: "5px" },
                };
                const posStyles =
                    typeof position === "string"
                        ? posMap[position] || posMap["top-left"]
                        : position;

                Object.assign(
                    overlay.style,
                    {
                        position: "absolute",
                        zIndex: "10",
                        backgroundColor: "black",
                        color: "white",
                        fontSize: "0.5em",
                    },
                    posStyles,
                    customStyles,
                );

                wrapper.appendChild(overlay);
                return overlay;
            },
        });

        // ==========================================
        // 1. EXTRACTOR Classes
        // ==========================================
        const Extractor = Class({
            name: "Extractor",
            description: "Abstract base class for all data extractors",
            spec: null,
            scraps: null,

            initialize: function (spec) {
                this.spec = spec;
                this.scraps = null;
            },

            scrape: function (doc, force, context) {
                throw new Error(
                    `The 'scrape' method must be implemented by ${this.constructor.__meta.name}`,
                );
            },

            values: function (doc = null, force = false) {
                let rawScraps = this.scraps;
                if (doc !== null || force || rawScraps === null) {
                    rawScraps = this.scrape(doc, force);
                }

                const unwrap = (item) => {
                    if (item && item.constructor?.__meta?.name === "DOMValue") {
                        return item.values();
                    }
                    if (Array.isArray(item)) return item.map(unwrap);
                    if (item !== null && typeof item === "object") {
                        return Object.fromEntries(
                            Object.entries(item).map(([k, v]) => [
                                k,
                                unwrap(v),
                            ]),
                        );
                    }
                    return item;
                };

                return unwrap(rawScraps) ?? {};
            },

            toString: function () {
                try {
                    return JSON.stringify(this.values(), null, 2);
                } catch (err) {
                    console.error(
                        `[Ouro — Page] ${this.constructor.__meta.name}.toString(): failed to stringify values`,
                        err,
                    );
                    return `[${this.constructor.__meta.name}: <invalid JSON>]`;
                }
            },
        });

        const DOMExtractor = Class({
            name: "DOMExtractor",
            description: "Extracts data from DOM nodes using CSS selectors",
            kindOf: Extractor,

            class: {
                normalize: function (spec) {
                    let mode, selector, extractor;

                    if (typeof spec === "string") {
                        mode = "first_";
                        selector = spec;
                        extractor = null;
                    } else if (Array.isArray(spec)) {
                        const inner = spec[0];
                        if (spec.length === 1) {
                            if (typeof inner === "string") {
                                [mode, selector, extractor] = [
                                    "all_",
                                    inner,
                                    null,
                                ];
                            } else if (
                                Array.isArray(inner) &&
                                inner.length === 2
                            ) {
                                [mode, selector, extractor] = [
                                    "all_",
                                    ...inner,
                                ];
                            } else if (
                                typeof inner === "object" &&
                                inner !== null
                            ) {
                                [mode, selector, extractor] = [
                                    "first_",
                                    ".",
                                    inner,
                                ];
                            }
                        } else if (spec.length === 2) {
                            if (spec[0] === "all_" || spec[0] === "first_") {
                                [mode, selector, extractor] = [...spec, null];
                            } else if (typeof spec[0] === "string") {
                                [mode, selector, extractor] = [
                                    "first_",
                                    ...spec,
                                ];
                            } else {
                                throw new Error(
                                    `Unrecognized 2-element spec: ${JSON.stringify(spec)}`,
                                );
                            }
                        } else if (spec.length === 3) {
                            [mode, selector, extractor] = spec;
                        } else {
                            throw new Error(
                                `Unrecognized array spec: ${JSON.stringify(spec)}`,
                            );
                        }
                    } else if (typeof spec === "object" && spec !== null) {
                        const out = {};
                        for (const [key, val] of Object.entries(spec)) {
                            out[key] = DOMExtractor.normalize(val);
                        }
                        return out;
                    } else {
                        throw new Error(
                            `Invalid spec: ${JSON.stringify(spec)}`,
                        );
                    }

                    if (extractor !== null && typeof extractor === "object") {
                        extractor = DOMExtractor.normalize(extractor);
                    }

                    return [mode, selector, extractor];
                },
            },

            scrape: function (
                doc = globalThis.document,
                force = false,
                context = null,
            ) {
                if (!force && this.scraps) return this.scraps;

                this.scraps = {};
                this.scraps = this._extractSpec(
                    DOMExtractor.normalize(this.spec),
                    doc,
                    this.scraps,
                    context,
                );

                return this.scraps;
            },

            private: {
                _extractSpec: function (
                    spec,
                    context,
                    resultAcc,
                    activeContext = null,
                ) {
                    if (!context) return undefined;

                    if (context && typeof context.element === "function") {
                        context = context.element();
                        if (!context) return undefined;
                    }

                    if (!Array.isArray(spec)) {
                        const result = {};
                        for (const [key, val] of Object.entries(spec)) {
                            result[key] = this._extractSpec(
                                val,
                                context,
                                result,
                                activeContext,
                            );
                            if (
                                this.scraps &&
                                typeof this.scraps === "object"
                            ) {
                                this.scraps[key] = result[key];
                            }
                        }
                        return result;
                    }

                    const [mode, selector, extractor] = spec;

                    const apply = (el) => {
                        if (!el) return undefined;
                        if (extractor === null) return new DOMValue(el);

                        if (typeof extractor === "function") {
                            const val = extractor.call(
                                this,
                                el,
                                resultAcc,
                                activeContext,
                            );
                            return new DOMValue(el, val);
                        }
                        if (typeof extractor === "string") {
                            const attr = el.getAttribute
                                ? el.getAttribute(extractor)
                                : null;
                            const val = attr !== null ? attr : el[extractor];
                            return new DOMValue(el, val);
                        }
                        if (typeof extractor === "object") {
                            const val = this._extractSpec(
                                extractor,
                                el,
                                resultAcc,
                                activeContext,
                            );
                            return new DOMValue(el, val ?? {});
                        }
                        return new DOMValue(el);
                    };

                    if (typeof context.querySelector !== "function") {
                        return undefined;
                    }

                    const elements =
                        selector === "."
                            ? context
                            : selector === ".."
                              ? context?.parentElement
                              : mode === "first_"
                                ? context.querySelector(selector)
                                : Array.from(
                                      context.querySelectorAll(selector),
                                  );

                    if (
                        !elements ||
                        (Array.isArray(elements) && elements.length === 0)
                    ) {
                        return undefined;
                    }

                    return Array.isArray(elements)
                        ? elements.map(apply)
                        : apply(elements);
                },
            },
        });

        const JSONExtractor = Class({
            name: "JSONExtractor",
            description:
                "Extracts data from JSON objects using pointer notation with deep-search fallback",
            kindOf: Extractor,

            class: {
                resolvePointer: function (obj, path) {
                    if (!obj || !path) {
                        return { parent: null, key: null, value: undefined };
                    }
                    if (path === ".")
                        return { parent: null, key: null, value: obj };

                    if (typeof path !== "string") {
                        return { parent: null, key: null, value: undefined };
                    }

                    const normalizedPath = path.replace(
                        /\[['"]?([^'"\]]+)['"]?\]/g,
                        ".$1",
                    );
                    const parts = normalizedPath.split(".").filter(Boolean);

                    const strictEval = (target) => {
                        let current = target;
                        let parent = null;
                        let key = null;
                        for (let i = 0; i < parts.length; i++) {
                            parent = current;
                            key = parts[i];
                            current = current?.[key];

                            if (current === undefined || current === null) {
                                return { found: false };
                            }
                        }
                        return { found: true, parent, key, value: current };
                    };

                    let result = strictEval(obj);
                    if (result.found) {
                        return {
                            parent: result.parent,
                            key: result.key,
                            value: result.value,
                        };
                    }

                    let deepResult = {
                        parent: null,
                        key: null,
                        value: undefined,
                    };

                    const search = (currentObj) => {
                        if (!currentObj || typeof currentObj !== "object")
                            return false;

                        const res = strictEval(currentObj);
                        if (res.found) {
                            deepResult = {
                                parent: res.parent,
                                key: res.key,
                                value: res.value,
                            };
                            return true;
                        }

                        for (const key of Object.keys(currentObj)) {
                            if (search(currentObj[key])) return true;
                        }
                        return false;
                    };

                    search(obj);
                    return deepResult;
                },
            },

            scrape: function (doc = {}, force = false, context = null) {
                if (!force && this.scraps) return this.scraps;

                this.scraps = {};
                this.scraps = this._extractSpec(
                    this.spec,
                    doc,
                    this.scraps,
                    context,
                );

                return this.scraps;
            },

            private: {
                _extractSpec: function (
                    spec,
                    context,
                    resultAcc,
                    activeContext = null,
                ) {
                    if (spec === null || spec === undefined) return undefined;

                    if (typeof spec === "object" && !Array.isArray(spec)) {
                        const res = {};
                        for (const [k, v] of Object.entries(spec)) {
                            res[k] = this._extractSpec(
                                v,
                                context,
                                res,
                                activeContext,
                            );
                            if (
                                this.scraps &&
                                typeof this.scraps === "object"
                            ) {
                                this.scraps[k] = res[k];
                            }
                        }
                        return res;
                    }

                    let path = ".";
                    let extractor = null;
                    let isListSpec = false;

                    if (typeof spec === "string") {
                        path = spec;
                    } else if (Array.isArray(spec)) {
                        if (spec.length === 1 && Array.isArray(spec[0])) {
                            isListSpec = true;
                            path = spec[0][0];
                            if (spec[0].length > 1) extractor = spec[0][1];
                        } else if (typeof spec[0] === "string") {
                            path = spec[0];
                            if (spec.length > 1) extractor = spec[1];
                        } else {
                            return spec.map((item) =>
                                this._extractSpec(
                                    item,
                                    context,
                                    resultAcc,
                                    activeContext,
                                ),
                            );
                        }
                    }

                    const targetNode = JSONExtractor.resolvePointer(
                        context,
                        path,
                    ).value;

                    const applyExtractor = (node, ext) => {
                        if (node === undefined) return undefined;
                        if (ext === null || ext === undefined) return node;

                        if (typeof ext === "function") {
                            return ext.call(
                                this,
                                node,
                                resultAcc,
                                activeContext,
                            );
                        }
                        if (typeof ext === "string") {
                            return JSONExtractor.resolvePointer(node, ext)
                                .value;
                        }
                        if (typeof ext === "object") {
                            return this._extractSpec(
                                ext,
                                node,
                                resultAcc,
                                activeContext,
                            );
                        }
                        return node;
                    };

                    if (isListSpec) {
                        if (targetNode === undefined || targetNode === null)
                            return [];
                        const arr = Array.isArray(targetNode)
                            ? targetNode
                            : [targetNode];
                        return arr.map((item) =>
                            applyExtractor(item, extractor),
                        );
                    } else {
                        return applyExtractor(targetNode, extractor);
                    }
                },
            },
        });

        // ============================================================================
        // BASE CONTAINER: Page
        // ============================================================================
        const Page = Class({
            name: "Page",
            class: {
                routeTemplate: "no route",
                registry: [],
                browser: undefined,
                toast: undefined,
                providers: undefined,
                enrichers: undefined,
                namespace: undefined,
                schema: undefined,
                structure: undefined,
                css: undefined,
                maxConcurrent: 8,
                retries: 1,
                retryDelay: 300,
                _activeRequests: 0,
                _requestQueue: [],
                _injectedStyles: new Set(),

                _acquireSlot() {
                    const limit = Page.maxConcurrent || 8;
                    if (Page._activeRequests < limit) {
                        Page._activeRequests++;
                        return Promise.resolve();
                    }
                    return new Promise((resolve) => {
                        Page._requestQueue.push(resolve);
                    });
                },
                _releaseSlot() {
                    if (Page._requestQueue.length > 0) {
                        const next = Page._requestQueue.shift();
                        next();
                    } else {
                        Page._activeRequests = Math.max(
                            0,
                            Page._activeRequests - 1,
                        );
                    }
                },
                addStyle(cssText) {
                    if (!cssText || typeof cssText !== "string") return;
                    if (Page._injectedStyles.has(cssText)) return;
                    Page._injectedStyles.add(cssText);
                    if (typeof GM_addStyle !== "undefined") {
                        GM_addStyle(cssText);
                    } else if (typeof document !== "undefined") {
                        const style = document.createElement("style");
                        style.type = "text/css";
                        style.textContent = cssText;
                        (
                            document.head || document.documentElement
                        )?.appendChild(style);
                    }
                },
                showToast(message, duration = 0, ...otherStuff) {
                    console.info(`[Ouro — Page] ${message}`, ...otherStuff);
                    if (!window || !document.body) return;

                    const toast = this.toast
                        ? this.toast
                        : (() => {
                              this.toast = document.createElementNS(
                                  "http://www.w3.org/1999/xhtml",
                                  "div",
                              );
                              Object.assign(this.toast.style, {
                                  position: "fixed",
                                  bottom: "20px",
                                  right: "20px",
                                  backgroundColor: "#333333",
                                  color: "#ffffff",
                                  padding: "12px 20px",
                                  borderRadius: "8px",
                                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                                  zIndex: "2147483647",
                                  fontFamily: "system-ui, sans-serif",
                                  fontSize: "14px",
                                  transition: "opacity 0.3s ease-in-out",
                                  opacity: "0",
                                  pointerEvents: "none",
                              });
                              return this.toast;
                          })();
                    toast.textContent = message;
                    toast.style.opacity = "1";
                    document.body.appendChild(toast);
                    if (duration > 0) {
                        setTimeout(() => {
                            toast.style.opacity = "0";
                            setTimeout(() => toast.remove(), 300);
                        }, duration);
                    }
                },
                cache: {},
                register(definition) {
                    definition.kindOf = definition.kindOf || this;
                    const newSubclass = Class(definition);
                    Page.registry.push(newSubclass);

                    const rt = newSubclass.routeTemplate;
                    const templateStr = Array.isArray(rt)
                        ? rt[0]
                        : rt || "no route";
                    const aliases =
                        Array.isArray(rt) && rt[2]
                            ? Array.isArray(rt[2])
                                ? rt[2]
                                : [rt[2]]
                            : [];

                    const combinedPatterns = [];
                    if (
                        templateStr !== "no route" &&
                        templateStr !== "${pageurl}"
                    ) {
                        combinedPatterns.push(templateStr);
                    }
                    combinedPatterns.push(
                        ...aliases.filter((p) => typeof p === "string"),
                    );

                    if (combinedPatterns.length > 0) {
                        console.info(
                            `[Ouro — Page] New Page Type: ${newSubclass.name}`,
                        );
                        combinedPatterns.forEach((pattern) => {
                            let matchStr = pattern.replace(/\$\{(.+?)\}/g, "*");
                            if (!matchStr.includes("://")) {
                                matchStr = `*://${matchStr}`;
                            }
                            console.info(
                                `[Ouro — Page] // @match        ${matchStr}`,
                            );
                        });
                    }

                    return newSubclass;
                },
                findMatchingSubclass(urlStr) {
                    const subclasses = Page.registry;

                    const matchedRoutes = subclasses
                        .filter(
                            (Subclass) => Subclass && Subclass.routeTemplate,
                        )
                        .map((Subclass) => {
                            const routeMatcher = new RouteURL(
                                Subclass.routeTemplate,
                            );
                            const extractedArgs = routeMatcher.match(urlStr);

                            if (extractedArgs === null) return null;

                            routeMatcher.args = extractedArgs;

                            const templateStr = Array.isArray(
                                Subclass.routeTemplate,
                            )
                                ? Subclass.routeTemplate[0]
                                : Subclass.routeTemplate || "";

                            const literalPattern = templateStr.replace(
                                /\$\{[^}]+\}/g,
                                "",
                            );
                            const specificityScore = literalPattern.length;

                            return {
                                Subclass,
                                routeMatcher,
                                score: specificityScore,
                            };
                        })
                        .filter((match) => match !== null);

                    matchedRoutes.sort((a, b) => b.score - a.score);

                    if (matchedRoutes.length > 0) {
                        const best = matchedRoutes[0];
                        Page.showToast(
                            `Matched "${best.Subclass.name}" (${best.score})`,
                        );
                        return {
                            Subclass: best.Subclass,
                            routeMatcher: best.routeMatcher,
                        };
                    }

                    return {
                        Subclass: Page,
                        routeMatcher: new RouteURL(Page.routeTemplate),
                    };
                },
                create(...args) {
                    const input = args[0];
                    const isString = typeof input === "string";
                    const urlStr = isString ? input : "";
                    var Subclass = this;
                    if (Subclass === Page) {
                        Subclass = this.findMatchingSubclass(urlStr).Subclass;
                    }

                    const instance = new Subclass(...args);

                    if (urlStr === window.location.href) {
                        Page.browser = instance;
                    }

                    return instance;
                },
                async fetch(...args) {
                    const instance = this.create(...args);
                    await instance.fetch();
                    return instance;
                },
                async scrape(...args) {
                    const instance = this.create(...args);
                    await instance.scrape();
                    return instance;
                },
                async extract(...args) {
                    const instance = this.create(...args);
                    await instance.extract();
                    return instance;
                },
                async enrich(...args) {
                    const instance = this.create(...args);
                    await instance.enrich();
                    return instance;
                },
                async process(...args) {
                    const instance = this.create(...args);
                    await instance.process();
                    return instance;
                },
            },

            route: null,
            request: null,
            response: null,
            rawText: null,
            content: null,
            data: null,
            schema: null,
            structure: null,
            extractor: null,
            providers: null,
            enrichers: null,
            namespace: null,
            css: null,

            addStyle(cssText) {
                return Page.addStyle(cssText);
            },

            _collectLineageMap(propName) {
                const lineage = [];
                let curr = this.constructor;
                while (curr && curr.__meta) {
                    if (curr[propName] && typeof curr[propName] === "object") {
                        lineage.unshift(curr[propName]);
                    }
                    curr = curr.__meta.parent;
                }
                if (this[propName] && typeof this[propName] === "object") {
                    lineage.push(this[propName]);
                }
                return lineage.length > 0
                    ? Object.assign({}, ...lineage)
                    : null;
            },

            async resolveProviders() {
                if (
                    !this.route ||
                    !Array.isArray(this.route.variables) ||
                    this.route.variables.length === 0
                ) {
                    return;
                }
                const mergedProviders = this._collectLineageMap("providers");
                let mutated = false;
                for (const varName of this.route.variables) {
                    if (
                        this.route.args[varName] !== undefined &&
                        this.route.args[varName] !== null
                    ) {
                        continue;
                    }
                    let provider = mergedProviders?.[varName];
                    if (provider === undefined) {
                        if (
                            varName === "serverUrl" &&
                            typeof globalThis.Plex !== "undefined"
                        ) {
                            provider = [
                                () => globalThis.Plex.serverUrl,
                                globalThis.plexServerInfoPage,
                            ];
                        } else if (
                            varName === "librarySection" &&
                            typeof globalThis.Plex !== "undefined"
                        ) {
                            provider = [
                                () => globalThis.Plex.librarySection,
                                globalThis.plexLibraryPage,
                            ];
                        } else if (
                            varName === "plexToken" &&
                            typeof globalThis.Plex !== "undefined"
                        ) {
                            provider = () => globalThis.Plex.extractToken();
                        } else if (
                            varName === "machineIdentifier" &&
                            typeof globalThis.Plex !== "undefined"
                        ) {
                            provider = [
                                () => globalThis.Plex.machineIdentifier,
                                globalThis.plexServerInfoPage,
                            ];
                        } else if (
                            varName === "tmdbKey" &&
                            typeof globalThis.TMDB !== "undefined"
                        ) {
                            provider = () => globalThis.TMDB.apiKey;
                        }
                    }
                    if (provider === undefined) continue;

                    if (Array.isArray(provider)) {
                        const [getterFn, actionOrPage] = provider;
                        const resolvedAction =
                            typeof actionOrPage === "function" &&
                            !actionOrPage.__meta
                                ? actionOrPage()
                                : actionOrPage;
                        await this.ensure(getterFn, resolvedAction);
                        this.route.args[varName] = getterFn.call(
                            this,
                            this.data,
                        );
                    } else if (typeof provider === "function") {
                        this.route.args[varName] = await provider.call(
                            this,
                            this.data,
                        );
                    } else {
                        this.route.args[varName] = provider;
                    }
                    mutated = true;
                }

                if (mutated) {
                    this.route.build();
                }
            },

            initialize(input = "") {
                const isString = typeof input === "string";
                const urlStr = isString ? input : "";
                const explicitArgs =
                    !isString && input && input.args ? input.args : null;

                const rt = this.constructor.routeTemplate;
                this.route = Array.isArray(rt)
                    ? new RouteURL(...rt)
                    : new RouteURL(rt);

                if (isString) {
                    const extractedArgs = this.route.match(urlStr);
                    if (extractedArgs) this.route.args = extractedArgs;
                }

                if (explicitArgs) {
                    this.route.args = explicitArgs;
                }

                this.data = { dataStatus: 0 };
            },
            getRequest() {
                const args = [
                    this.route.native(),
                    {
                        method: "GET",
                        headers: { Accept: this.accept },
                    },
                ];
                return (this.request ??= new Request(...args));
            },
            async _networkFetch(req) {
                const maxRetries =
                    this.constructor.retries ?? Page.retries ?? 1;
                const delayMs =
                    this.constructor.retryDelay ?? Page.retryDelay ?? 300;
                const useGM = typeof GM_xmlhttpRequest !== "undefined";

                const performOnce = () => {
                    if (useGM) {
                        return new Promise((resolve, reject) => {
                            const headersObj = {};
                            req.headers.forEach((val, key) => {
                                headersObj[key] = val;
                            });
                            GM_xmlhttpRequest({
                                method: req.method,
                                url: req.url,
                                headers: headersObj,
                                onload: (res) =>
                                    resolve({
                                        ok:
                                            res.status >= 200 &&
                                            res.status < 300,
                                        status: res.status,
                                        text: async () => res.responseText,
                                    }),
                                onerror: (err) =>
                                    reject(
                                        new Error(
                                            err.error || "GM network error",
                                        ),
                                    ),
                            });
                        });
                    }
                    return fetch(req);
                };

                await Page._acquireSlot();
                try {
                    let attempt = 0;
                    while (true) {
                        try {
                            const res = await performOnce();
                            if (
                                [429, 502, 503, 504].includes(res?.status) &&
                                attempt < maxRetries
                            ) {
                                attempt++;
                                await new Promise((r) =>
                                    setTimeout(r, delayMs * attempt),
                                );
                                continue;
                            }
                            return res;
                        } catch (err) {
                            if (attempt < maxRetries) {
                                attempt++;
                                await new Promise((r) =>
                                    setTimeout(r, delayMs * attempt),
                                );
                                continue;
                            }
                            throw err;
                        }
                    }
                } finally {
                    Page._releaseSlot();
                }
            },
            async ensure(conditionFn, action, argsBuilder = () => ({})) {
                let isMet = false;
                try {
                    isMet = Boolean(conditionFn());
                } catch (e) {
                    isMet = false;
                }

                if (!isMet) {
                    if (typeof action === "function" && action.__meta) {
                        await action.extract({ args: argsBuilder(this.data) });
                    } else if (
                        typeof action === "string" &&
                        typeof this[action] === "function"
                    ) {
                        await this[action]();
                    } else if (typeof action === "function") {
                        await action.call(this);
                    } else {
                        throw new Error(
                            `[ensure] Invalid resolution action provided: ${action}`,
                        );
                    }
                }

                return isMet;
            },
            async waitForElement(
                selector,
                timeout = 5000,
                targetDocument = document,
            ) {
                return new Promise((resolve, reject) => {
                    if (targetDocument.querySelector(selector)) {
                        return resolve(targetDocument.querySelector(selector));
                    }

                    const observer = new MutationObserver(() => {
                        if (targetDocument.querySelector(selector)) {
                            observer.disconnect();
                            resolve(targetDocument.querySelector(selector));
                        }
                    });

                    const observeRoot = targetDocument.body
                        ? targetDocument.body
                        : targetDocument;
                    observer.observe(observeRoot, {
                        childList: true,
                        subtree: true,
                    });

                    setTimeout(() => {
                        observer.disconnect();
                        reject(new Error(`Timeout waiting for ${selector}`));
                    }, timeout);
                });
            },
            isBrowsed() {
                const currentURL = window.location.href;
                const targetURL = this.route.native();
                const matchesPattern = this.route.match(currentURL) !== null;
                return (
                    matchesPattern ||
                    currentURL === targetURL ||
                    currentURL.startsWith(targetURL)
                );
            },
            async fetch() {
                if (this.content) {
                    return this;
                }

                if (this.isBrowsed()) {
                    Page.browser = this;
                    Page.showToast(
                        `${this.constructor.name} (${this.route.signature}) in browser`,
                    );

                    this.contentType = document.contentType || "";

                    if (
                        this.contentType.includes("xml") ||
                        this.contentType.includes("json")
                    ) {
                        if (window.location.protocol === "file:") {
                            this.rawText =
                                document.documentElement.textContent.replace(
                                    /JSONPage.+/,
                                    "",
                                );
                        } else {
                            const res = await fetch(window.location.href);
                            this.rawText = await res.text();
                        }
                        this.content = this.formatContent(this.rawText);
                    } else {
                        this.content = document;
                    }
                } else {
                    const req = this.getRequest();
                    Page.showToast(
                        `Fetching ${this.constructor.name} (${this.route.signature})`,
                        this,
                    );
                    console.debug(`[Ouro - Fetch] ${this.route.href}`, this);
                    this.response = await this._networkFetch(req);
                    this.rawText = await this.response.text();
                    this.content = this.formatContent(this.rawText);
                }
                return this;
            },
            formatContent(text) {
                return text;
            },
            scrape() {
                const spec =
                    this.schema ||
                    this.structure ||
                    this.constructor.schema ||
                    this.constructor.structure;
                if (!this.content || !this.extractor || !spec)
                    return (this.data = {});
                try {
                    const extractor = new this.extractor(spec);
                    const targetDoc =
                        this.extractor === JSONExtractor && this.content?.json
                            ? this.content.json
                            : this.content;
                    extractor.scrape(targetDoc);
                    this.data = extractor.values(targetDoc) ?? {};

                    if (extractor.scraps) this.scraps = extractor.scraps;
                } catch (err) {
                    this.data = {};
                }
                return this.data;
            },

            async enrichWith(key, PageClass, ...rest) {
                const [argsBuilder, validatorFn] = rest;
                if (Array.isArray(PageClass)) {
                    for (const candidate of PageClass) {
                        if (!Array.isArray(candidate) || !candidate[0])
                            continue;
                        const [CandPage, candArgsBuilder, candValidator] =
                            candidate;
                        const rawArgs =
                            typeof candArgsBuilder === "function"
                                ? candArgsBuilder.call(this, this.data)
                                : candArgsBuilder;

                        if (rawArgs === null || rawArgs === undefined) continue;
                        if (
                            typeof rawArgs === "object" &&
                            Object.values(rawArgs).some(
                                (v) =>
                                    v === undefined || v === null || v === "",
                            )
                        ) {
                            continue;
                        }

                        const payload =
                            typeof rawArgs === "string"
                                ? rawArgs
                                : { args: rawArgs };
                        const extracted = (await CandPage.extract(payload))
                            ?.data;
                        const isValid = candValidator
                            ? candValidator(extracted)
                            : Boolean(
                                  extracted &&
                                  typeof extracted === "object" &&
                                  Object.keys(extracted).some(
                                      (k) => k !== "dataStatus",
                                  ),
                              );

                        if (isValid) {
                            this.data[key] = extracted;
                            return this.data[key];
                        }
                    }
                    this.data[key] ??= {};
                    return this.data[key];
                }

                const payload =
                    typeof argsBuilder === "string"
                        ? argsBuilder
                        : {
                              args:
                                  typeof argsBuilder === "function"
                                      ? argsBuilder.call(this, this.data)
                                      : argsBuilder,
                          };

                const res = (await PageClass.extract(payload))?.data;
                if (validatorFn && !validatorFn(res)) {
                    return this.data[key];
                }
                this.data[key] ??= res;
                return this.data[key];
            },

            extract() {
                return this;
            },
            enrich() {
                return this;
            },
            process() {
                return this;
            },

            before: {
                async fetch() {
                    await this.resolveProviders();
                },
                async scrape() {
                    await this.resolveProviders();
                    await this.ensure(
                        () => this.data?.dataStatus >= 1 || this.content,
                        this.fetch,
                    );
                },
                async extract() {
                    await this.resolveProviders();
                    await this.ensure(
                        () => this.data?.dataStatus >= 2,
                        this.scrape,
                    );
                    const ns = this.namespace || this.constructor.namespace;
                    if (
                        ns &&
                        this.data &&
                        typeof this.data === "object" &&
                        !(ns in this.data)
                    ) {
                        const status = this.data.dataStatus;
                        this.data = { [ns]: this.data };
                        if (status !== undefined) this.data.dataStatus = status;
                    }
                },
                async enrich() {
                    await this.ensure(
                        () => this.data?.dataStatus >= 3,
                        this.extract,
                    );
                    const mergedEnrichers =
                        this._collectLineageMap("enrichers");
                    if (mergedEnrichers) {
                        for (const [key, spec] of Object.entries(
                            mergedEnrichers,
                        )) {
                            if (Array.isArray(spec) && Array.isArray(spec[0])) {
                                await this.enrichWith(key, spec);
                            } else if (Array.isArray(spec)) {
                                await this.enrichWith(
                                    key,
                                    spec[0],
                                    spec[1],
                                    spec[2],
                                );
                            }
                        }
                    }
                },
                async process() {
                    await this.ensure(
                        () => this.data?.dataStatus >= 4,
                        this.enrich,
                    );
                    const cssText = this.css || this.constructor.css;
                    if (cssText) this.addStyle(cssText);
                },
            },

            around: {
                async fetch(...args) {
                    try {
                        await this.inner(...args);
                    } catch (err) {
                        console.error(
                            `[Ouro — Page] Fatal Error in fetch() on ${this.constructor.name}:`,
                            this,
                            err,
                        );
                        throw err;
                    }
                    if (this.content === undefined) {
                        console.warn(
                            `[Ouro — Page] Warning: fetch() on ${this.constructor.name} left this.content undefined.`,
                        );
                    }
                    if (!this.data) this.data = {};
                    this.data.dataStatus = Math.max(
                        this.data.dataStatus || 0,
                        1,
                    );
                    return this;
                },

                async scrape(...args) {
                    try {
                        const result = await this.inner(...args);
                        if (
                            result !== undefined &&
                            result !== this &&
                            result !== this.data
                        ) {
                            this.data = result;
                        }
                    } catch (err) {
                        console.error(
                            `[Ouro — Page] Fatal Error in scrape() on ${this.constructor.name}:`,
                            this,
                            err,
                        );
                        throw err;
                    }
                    if (
                        this.data === undefined ||
                        (typeof this.data === "object" &&
                            Object.keys(this.data).length === 0)
                    ) {
                        console.warn(
                            `[Ouro — Page] Warning: scrape() on ${this.constructor.name} left this.data undefined or empty {}.`,
                        );
                    }
                    if (!this.data) this.data = {};
                    const ns = this.namespace || this.constructor.namespace;
                    if (
                        ns &&
                        this.data &&
                        typeof this.data === "object" &&
                        Object.keys(this.data).some(
                            (k) => k !== "dataStatus",
                        ) &&
                        !(ns in this.data)
                    ) {
                        this.data = { [ns]: this.data };
                    }
                    this.data.dataStatus = 2;
                    return this.data;
                },

                async extract(...args) {
                    console.debug(
                        `[Ouro - Extract] ${this.constructor.name}`,
                        this,
                    );
                    try {
                        const result = await this.inner(...args);
                        if (
                            result !== undefined &&
                            result !== this &&
                            result !== this.data
                        ) {
                            this.data = result;
                        }
                    } catch (err) {
                        console.error(
                            `[Ouro — Extract] Fatal Error in extract() on ${this.constructor.name}:`,
                            this,
                            err,
                        );
                        throw err;
                    }
                    if (!this.data) this.data = {};
                    this.data.dataStatus = 3;
                    return this.data;
                },

                async enrich(...args) {
                    try {
                        const result = await this.inner(...args);
                        if (
                            result !== undefined &&
                            result !== this &&
                            result !== this.data
                        ) {
                            this.data = result;
                        }
                    } catch (err) {
                        console.error(
                            `[Ouro — Page] Fatal Error in enrich() on ${this.constructor.name}:`,
                            this,
                            err,
                        );
                        throw err;
                    }
                    if (!this.data) this.data = {};
                    this.data.dataStatus = 4;
                    return this.data;
                },

                async process(...args) {
                    try {
                        const result = await this.inner(...args);
                        if (
                            result !== undefined &&
                            result !== this &&
                            result !== this.data
                        ) {
                            this.data = result;
                        }
                    } catch (err) {
                        console.error(
                            `[Ouro — Page] Fatal Error in process() on ${this.constructor.name}:`,
                            this,
                            err,
                        );
                        throw err;
                    }
                    Page.showToast(
                        `Processed ${this.constructor.name}!`,
                        15000,
                        this,
                    );
                    if (!this.data) this.data = {};
                    this.data.dataStatus = 5;
                    return this.data;
                },
            },
        });
        Page.registry = [Page];

        // ============================================================================
        // Traits: Exportable & Downloadable & Content Types
        // ============================================================================
        const Exportable = new Trait({
            name: "Exportable",
            exportData(format = "ini") {
                const formatType = format.toLowerCase();

                if (!this.data) {
                    return formatType === "json" ? "{}" : "";
                }

                if (formatType === "json") {
                    return JSON.stringify(this.data, null, 4);
                }

                if (formatType === "ini") {
                    let iniString = "";
                    let sections = "";

                    const flatten = (obj, prefix = "") => {
                        let result = {};
                        for (const key in obj) {
                            if (
                                Object.prototype.hasOwnProperty.call(obj, key)
                            ) {
                                const newKey = prefix
                                    ? `${prefix}_${key}`
                                    : key;
                                const val = obj[key];

                                if (typeof val === "object" && val !== null) {
                                    Object.assign(result, flatten(val, newKey));
                                } else {
                                    result[newKey] = val;
                                }
                            }
                        }
                        return result;
                    };

                    for (const key in this.data) {
                        if (
                            Object.prototype.hasOwnProperty.call(this.data, key)
                        ) {
                            const value = this.data[key];

                            if (typeof value === "object" && value !== null) {
                                sections += `\n[${key}]\n`;
                                const flattenedSection = flatten(value, key);

                                for (const flatKey in flattenedSection) {
                                    if (
                                        Object.prototype.hasOwnProperty.call(
                                            flattenedSection,
                                            flatKey,
                                        )
                                    ) {
                                        sections += `${flatKey}=${flattenedSection[flatKey]}\n`;
                                    }
                                }
                            } else {
                                iniString += `${key}=${value}\n`;
                            }
                        }
                    }

                    return (iniString + sections).trim();
                }

                throw new Error(
                    `[Exportable] Unsupported format requested: ${format}`,
                );
            },
        });

        const Downloadable = new Trait({
            name: "Downloadable",
            autoDownload: false,

            downloadUrl(filename, url) {
                const element = document.createElement("a");
                element.setAttribute("href", url);
                element.setAttribute("download", filename);
                element.style.display = "none";
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            },

            downloadData(filename, data) {
                const dataUrl =
                    "data:text/plain;charset=utf-8," + encodeURIComponent(data);
                this.downloadUrl(filename, dataUrl);
            },

            downloadPage(filename) {
                if (typeof this.exportData !== "function") {
                    throw new Error(
                        `[Downloadable] Missing dependency: 'Exportable' trait is required on ${this.constructor.name} to use downloadPage().`,
                    );
                }

                const format = filename.includes(".")
                    ? filename.split(".").pop().toLowerCase()
                    : undefined;

                if (format === undefined) {
                    console.warn(
                        `[Ouro — Page] Aborted download: No file extension found in "${filename}" to determine the export format.`,
                    );
                    return;
                }

                const formattedData = this.exportData(format);

                if (typeof formattedData === "string") {
                    this.downloadData(filename, formattedData);
                } else {
                    console.warn(
                        `[Ouro — Page] Aborted download for "${filename}": exportData did not return a valid string.`,
                    );
                }
            },
        });

        const APIContent = new Trait({
            get api() {
                return this.content;
            },
        });

        const JSONContent = new Trait({
            traits: [APIContent],
            name: "JSONContent",
            accept: "application/json",
            extractor: JSONExtractor,
            formatContent(text) {
                try {
                    return JSON.parse(text);
                } catch (error) {
                    throw new Error(
                        `[JSONContent] JSON Parsing Failed: ${error.message}`,
                    );
                }
            },
            after: {
                async process() {
                    (function () {
                        "use strict";
                        const HIGHLIGHT_MAP = {
                            "https://formulae.brew.sh/api/formula/": [
                                ".versions.stable",
                            ],
                        };

                        function getActiveHighlightPaths() {
                            const currentUrl = window.location.href;
                            for (const key in HIGHLIGHT_MAP) {
                                if (currentUrl.includes(key)) {
                                    return HIGHLIGHT_MAP[key];
                                }
                            }
                            return [];
                        }

                        const activePaths = getActiveHighlightPaths();
                        const pre = document.querySelector("pre");
                        if (!pre) return;

                        function buildTree(val, currentPath = []) {
                            const pathString =
                                currentPath.length > 0
                                    ? "." + currentPath.join(".")
                                    : "";
                            const shouldHighlight =
                                activePaths.includes(pathString);
                            const highlightClass = shouldHighlight
                                ? " json-highlighted"
                                : "";

                            if (val === null) {
                                return `<span class="json-null${highlightClass}">null</span>`;
                            }

                            const type = typeof val;

                            if (type === "boolean") {
                                return `<span class="json-boolean${highlightClass}">${val}</span>`;
                            }
                            if (type === "number") {
                                return `<span class="json-number${highlightClass}">${val}</span>`;
                            }
                            if (type === "string") {
                                const escaped = val
                                    .replace(/&/g, "&amp;")
                                    .replace(/</g, "&lt;")
                                    .replace(/>/g, "&gt;");
                                return `<span class="json-string${highlightClass}">"${escaped}"</span>`;
                            }

                            if (type === "object") {
                                const isArray = Array.isArray(val);
                                const keys = Object.keys(val);

                                if (keys.length === 0) {
                                    return isArray ? "[]" : "{}";
                                }

                                let html = "";
                                html += `<details open class="json-section${highlightClass}">`;
                                html += `<summary class="json-summary">${isArray ? "[" : "{"}</summary>`;
                                html += `<div class="json-content">`;

                                keys.forEach((key, index) => {
                                    html += `<div class="json-line">`;
                                    const nextPath = [...currentPath, key];

                                    if (!isArray) {
                                        const keyPathString =
                                            "." + nextPath.join(".");
                                        const isKeyHighlighted =
                                            activePaths.includes(keyPathString);
                                        const keyHighlightClass =
                                            isKeyHighlighted
                                                ? " json-highlighted-key"
                                                : "";

                                        html += `<span class="json-key${keyHighlightClass}">"${key}"</span>: `;
                                    }

                                    html += buildTree(val[key], nextPath);

                                    if (index < keys.length - 1) {
                                        html +=
                                            '<span class="json-comma">,</span>';
                                    }
                                    html += `</div>`;
                                });

                                html += `</div>`;
                                html += `<div class="json-closer">${isArray ? "]" : "}"}</div>`;
                                html += `</details>`;
                                return html;
                            }
                        }

                        try {
                            const rawJson = JSON.parse(pre.textContent);
                            const container = document.createElement("div");
                            container.className = "json-tree-container";
                            container.innerHTML = buildTree(rawJson);

                            pre.innerHTML = "";
                            pre.appendChild(container);

                            const themeCSS = `
                                body {
                                    background-color: #0d1111 !important;
                                    color: #00ff66 !important;
                                    font-family: 'Consolas', 'Courier New', monospace;
                                    padding: 24px;
                                    line-height: 1.5;
                                }
                                pre {
                                    white-space: pre-wrap;
                                    word-wrap: break-word;
                                }
                                .json-section {
                                    display: inline-block;
                                    width: 100%;
                                    vertical-align: top;
                                }
                                .json-content {
                                    padding-left: 2ch;
                                    border-left: 1px dashed rgba(0, 255, 102, 0.15);
                                }
                                .json-summary {
                                    cursor: pointer;
                                    outline: none;
                                    user-select: none;
                                    display: list-item;
                                    color: #00ff66;
                                }
                                .json-summary::-webkit-details-marker { color: #33ff33; }
                                .json-summary::marker { color: #33ff33; }
                                .json-line { display: block; margin-left: 1ch; }
                                .json-comma { color: #557755; }
                                .json-key { color: #33ff33; font-weight: bold; }
                                .json-string { color: #85ffc7; }
                                .json-number { color: #00ffcc; }
                                .json-boolean { color: #a3ff00; font-weight: bold; }
                                .json-null { color: #557755; font-style: italic; }
                                .json-highlighted {
                                    background-color: rgba(255, 170, 0, 0.15) !important;
                                    color: #ffaa00 !important;
                                    border-radius: 3px;
                                    padding: 0 4px;
                                    font-weight: bold;
                                }
                                .json-highlighted-key {
                                    color: #ffaa00 !important;
                                    text-decoration: underline dotted #ffaa00;
                                }
                                details[open] { margin-bottom: 0px; }
                                details:not([open]) { display: inline; }
                                details:not([open]) .json-summary { display: inline-block; }
                                details:not([open]) .json-summary::after {
                                    content: "... }";
                                    color: #557755;
                                    font-style: italic;
                                    padding-left: 0.5ch;
                                }
                            `;

                            if (typeof GM_addStyle !== "undefined") {
                                GM_addStyle(themeCSS);
                            } else {
                                const style = document.createElement("style");
                                style.textContent = themeCSS;
                                document.head.appendChild(style);
                            }
                        } catch (e) {
                            console.error(
                                "[Ouro — Page] Failed to parse page as JSON for layout building",
                                e,
                            );
                        }
                    })();
                },
            },
        });

        const DOMContent = new Trait({
            name: "DOMContent",
            accept: "*/*",
            extractor: DOMExtractor,
            methods: {
                formatContent(text) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(
                        text,
                        this.accept || "text/html",
                    );

                    const errorNode = doc.querySelector("parsererror");
                    if (errorNode) {
                        throw new Error(
                            `DOM Parsing Failed: ${errorNode.textContent}`,
                        );
                    }

                    return doc;
                },
            },
        });

        const HTMLContent = new Trait({
            traits: [DOMContent, Exportable, Downloadable],
            name: "HTMLContent",
            accept: "text/html",
        });

        const XMLContent = new Trait({
            traits: [DOMContent, APIContent],
            name: "XMLContent",
            accept: "application/xml",
        });

        // ============================================================================
        // Page Subclasses Registration
        // ============================================================================
        const JSONPage = Page.register({
            name: "JSONPage",
            class: { routeTemplate: "${somePath}.json" },
            traits: [JSONContent],
        });

        const DOMPage = Page.register({
            name: "DOMPage",
            class: { routeTemplate: "no route" },
            traits: [DOMContent],
        });

        const XMLPage = DOMPage.register({
            name: "XMLPage",
            class: { routeTemplate: "${somePath}.xml" },
            traits: [XMLContent],
        });

        const HTMLPage = DOMPage.register({
            name: "HTMLPage",
            class: { routeTemplate: "${pageurl}" },
            traits: [HTMLContent, Exportable, Downloadable],
        });

        // Publish components globally via Ouro namespace or unsafeWindow
        Ouro.publish("RouteURL", RouteURL);
        Ouro.publish("NativeElement", NativeElement);
        Ouro.publish("DOMValue", DOMValue);
        Ouro.publish("Extractor", Extractor);
        Ouro.publish("DOMExtractor", DOMExtractor);
        Ouro.publish("JSONExtractor", JSONExtractor);
        Ouro.publish("Page", Page);
        Ouro.publish("Exportable", Exportable);
        Ouro.publish("Downloadable", Downloadable);
        Ouro.publish("APIContent", APIContent);
        Ouro.publish("JSONContent", JSONContent);
        Ouro.publish("DOMContent", DOMContent);
        Ouro.publish("HTMLContent", HTMLContent);
        Ouro.publish("XMLContent", XMLContent);
        Ouro.publish("JSONPage", JSONPage);
        Ouro.publish("DOMPage", DOMPage);
        Ouro.publish("XMLPage", XMLPage);
        Ouro.publish("HTMLPage", HTMLPage);
    },
);
