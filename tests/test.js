// tests/test.js
/* global Test Metaclass Class GenericFunction Trait Ouro clear */

globalThis.registerOuroTests = function () {
    // 1. Define Test Class Runner as a first-class Ouro Class (#3)
    globalThis.Test = Class({
        name: "Test",
        description: "Ouro Unit Test Runner and Assertion Metaobject.",
        properties: {
            public: {
                class: {
                    tests: [],
                    total: 0,
                    passed: 0,
                    failed: 0,
                    executed: 0,
                    rate: "0/0",
                    trace: "",
                },
                instance: {
                    code: null,
                    name: "",
                    description: null,
                    status: undefined,
                    executed: false,
                },
            },
        },
        methods: {
            public: {
                instance: {
                    initialize: function (arg = {}) {
                        const {
                            code,
                            name = null,
                            description = null,
                        } = typeof arg === "function" ? { code: arg } : arg;
                        this.code = code;
                        this.name = name || `test${++this.constructor.total}`;
                        this.description = description;
                        this.status = undefined;
                        this.executed = false;
                        this.constructor.tests.push(this);
                    },
                    run: function () {
                        try {
                            this.executed = false;
                            if (this.description) {
                                console.info(this.description);
                            }
                            this.status = this.code();
                        } catch (error) {
                            console.error(
                                `Test [${this.name}] threw an error:`,
                                error.message,
                            );
                            this.status = false;
                        }
                        this.executed = true;
                        if (this.status) {
                            this.constructor.passed++;
                        } else {
                            this.constructor.failed++;
                        }
                        this.constructor.executed++;
                        console.info(
                            `${this.name}: ${this.status ? "PASS" : "FAIL"}\n\n`,
                        );
                        return this.status;
                    },
                },
                class: {
                    run: function () {
                        const buffer = [];
                        const originalLog = console.log;
                        const originalError = console.error;

                        console.log = (...args) => {
                            buffer.push(args.join(" "));
                            originalLog(...args);
                        };

                        console.error = (...args) => {
                            buffer.push(args.join(" "));
                            originalError(...args);
                        };

                        this.reset();

                        // --- BEGIN NEW PLAYGROUND LINKS ---
                        if (typeof document !== "undefined") {
                            const playground =
                                document.getElementById("Playground");
                            if (playground) {
                                playground.innerHTML = `
                                    <a href="https://yts.pw/browse-movies/0/1080p/all/0/latest/0/all" target="_blank" style="margin-right: 15px;">YTS Browse</a>
                                    <a href="https://yts.pw/movies/heart-of-the-beast-2026" target="_blank" style="margin-right: 15px;">YTS Movie</a>
                                    <a href="https://app.plex.tv/desktop/#!/server/e89a3831eea46ab472d5745f0d60fae6dc5685ac/details?key=/library/metadata/185310" target="_blank">Plex Movie</a>
                                `;
                            }
                        }
                        // --- END NEW PLAYGROUND LINKS ---

                        try {
                            this.tests.forEach((t) => t.run());
                            this.rate = `${this.passed}/${this.executed}`;
                            const statusLabel =
                                this.failed === 0 ? "SUCCESS" : "FAILED";
                            console.log(`${statusLabel}: ${this.rate}`);

                            if (typeof document !== "undefined") {
                                const heading =
                                    document.getElementById(
                                        "UnitTests",
                                    )?.previousElementSibling;
                                if (heading) {
                                    heading.textContent = `Unit Tests: ${statusLabel} ${this.rate}`;
                                }
                            }
                        } finally {
                            console.log = originalLog;
                            console.error = originalError;
                        }
                        this.trace = buffer.join("\n");
                        return this.failed === 0;
                    },
                    reset: function () {
                        this.passed = this.failed = this.executed = 0;
                        this.rate = "0/0";
                        this.trace = "";
                    },
                    clear: function () {
                        this.tests = [];
                        this.reset();
                    },
                },
            },
        },
    });

    globalThis.runtests = function runtests() {
        if (typeof clear === "function") {
            clear();
        } else if (typeof console.clear === "function") {
            console.clear();
        }
        Test.run();
        console.log(Test.trace);
    };

    // ============================================================================
    // OURO TEST SUITE DEFINITIONS
    // ============================================================================

    new Test({
        description:
            "Bootstrap forgeConstructor factory returns a constructor function",
        code: () => {
            const DummyClass = Metaclass.bootstrap.forgeConstructor({
                name: "Dummy",
            });
            let result =
                typeof DummyClass === "function" && DummyClass.name === "Dummy";
            return result;
        },
    });

    new Test({
        description:
            "Bootstrap established prototype chain inherits from kindOf class",
        code: () => {
            const Parent = Metaclass.bootstrap.forgeConstructor({
                name: "Parent",
            });
            const Child = Metaclass.bootstrap.forgeConstructor({
                name: "Child",
                kindOf: Parent,
            });
            const instance = new Child();
            let result =
                instance instanceof Parent && instance instanceof Child;
            return result;
        },
    });

    new Test({
        description:
            "Bootstrap __meta is strictly isolated and does not leak to generic subclasses",
        code: () => {
            const Base = Metaclass.bootstrap.forgeConstructor({ name: "Base" });
            class PlainSub extends Base {}
            let result =
                Base.__meta !== undefined &&
                Base.__meta.name === "Base" &&
                PlainSub.__meta === undefined;
            return result;
        },
    });

    new Test({
        description:
            "Bootstrap weakset tracks instantiated objects in __meta.instances",
        code: () => {
            const Tracked = Metaclass.bootstrap.forgeConstructor({
                name: "Tracked",
            });
            const inst = new Tracked();
            let result = Tracked.__meta.instances.has(inst);
            return result;
        },
    });

    new Test({
        description:
            "Bootstrap subclasses created via factory have their own isolated __meta",
        code: () => {
            const BaseClass = Metaclass.bootstrap.forgeConstructor({
                name: "BaseClass",
            });
            const SubClass = Metaclass.bootstrap.forgeConstructor({
                name: "SubClass",
                kindOf: BaseClass,
            });
            const subInst = new SubClass();
            let result =
                SubClass.__meta !== undefined &&
                SubClass.__meta.name === "SubClass" &&
                SubClass.__meta.instances.has(subInst) &&
                !BaseClass.__meta.instances.has(subInst);
            return result;
        },
    });

    new Test({
        description:
            "Bootstrap Parent __meta.subclasses array updates automatically",
        code: () => {
            const BaseClass = Metaclass.bootstrap.forgeConstructor({
                name: "BaseClass",
            });
            const SubClass = Metaclass.bootstrap.forgeConstructor({
                name: "SubClass",
                kindOf: BaseClass,
            });
            let result = BaseClass.__meta.subclasses.includes("SubClass");
            return result;
        },
    });

    new Test({
        description:
            "GenericFunction: Method and GenericFunction instances share system DNA",
        code: () => {
            GenericFunction.defgeneric("systemCheck");
            const gf = GenericFunction._registry.get("systemCheck");
            GenericFunction.defmethod("systemCheck", [String], () => "ok");
            const method = gf.getMethods()[0];
            return (
                gf.constructor.__meta.name === "GenericFunction" &&
                method.constructor.__meta.name === "Method"
            );
        },
    });

    new Test({
        description:
            "8. GenericFunction: defmethod routes based on primitive types",
        code: () => {
            GenericFunction.defgeneric("serialize");
            GenericFunction.defmethod(
                "serialize",
                [String],
                (val) => `String: ${val}`,
            );
            GenericFunction.defmethod(
                "serialize",
                [Number],
                (val) => `Number: ${val}`,
            );
            return (
                GenericFunction._registry.get("serialize").dispatch("hello") ===
                    "String: hello" &&
                GenericFunction._registry.get("serialize").dispatch(42) ===
                    "Number: 42"
            );
        },
    });

    new Test({
        description:
            "9. GenericFunction: defmethod handles arity and multi-dispatch",
        code: () => {
            GenericFunction.defgeneric("collide");
            GenericFunction.defmethod(
                "collide",
                [String, Number],
                (s, n) => `Hit ${s} with ${n}`,
            );
            return (
                GenericFunction._registry
                    .get("collide")
                    .dispatch("Wall", 50) === "Hit Wall with 50"
            );
        },
    });

    new Test({
        description:
            "GenericFunction: routes based on Class Identity vs primitive",
        code: () => {
            const Dummy = Metaclass.bootstrap.forgeConstructor({
                name: "Dummy",
            });
            GenericFunction.defgeneric("ping");
            GenericFunction.defmethod(
                "ping",
                [Dummy],
                function () {
                    return "pong-static";
                },
                "primary",
                true,
            );
            return (
                GenericFunction._registry.get("ping").dispatch(Dummy) ===
                "pong-static"
            );
        },
    });

    new Test({
        description:
            "Class parsing routes instance methods through GenericFunction router",
        code: () => {
            const Greeter = Class({
                name: "Greeter",
                methods: {
                    public: {
                        instance: {
                            sayHi: (obj, name) =>
                                `Hello ${name} from ${obj.constructor.name}`,
                        },
                    },
                },
            });
            const g = new Greeter();
            let result = g.sayHi("World") === "Hello World from Greeter";
            let registryCheck =
                GenericFunction._registry.has("sayHi") &&
                GenericFunction._registry.get("sayHi").getMethods().length > 0;
            return result && registryCheck;
        },
    });

    new Test({
        description:
            "Class parsing routes static methods through GenericFunction router",
        code: () => {
            const Config = Class({
                name: "Config",
                methods: {
                    public: {
                        class: { check: (cls) => `System OK for ${cls.name}` },
                    },
                },
            });
            return Config.check() === "System OK for Config";
        },
    });

    new Test({
        description:
            "Class provisions isolated private state per instance via Metaclass.Private",
        code: () => {
            const Counter = Class({
                name: "Counter",
                properties: { private: { instance: { count: 0 } } },
                methods: {
                    public: {
                        instance: {
                            increment: function () {
                                this[Metaclass.Private].count++;
                                return this[Metaclass.Private].count;
                            },
                        },
                    },
                },
            });
            const c1 = new Counter();
            const c2 = new Counter();
            c1.increment();
            let isolated =
                c1[Metaclass.Private].count === 1 &&
                c2[Metaclass.Private].count === 0;
            let hidden = !Object.keys(c1).includes("count");
            return isolated && hidden;
        },
    });

    new Test({
        description:
            "GenericFunction: Method execution correctly binds `this` to the first argument (receiver)",
        code: () => {
            const ContextTest = Class({
                name: "ContextTest",
                methods: {
                    public: {
                        instance: {
                            checkThis: function () {
                                return this;
                            },
                        },
                    },
                },
            });
            const inst = new ContextTest();
            return inst.checkThis() === inst;
        },
    });

    new Test({
        description:
            "Proxy Interceptor: Private state is accessible via natural property syntax (this.x)",
        code: () => {
            const BankAccount = Class({
                name: "BankAccount",
                properties: {
                    private: { instance: { balance: 100 } },
                    public: { instance: { owner: "Alice" } },
                },
                methods: {
                    public: {
                        instance: {
                            deposit: function (amount) {
                                this.balance += amount;
                                return this.balance;
                            },
                        },
                    },
                },
            });
            const account = new BankAccount();
            account.deposit(50);
            let methodAccessWorks = account.deposit(0) === 150;
            let isHidden =
                account.balance === undefined &&
                !Object.keys(account).includes("balance");
            let publicWorks = account.owner === "Alice";
            return methodAccessWorks && isHidden && publicWorks;
        },
    });

    new Test({
        name: "test: Around Normalizer Bug",
        description:
            "Ensures :around syntactic sugar is routed to the AOP matrix, not the prototype.",
        code: () => {
            const TestPage = Class({
                name: "TestPage",
                content: "",
                values: null,

                around: {
                    instance: {
                        extract: function () {
                            const result = this.inner();
                            this.values = result;
                            return this.values;
                        },
                    },
                },

                extract: function () {
                    return this.content;
                },
            });

            const TestHTMLPage = Class({
                name: "TestHTMLPage",
                kindOf: TestPage,
                extract: function () {
                    return { type: "DOM", text: this.content };
                },
            });

            const testPage = new TestHTMLPage({ content: "test string" });
            testPage.extract();

            if (typeof TestPage.prototype.around !== "undefined") {
                throw new Error(
                    "Normalizer polluted prototype: 'around' block was mapped as a public property.",
                );
            }

            if (testPage.values === null) {
                throw new Error(
                    ":around qualifier did not execute; state remained null.",
                );
            }

            return true;
        },
    });

    new Test({
        name: "test: Outer Dispatch With Inner",
        description:
            "Proves that calling this.extract() from another method hits the outermost :around layer.",
        code: () => {
            const DispatchTest = Class({
                name: "DispatchTest",

                around: {
                    instance: {
                        extract: function () {
                            return "OUTER(" + this.inner() + ")";
                        },
                    },
                },

                extract: function () {
                    return "INNER";
                },

                process: function () {
                    return this.extract();
                },
            });

            const instance = new DispatchTest();
            const result = instance.process();

            if (result !== "OUTER(INNER)") {
                throw new Error(
                    `Dispatch failed. Expected 'OUTER(INNER)', got '${result}'`,
                );
            }

            return true;
        },
    });

    new Test({
        name: "test: Generic Function Remove Method",
        description:
            "Verifies that removeMethod successfully strips specific methods by qualifier and specializer.",
        code: () => {
            const TestTarget = Class({ name: "TestTarget" });

            globalThis.GenericFunction.defmethod(
                "testOp",
                [TestTarget],
                function () {
                    return "primary";
                },
                "primary",
            );
            globalThis.GenericFunction.defmethod(
                "testOp",
                [TestTarget],
                function () {
                    return "before";
                },
                "before",
            );
            globalThis.GenericFunction.defmethod(
                "testOp",
                [TestTarget],
                function () {
                    return "around";
                },
                "around",
            );

            const gf = globalThis.GenericFunction.defgeneric("testOp");

            const initialCount = gf
                .getMethods()
                .filter((m) => m.getSpecializers().includes(TestTarget)).length;
            if (initialCount !== 3) {
                throw new Error(
                    `Setup failed: Expected 3 methods for TestTarget, found ${initialCount}`,
                );
            }

            gf.removeMethod("before", TestTarget);

            const methodsAfterBeforeRemove = gf
                .getMethods()
                .filter((m) => m.getSpecializers().includes(TestTarget));
            const hasBefore = methodsAfterBeforeRemove.some(
                (m) => m.getQualifier() === "before",
            );
            const hasPrimary = methodsAfterBeforeRemove.some(
                (m) => m.getQualifier() === "primary",
            );
            const hasAround = methodsAfterBeforeRemove.some(
                (m) => m.getQualifier() === "around",
            );

            if (hasBefore) {
                throw new Error(
                    "Removal failed: 'before' method was not stripped.",
                );
            }
            if (!hasPrimary || !hasAround) {
                throw new Error(
                    "Removal collateral damage: 'primary' or 'around' methods were incorrectly stripped.",
                );
            }

            gf.removeMethod("primary", TestTarget);
            gf.removeMethod("around", TestTarget);

            const finalCount = gf
                .getMethods()
                .filter((m) => m.getSpecializers().includes(TestTarget)).length;
            if (finalCount !== 0) {
                throw new Error(
                    `Cleanup failed: Expected 0 methods remaining for TestTarget, found ${finalCount}`,
                );
            }

            return true;
        },
    });

    new Test({
        description:
            "MOP Class parsing converts advised property to accessor backed by Symbol",
        code: () => {
            const AdvisedPropertyClass = Class({
                name: "AdvisedPropertyClass",
                properties: {
                    public: {
                        instance: {
                            myState: "initial",
                        },
                    },
                },
                after: {
                    instance: {
                        myState: function () {
                            this.stateChanged = true;
                        },
                    },
                },
            });

            const inst = new AdvisedPropertyClass();

            const descriptor = Object.getOwnPropertyDescriptor(
                AdvisedPropertyClass.prototype,
                "myState",
            );
            const isAccessor =
                descriptor &&
                typeof descriptor.get === "function" &&
                typeof descriptor.set === "function";

            const symbolExists =
                AdvisedPropertyClass.__meta &&
                AdvisedPropertyClass.__meta.slotSymbols &&
                typeof AdvisedPropertyClass.__meta.slotSymbols.myState ===
                    "symbol";

            return isAccessor && symbolExists;
        },
    });

    new Test({
        description:
            "JIT Slot Advising properly triggers :after method and updates state via dispatcher",
        code: () => {
            const AdvisedStateClass = Class({
                name: "AdvisedStateClass",
                properties: {
                    public: {
                        instance: {
                            urlBuilder: "http://default",
                        },
                    },
                },
                after: {
                    instance: {
                        urlBuilder: function (newVal) {
                            this.buildCount = (this.buildCount || 0) + 1;
                            this.lastBuilt = newVal;
                        },
                    },
                },
            });

            const inst = new AdvisedStateClass();

            const initialCheck =
                inst.urlBuilder === "http://default" &&
                inst.buildCount === undefined;

            inst.urlBuilder = "http://new-url";

            const updateCheck =
                inst.urlBuilder === "http://new-url" &&
                inst.buildCount === 1 &&
                inst.lastBuilt === "http://new-url";

            return initialCheck && updateCheck;
        },
    });

    new Test({
        description:
            "Native accessors defined in the DSL matrix are preserved during MOP parsing",
        code: () => {
            let getterCalled = false;
            let setterCalled = false;

            const NativeAccessorClass = Class({
                name: "NativeAccessorClass",
                properties: {
                    public: {
                        instance: {
                            get customProp() {
                                getterCalled = true;
                                return this._customProp;
                            },
                            set customProp(val) {
                                setterCalled = true;
                                this._customProp = val;
                            },
                        },
                    },
                },
            });

            const inst = new NativeAccessorClass();
            inst.customProp = "test";
            const val = inst.customProp;

            return (
                setterCalled === true && getterCalled === true && val === "test"
            );
        },
    });

    // ============================================================================
    // SHARED TRAIT DEFINITIONS FOR TESTS
    // ============================================================================
    var TimestampableTrait = new Trait({
        name: "Timestampable",
        properties: {
            public: { instance: { createdAt: null, updatedAt: null } },
        },
        methods: {
            public: {
                instance: {
                    touch: function () {
                        this.updatedAt = new Date().toISOString();
                    },
                },
            },
            after: {
                instance: {
                    initialize: function () {
                        this.createdAt = new Date().toISOString();
                        this.updatedAt = this.createdAt;
                    },
                },
            },
        },
    });

    var SummarizableTrait = new Trait({
        name: "Summarizable",
        methods: {
            public: {
                instance: {
                    getSummary: function () {
                        var t = this.title || this.name || "Untitled";
                        var b = this.body
                            ? this.body.substring(0, 20) + "..."
                            : "No content";
                        return t + ": " + b;
                    },
                },
            },
        },
    });

    var InstantiationLoggerTrait = new Trait({
        name: "InstantiationLogger",
        methods: {
            around: {
                instance: {
                    initialize: function () {
                        return this.inner();
                    },
                },
            },
        },
    });

    new Test({
        description:
            "Trait System: SummarizableTrait provides stateless pure behavior based on Host state",
        code: () => {
            var SummaryDocument = Class({
                name: "SummaryDocument",
                traits: [SummarizableTrait],
                properties: { public: { instance: { title: "", body: "" } } },
                methods: {
                    public: {
                        instance: {
                            initialize: function (title, body) {
                                this.title = title;
                                this.body = body;
                            },
                        },
                    },
                },
            });

            let doc = new SummaryDocument(
                "Ouro Vision",
                "To bring true metaprogramming to the browser.",
            );
            let summary = doc.getSummary();

            return summary === "Ouro Vision: To bring true metapr...";
        },
    });

    new Test({
        description:
            "Trait System: Multiple traits can be woven onto a single host class",
        code: () => {
            var OmniDocument = Class({
                name: "OmniDocument",
                traits: [
                    InstantiationLoggerTrait,
                    TimestampableTrait,
                    SummarizableTrait,
                ],
                properties: { public: { instance: { title: "", body: "" } } },
                methods: {
                    public: {
                        instance: {
                            initialize: function (title, body) {
                                this.title = title;
                                this.body = body;
                            },
                        },
                    },
                },
            });

            let doc = new OmniDocument(
                "Combined",
                "All traits working together.",
            );

            let hasTimestamp = doc.createdAt !== null;
            let hasSummaryMethod = typeof doc.getSummary === "function";
            let hasCorrectSummary =
                doc.getSummary() === "Combined: All traits working t...";

            return hasTimestamp && hasSummaryMethod && hasCorrectSummary;
        },
    });

    // ============================================================================
    // TEST SUITE: NATIVE DELEGATION
    // ============================================================================

    new Test({
        description:
            "Native System: Base classes can be generated purely via Trait.native without Metaclass pollution",
        code: () => {
            var NativeURLBase = Class({
                name: "NativeURLBase",
                traits: [
                    Trait.native(URL, {
                        only: ["href", "pathname", "searchParams"],
                        alias: { href: "urlHref" },
                    }),
                ],
            });

            var BaseRouter = Class({
                name: "BaseRouter",
                kindOf: NativeURLBase,
                initialize: function (urlStr) {
                    this._nativeURLObject = new URL(urlStr);
                },
            });

            let router = new BaseRouter("https://google.com/search?q=ouro");

            let aliasWorks =
                router.urlHref === "https://google.com/search?q=ouro";
            let methodWorks = router.searchParams.get("q") === "ouro";

            router.pathname = "/maps";
            let proxySetterWorks =
                router.nativeURL().href === "https://google.com/maps?q=ouro";

            return aliasWorks && methodWorks && proxySetterWorks;
        },
    });

    new Test({
        description:
            "Native System: Trait.native inline weaving applies smart default state",
        code: () => {
            var SimpleURL = Class({
                name: "SimpleURL",
                traits: [Trait.native(URL, { only: ["href", "host"] })],
                methods: {
                    public: {
                        instance: {
                            initialize: function (urlStr) {
                                this._nativeURLObject = new URL(urlStr);
                            },
                        },
                    },
                },
            });

            let u = new SimpleURL("https://gemini.google.com/app");

            let hostWorks = u.host === "gemini.google.com";
            let defaultAccessorWorks = u.nativeURL() instanceof URL;

            return hostWorks && defaultAccessorWorks;
        },
    });

    new Test({
        description:
            "Native System: Trait.native inline weaving applies smart default state (Flattened)",
        code: () => {
            var SimpleURL = Class({
                name: "SimpleURL",
                traits: [Trait.native(URL, { only: ["href", "host"] })],
                initialize: function (urlStr) {
                    this._nativeURLObject = new URL(urlStr);
                },
            });

            let u = new SimpleURL("https://gemini.google.com/app");

            let hostWorks = u.host === "gemini.google.com";
            let defaultAccessorWorks = u.nativeURL() instanceof URL;

            return hostWorks && defaultAccessorWorks;
        },
    });

    new Test({
        description:
            "Native System: Trait.native supports multiple namespaced instances without collision",
        code: () => {
            var DualRouter = Class({
                name: "DualRouter",
                traits: [
                    Trait.native(URL, {
                        state: "source",
                        only: ["href", "pathname"],
                        alias: { href: "sourceHref", pathname: "sourcePath" },
                    }),
                    Trait.native(URL, {
                        state: "target",
                        only: ["href", "searchParams"],
                        alias: { href: "targetHref" },
                    }),
                ],
                methods: {
                    public: {
                        instance: {
                            initialize: function (sourceStr, targetStr) {
                                this._sourceObject = new URL(sourceStr);
                                this._targetObject = new URL(targetStr);
                            },
                        },
                    },
                },
            });

            let router = new DualRouter(
                "https://gemini.google.com/app/old",
                "https://www.google.com/maps?q=Oakland",
            );

            let proxyA =
                router.sourceHref === "https://gemini.google.com/app/old";
            let proxyB =
                router.targetHref === "https://www.google.com/maps?q=Oakland";

            router.sourcePath = "/app/new";

            let mutationA =
                router.source().href === "https://gemini.google.com/app/new";
            let isolationB =
                router.target().href ===
                "https://www.google.com/maps?q=Oakland";

            return proxyA && proxyB && mutationA && isolationB;
        },
    });

    // ============================================================================
    // SELF-CONTAINED ROUTEURL MODULE & TEST SUITE CLOSURE
    // ============================================================================

    const RouteURL = Class({
        name: "RouteURL",
        publish: false,
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

        properties: {
            public: {
                instance: {
                    builder: "",
                    args: {},
                    pattern: null,
                    variables: [],
                },
            },
        },

        methods: {
            public: {
                instance: {
                    initialize: function (builderString = "", args = {}) {
                        this.builder = builderString;
                        this.args = args;
                        this.build();
                    },

                    build: function () {
                        const hasAllVariables = this.variables.every(
                            (varName) =>
                                Object.prototype.hasOwnProperty.call(
                                    this.args,
                                    varName,
                                ),
                        );

                        if (!hasAllVariables || !this.builder) {
                            this._nativeObject = undefined;
                            return;
                        }

                        try {
                            let actualUrl = this.builder;
                            for (const varName of this.variables) {
                                actualUrl = actualUrl
                                    .split(`\${${varName}}`)
                                    .join(this.args[varName]);
                            }
                            this._nativeObject = new URL(actualUrl);
                        } catch (err) {
                            this._nativeObject = undefined;
                        }
                    },

                    match: function (testUrlStr) {
                        if (!this.pattern) return null;
                        if (typeof this.pattern === "function")
                            return this.pattern(testUrlStr) ? {} : null;
                        if (typeof this.pattern === "string")
                            return testUrlStr.includes(this.pattern)
                                ? {}
                                : null;

                        const result = testUrlStr.match(this.pattern);
                        if (!result) return null;

                        const extracted = {};
                        this.variables.forEach((varName, idx) => {
                            extracted[varName] = result[idx + 1];
                        });

                        return extracted;
                    },
                },
            },
        },

        after: {
            instance: {
                builder(newBuilder) {
                    if (!newBuilder) {
                        this.variables = [];
                        this.pattern = null;
                        this._nativeObject = undefined;
                        return;
                    }

                    let patternTarget = newBuilder
                        .replace(/^https?:/i, "")
                        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const parts = patternTarget.split(/\\\$\\\{(.+?)\\\}/);

                    this.variables = parts.filter((_, i) => i % 2 !== 0);
                    const mappedRegex = parts
                        .map((part, i) => (i % 2 === 0 ? part : "([^/?#]+)"))
                        .join("");
                    this.pattern = new RegExp(`${mappedRegex}$`, "i");

                    this.build();
                },

                args() {
                    this.build();
                },
            },
        },
    });

    new Test({
        description:
            "RouteURL: Unbuilt state defensively returns undefined for accessors (href, pathname)",
        code: () => {
            const route = new RouteURL(
                "https://api.domain.com/v1/${resource}/${id}",
            );
            let safeHref = route.href === undefined;
            let safePath = route.pathname === undefined;
            return safeHref && safePath;
        },
    });

    new Test({
        description:
            "RouteURL: Unbuilt state safely ignores native setter assignments without crashing",
        code: () => {
            const route = new RouteURL("https://api.domain.com/v1/${resource}");
            try {
                route.pathname = "/hacked/path";
                return route.pathname === undefined;
            } catch (e) {
                return false;
            }
        },
    });

    new Test({
        description:
            "RouteURL: Unbuilt state safely returns undefined for mapped native method calls",
        code: () => {
            const route = new RouteURL("https://api.domain.com/v1/${resource}");
            try {
                return route.nativeToJSON() === undefined;
            } catch (e) {
                return false;
            }
        },
    });

    new Test({
        description:
            "RouteURL: Full hydration dynamically builds the native object and exposes native properties",
        code: () => {
            const route = new RouteURL(
                "https://api.domain.com/v1/${resource}/${id}",
            );
            route.args = { resource: "users", id: 42 };
            let hrefWorks = route.href === "https://api.domain.com/v1/users/42";
            let pathWorks = route.pathname === "/v1/users/42";
            return hrefWorks && pathWorks;
        },
    });

    new Test({
        description:
            "RouteURL: Partial hydration correctly suspends native object creation",
        code: () => {
            const route = new RouteURL(
                "https://api.domain.com/v1/${resource}/${id}",
            );
            route.args = { resource: "users" };
            return route.href === undefined;
        },
    });

    new Test({
        description:
            "RouteURL: State de-hydration gracefully unbuilds and protects the native object",
        code: () => {
            const route = new RouteURL(
                "https://api.domain.com/v1/${resource}/${id}",
            );
            route.args = { resource: "users", id: 42 };
            let builtHref = route.href;
            route.args = { resource: "users" };
            return (
                builtHref === "https://api.domain.com/v1/users/42" &&
                route.href === undefined
            );
        },
    });

    new Test({
        description:
            "RouteURL: Pattern matching successfully extracts URL variables",
        code: () => {
            const route = new RouteURL(
                "https://api.domain.com/v1/${type}/${hash}?token=${token}",
            );
            const extracted = route.match(
                "https://api.domain.com/v1/assets/a8f9?token=xyz",
            );
            let isObject = extracted !== null;
            let typeMatches = extracted && extracted.type === "assets";
            let hashMatches = extracted && extracted.hash === "a8f9";
            return isObject && typeMatches && hashMatches;
        },
    });

    new Test({
        description:
            "RouteURL: Pattern matching strictly returns null for non-matching URLs",
        code: () => {
            const route = new RouteURL(
                "https://api.domain.com/v1/${type}/${hash}",
            );
            const extracted = route.match("https://google.com/v1/assets");
            return extracted === null;
        },
    });

    new Test({
        description:
            "RouteURL: Dynamic builder mutation reactively updates the internal variable parser",
        code: () => {
            const route = new RouteURL();
            route.builder = "https://test.com/${foo}/${bar}";
            let parsedCount = route.variables.length === 2;
            let parsedNames =
                route.variables.includes("foo") &&
                route.variables.includes("bar");
            return parsedCount && parsedNames;
        },
    });

    new Test({
        name: "mop_property_vault_access",
        description:
            "Explicit getters and setters correctly mount the private vault via the GenericFunction dispatcher.",
        code: () => {
            const StateTest = Class({
                name: "StateTest",
                private: {
                    _secret: "initial",
                },
                get v() {
                    return this._secret;
                },
                set v(val) {
                    this._secret = val;
                },
            });

            const obj = new StateTest();
            if (obj.v !== "initial") return false;
            obj.v = "updated";
            return obj.v === "updated";
        },
    });

    new Test({
        name: "mop_property_before_after_advice",
        description:
            "Setters trigger :before advice and getters trigger :after advice using standard AOP syntax.",
        code: () => {
            let beforeVal = 0;
            let afterTriggered = false;

            const AOPTest = Class({
                name: "AOPTest",
                private: {
                    _val: 0,
                },
                get v() {
                    return this._val;
                },
                set v(val) {
                    this._val = val;
                },
                methods: {
                    before: {
                        instance: {
                            "set:v": function (val) {
                                beforeVal = val;
                            },
                        },
                    },
                    after: {
                        instance: {
                            "get:v": function () {
                                afterTriggered = true;
                            },
                        },
                    },
                },
            });

            const obj = new AOPTest();
            obj.v = 42;
            const captured = obj.v;

            return (
                beforeVal === 42 && afterTriggered === true && captured === 42
            );
        },
    });

    new Test({
        name: "mop_property_around_advice",
        description:
            "An :around method can successfully intercept, modify, and return a getter's value using inner.",
        code: () => {
            const AroundTest = Class({
                name: "AroundTest",
                private: {
                    _secret: "raw_data",
                },
                get v() {
                    return this._secret;
                },
                methods: {
                    around: {
                        instance: {
                            "get:v": function () {
                                const original = this.inner();
                                return original.toUpperCase();
                            },
                        },
                    },
                },
            });

            const obj = new AroundTest();
            return obj.v === "RAW_DATA";
        },
    });

    new Test({
        name: "mop_standard_property_bypass",
        description:
            "Standard data properties (no getters/setters) bypass the AOP router safely.",
        code: () => {
            const StandardTest = Class({
                name: "StandardTest",
                properties: {
                    public: {
                        instance: {
                            staticData: 100,
                        },
                    },
                },
            });

            const obj = new StandardTest();
            if (obj.staticData !== 100) return false;

            obj.staticData = 999;
            return obj.staticData === 999;
        },
    });

    new Test({
        description:
            "MOP Method Inheritance: Metaclass instance methods successfully apply to generated Classes",
        code: () => {
            try {
                const TestExtension = Class({ name: "TestExtension" });
                return typeof TestExtension.addMethods === "function";
            } catch (e) {
                console.error(e.message);
                return false;
            }
        },
    });

    new Test({
        description:
            "MOP Method Inheritance: Metaclass instance methods successfully apply to generated Classes",
        code: () => {
            try {
                const TestExtension = Class({ name: "TestExtension" });
                return typeof TestExtension.addMethods === "function";
            } catch (e) {
                console.error(e.message);
                return false;
            }
        },
    });

    new Test({
        name: "test: Multiple Around Advices Chain",
        description:
            "Dispatcher correctly chains multiple :around methods via this.inner(), ensuring traits do not overwrite base class advice.",
        code: () => {
            const ChainTarget = Class({
                name: "ChainTarget",
                methods: {
                    public: {
                        instance: {
                            op: function () {
                                return "CORE";
                            },
                        },
                    },
                },
            });

            GenericFunction.defmethod(
                "op",
                [ChainTarget],
                function () {
                    return "OUTER(" + this.inner() + ")";
                },
                "around",
            );

            GenericFunction.defmethod(
                "op",
                [ChainTarget],
                function () {
                    return "INNER(" + this.inner() + ")";
                },
                "around",
            );

            const inst = new ChainTarget();
            const result = inst.op();

            return (
                result === "INNER(OUTER(CORE))" ||
                result === "OUTER(INNER(CORE))"
            );
        },
    });

    new Test({
        name: "test: Async Around Advice Inner Preservation",
        description:
            "Async :around advices preserve this.inner context across execution boundaries without synchronous cleanup destroying the pointer.",
        code: () => {
            const AsyncTarget = Class({
                name: "AsyncTarget",
                methods: {
                    public: { instance: { op: () => "core" } },
                },
            });

            let capturedInnerType = "not_captured";
            GenericFunction.defmethod(
                "op",
                [AsyncTarget],
                function () {
                    return {
                        then: (resolve) => {
                            capturedInnerType = typeof this.inner;
                            resolve("resolved");
                        },
                    };
                },
                "around",
            );

            const inst = new AsyncTarget();
            inst.op();

            return capturedInnerType === "function";
        },
    });

    const MatrixClass = Class({
        name: "MatrixClass",

        properties: {
            public: {
                instance: { publicInstProp: "pub_inst_val" },
                class: { publicClassProp: "pub_class_val" },
            },
            private: {
                instance: { privateInstProp: "priv_inst_val" },
                class: { privateClassProp: "priv_class_val" },
            },
        },

        methods: {
            public: {
                instance: {
                    publicInstMethod: function () {
                        return `Instance Context: [Prop: ${this.privateInstProp}] [Meth: ${this.privateInstMethod()}]`;
                    },
                },
                class: {
                    publicClassMethod: function () {
                        return `Class Context: [Prop: ${this.privateClassProp}] [Meth: ${this.privateClassMethod()}]`;
                    },
                },
            },
            private: {
                instance: {
                    privateInstMethod: function () {
                        return "priv_inst_meth_executed";
                    },
                },
                class: {
                    privateClassMethod: function () {
                        return "priv_class_meth_executed";
                    },
                },
            },
        },
    });

    const matrixInstance = new MatrixClass();

    new Test({
        name: "Matrix: Public Properties",
        description:
            "Public properties are directly accessible on their respective class and instance objects.",
        code: () => {
            return (
                MatrixClass.publicClassProp === "pub_class_val" &&
                matrixInstance.publicInstProp === "pub_inst_val"
            );
        },
    });

    new Test({
        name: "Matrix: Private Property Encapsulation",
        description:
            "Private properties are strictly hidden from the outside world and return undefined.",
        code: () => {
            return (
                MatrixClass.privateClassProp === undefined &&
                matrixInstance.privateInstProp === undefined
            );
        },
    });

    new Test({
        name: "Matrix: Private Method Encapsulation",
        description:
            "Private methods are strictly hidden from the outside world and return undefined.",
        code: () => {
            return (
                typeof MatrixClass.privateClassMethod === "undefined" &&
                typeof matrixInstance.privateInstMethod === "undefined"
            );
        },
    });

    new Test({
        name: "Matrix: Internal Execution Routing",
        description:
            "Public methods successfully mount the MOP vault and can internally execute private methods and read private properties.",
        code: () => {
            const classResult = MatrixClass.publicClassMethod();
            const instResult = matrixInstance.publicInstMethod();

            const classSuccess =
                classResult ===
                "Class Context: [Prop: priv_class_val] [Meth: priv_class_meth_executed]";
            const instSuccess =
                instResult ===
                "Instance Context: [Prop: priv_inst_val] [Meth: priv_inst_meth_executed]";

            return classSuccess && instSuccess;
        },
    });

    const log = [];

    const AdviceMatrixClass = Class({
        name: "AdviceMatrixClass",

        methods: {
            public: {
                instance: {
                    pubInstMethod() {
                        log.push("core:pubInst");
                        return this.privInstMethod();
                    },
                },
                class: {
                    pubClassMethod() {
                        log.push("core:pubClass");
                        return this.privClassMethod();
                    },
                },
            },
            private: {
                instance: {
                    privInstMethod() {
                        log.push("core:privInst");
                        return "inst_done";
                    },
                },
                class: {
                    privClassMethod() {
                        log.push("core:privClass");
                        return "class_done";
                    },
                },
            },
            before: {
                instance: {
                    pubInstMethod() {
                        log.push("before:pubInst");
                    },
                    privInstMethod() {
                        log.push("before:privInst");
                    },
                },
                class: {
                    pubClassMethod() {
                        log.push("before:pubClass");
                    },
                    privClassMethod() {
                        log.push("before:privClass");
                    },
                },
            },
            around: {
                instance: {
                    pubInstMethod() {
                        log.push("around_enter:pubInst");
                        const res = this.inner();
                        log.push("around_exit:pubInst");
                        return res;
                    },
                    privInstMethod() {
                        log.push("around_enter:privInst");
                        const res = this.inner();
                        log.push("around_exit:privInst");
                        return res;
                    },
                },
                class: {
                    pubClassMethod() {
                        log.push("around_enter:pubClass");
                        const res = this.inner();
                        log.push("around_exit:pubClass");
                        return res;
                    },
                    privClassMethod() {
                        log.push("around_enter:privClass");
                        const res = this.inner();
                        log.push("around_exit:privClass");
                        return res;
                    },
                },
            },
            after: {
                instance: {
                    pubInstMethod() {
                        log.push("after:pubInst");
                    },
                    privInstMethod() {
                        log.push("after:privInst");
                    },
                },
                class: {
                    pubClassMethod() {
                        log.push("after:pubClass");
                    },
                    privClassMethod() {
                        log.push("after:privClass");
                    },
                },
            },
        },
    });

    const adviceInstance = new AdviceMatrixClass();

    new Test({
        name: "Advice Matrix: Public Instance Method Advising",
        description:
            "Verifies strict advice sequencing (before -> around -> primary -> around_exit -> after) on public instance methods.",
        code: () => {
            log.length = 0;
            const res = adviceInstance.pubInstMethod();

            const expectedPubSequence = [
                "around_enter:pubInst",
                "before:pubInst",
                "core:pubInst",
            ];

            const isMatch =
                expectedPubSequence.every((step, idx) => log[idx] === step) &&
                log.includes("around_exit:pubInst") &&
                log.includes("after:pubInst") &&
                res === "inst_done";

            if (!isMatch) {
                console.error(
                    "Public Instance log mismatch. Actual execution trace:",
                    log,
                );
            }
            return isMatch;
        },
    });

    new Test({
        name: "Advice Matrix: Private Instance Method Advising",
        description:
            "Verifies that internal calls to private instance methods trigger their registered :before, :around, and :after advices.",
        code: () => {
            log.length = 0;
            adviceInstance.pubInstMethod();

            const expectedPrivateSequence = [
                "around_enter:privInst",
                "before:privInst",
                "core:privInst",
                "around_exit:privInst",
                "after:privInst",
            ];

            const startIndex = log.indexOf("around_enter:privInst");
            if (startIndex === -1) {
                console.error(
                    "Private instance method advices did not execute. Trace:",
                    log,
                );
                return false;
            }

            const actualSubsequence = log.slice(
                startIndex,
                startIndex + expectedPrivateSequence.length,
            );
            const isMatch = expectedPrivateSequence.every(
                (step, idx) => actualSubsequence[idx] === step,
            );

            if (!isMatch) {
                console.error(
                    "Private Instance sequence mismatch. Expected:",
                    expectedPrivateSequence,
                    "Got:",
                    actualSubsequence,
                );
            }
            return isMatch;
        },
    });

    new Test({
        name: "Advice Matrix: Public Class Method Advising",
        description:
            "Verifies strict advice sequencing (before -> around -> primary -> around_exit -> after) on public class (static) methods.",
        code: () => {
            log.length = 0;
            const res = AdviceMatrixClass.pubClassMethod();

            const expectedClassSequence = [
                "around_enter:pubClass",
                "before:pubClass",
                "core:pubClass",
            ];

            const isMatch =
                expectedClassSequence.every((step, idx) => log[idx] === step) &&
                log.includes("around_exit:pubClass") &&
                log.includes("after:pubClass") &&
                res === "class_done";

            if (!isMatch) {
                console.error(
                    "Public Class log mismatch. Actual execution trace:",
                    log,
                );
            }
            return isMatch;
        },
    });

    new Test({
        name: "Advice Matrix: Private Class Method Advising",
        description:
            "Verifies that internal calls to private class methods trigger their registered :before, :around, and :after advices.",
        code: () => {
            log.length = 0;
            AdviceMatrixClass.pubClassMethod();

            const expectedPrivateClassSequence = [
                "around_enter:privClass",
                "before:privClass",
                "core:privClass",
                "around_exit:privClass",
                "after:privClass",
            ];

            const startIndex = log.indexOf("around_enter:privClass");
            if (startIndex === -1) {
                console.error(
                    "Private class method advices did not execute. Trace:",
                    log,
                );
                return false;
            }

            const actualSubsequence = log.slice(
                startIndex,
                startIndex + expectedPrivateClassSequence.length,
            );
            const isMatch = expectedPrivateClassSequence.every(
                (step, idx) => actualSubsequence[idx] === step,
            );

            if (!isMatch) {
                console.error(
                    "Private Class sequence mismatch. Expected:",
                    expectedPrivateClassSequence,
                    "Got:",
                    actualSubsequence,
                );
            }
            return isMatch;
        },
    });

    new Test({
        name: "Diag 1: Trait Overwrite Collision",
        description:
            "Validates if the Normalizer is overwriting Trait methods during matrix parsing instead of merging them.",
        code: () => {
            const DummyTrait = new Trait({
                name: "DummyTrait",
                methods: {
                    public: { instance: { traitMethod: () => "trait_active" } },
                },
            });

            const HostClass = Class({
                name: "HostClass",
                traits: [DummyTrait],
                methods: {
                    public: { instance: { hostMethod: () => "host_active" } },
                },
            });

            const inst = new HostClass();
            const hasTraitMethod = typeof inst.traitMethod === "function";
            const hasHostMethod = typeof inst.hostMethod === "function";

            if (!hasHostMethod)
                console.error("[Diag 1] Host method was destroyed.");
            if (!hasTraitMethod)
                console.error("[Diag 1] Trait method was never woven.");

            return hasTraitMethod && hasHostMethod;
        },
    });

    new Test({
        name: "Diag 2: The Accessor Vacuum",
        description:
            "Validates if native getters/setters in the DSL survive normalization and are correctly mounted on the prototype.",
        code: () => {
            const AccessorClass = Class({
                name: "AccessorClass",
                properties: {
                    public: {
                        instance: {
                            get testAccessor() {
                                return this._val || "default";
                            },
                            set testAccessor(v) {
                                this._val = v;
                            },
                        },
                    },
                },
            });

            const inst = new AccessorClass();
            const initial = inst.testAccessor;
            inst.testAccessor = "vacuum_test";
            const updated = inst.testAccessor;

            if (initial !== "default")
                console.error(
                    `[Diag 2] Getter failed. Expected 'default', got ${initial}`,
                );
            if (updated !== "vacuum_test")
                console.error(
                    `[Diag 2] Setter failed. Expected 'vacuum_test', got ${updated}`,
                );

            return initial === "default" && updated === "vacuum_test";
        },
    });

    new Test({
        name: "Diag 3: Missing Ontology Predicates",
        description:
            "Validates if the reflective predicates (isA, kindOf) were bridged to the Metaclass and instances.",
        code: () => {
            const PredicateClass = Class({ name: "PredicateClass" });
            const inst = new PredicateClass();

            const hasInstIsA = typeof inst.isA === "function";
            const hasClassKindOf =
                typeof PredicateClass.kindOf === "function" ||
                typeof PredicateClass.KINDOF === "function";

            if (!hasInstIsA)
                console.error("[Diag 3] 'isA' is missing from instances.");
            if (!hasClassKindOf)
                console.error("[Diag 3] 'kindOf' is missing from classes.");

            return hasInstIsA && hasClassKindOf;
        },
    });

    new Test({
        name: "Diag 4: Slot Metaobject Bootstrapping",
        description:
            "Validates if properties delegate directly to first-class Slot metaobjects via slot.get() and slot.set().",
        code: () => {
            const SlotClass = Class({
                name: "SlotClass",
                properties: { public: { instance: { testProp: 100 } } },
            });

            const backingDescriptor = SlotClass.__meta?.slotSymbols?.testProp;
            const isSlotMetaobject =
                backingDescriptor &&
                typeof backingDescriptor === "object" &&
                typeof backingDescriptor.get === "function";

            if (!isSlotMetaobject)
                console.error(
                    "[Diag 4] Property is backed by a primitive Symbol, not a Slot Metaobject.",
                );

            return isSlotMetaobject;
        },
    });

    new Test({
        name: "Diag 5: Dynamic MOP onChange Hooks",
        description:
            "Validates if dynamic mutation of a property triggers an associated MOP symbolic string reference (e.g., after: 'buildUrl').",
        code: () => {
            let triggered = false;
            const HookClass = Class({
                name: "HookClass",
                properties: { public: { instance: { urlBuilder: "" } } },
                methods: {
                    public: {
                        instance: {
                            compileUrlPattern: function () {
                                triggered = true;
                            },
                        },
                    },
                    after: { instance: { urlBuilder: "compileUrlPattern" } },
                },
            });

            const inst = new HookClass();
            inst.urlBuilder = "http://test";

            if (!triggered)
                console.error(
                    "[Diag 5] String-referenced onChange hook failed to execute.",
                );

            return triggered;
        },
    });

    new Test({
        name: "Diag 6: Normalizer String Method Erasure",
        description:
            "Proves that the Normalizer incorrectly moves string-based method aliases (like onChange hooks) out of the methods matrix and into properties.",
        code: () => {
            const def = {
                name: "TestNormalizer",
                methods: {
                    after: {
                        instance: {
                            urlBuilder: "compileUrlPattern",
                        },
                    },
                },
            };

            Ouro.normalizeMatrix(def);

            const survivedInMethods =
                def.methods?.after?.instance?.urlBuilder ===
                "compileUrlPattern";
            const erroneouslyMovedToProps =
                def.properties?.public?.instance?.urlBuilder ===
                "compileUrlPattern";

            if (erroneouslyMovedToProps && !survivedInMethods) {
                console.error(
                    "[Diag 6] Bug Confirmed: The normalizer hijacked the string alias and moved it to properties.",
                );
                return false;
            }

            return survivedInMethods;
        },
    });

    new Test({
        name: "TODO #2: Class.fromSample",
        description:
            "Generates a minimal Ouro class from a sample object with inferred defaults and preserveValues option.",
        code: () => {
            const sample = {
                title: "Inception",
                year: 2010,
                tags: ["sci-fi"],
                active: true,
                label() {
                    return `${this.title} (${this.year})`;
                },
            };
            const Inferred = Class.fromSample(sample, "InferredMovie");
            const m1 = new Inferred();
            const m2 = new Inferred({ title: "Matrix", year: 1999 });
            m1.tags.push("thriller");

            const Preserved = Class.fromSample(sample, {
                name: "PreservedMovie",
                preserveValues: true,
            });
            const p1 = new Preserved();

            return (
                m1.title === "" &&
                m1.year === 0 &&
                m1.active === false &&
                m2.tags.length === 0 &&
                m2.label() === "Matrix (1999)" &&
                p1.title === "Inception" &&
                p1.year === 2010 &&
                p1.tags[0] === "sci-fi"
            );
        },
    });

    new Test({
        name: "TODO #3: Class.fromClass and Native ES6 Class kindOf Bridging",
        description:
            "Converts native ES6 classes via Class.fromClass and allows direct kindOf: NativeES6Class inheritance with inner() and instanceof.",
        code: () => {
            class ES6Vehicle {
                static category = "transport";
                static identify() {
                    return "ES6Vehicle";
                }
                constructor(speed = 50) {
                    this.speed = speed;
                }
                describe() {
                    return `Speed: ${this.speed}`;
                }
            }

            const ConvertedVehicle = Class.fromClass(ES6Vehicle, {
                name: "ConvertedVehicle",
                boost() {
                    this.speed += 25;
                    return this.speed;
                },
            });
            const cv = new ConvertedVehicle(80);

            const SportsCar = Class({
                name: "SportsCar",
                kindOf: ES6Vehicle,
                describe() {
                    return `${this.inner()} km/h`;
                },
            });
            const sc = new SportsCar(120);

            return (
                Test.__meta?.name === "Test" &&
                ConvertedVehicle.category === "transport" &&
                ConvertedVehicle.identify() === "ES6Vehicle" &&
                cv.boost() === 105 &&
                cv instanceof ES6Vehicle &&
                sc.describe() === "Speed: 120 km/h" &&
                sc instanceof ES6Vehicle &&
                SportsCar.kindOf(ES6Vehicle) &&
                sc.isA(ES6Vehicle)
            );
        },
    });

    new Test({
        name: "TODO #4 & #6: Dynamic addProperty, addMethod, and Lifecycle Advice",
        description:
            "Dynamically attaches singular/plural properties and methods and triggers GenericFunction lifecycle hooks.",
        code: () => {
            let propHookTriggered = false;
            let methodHookTriggered = false;

            const DynTarget = Class({ name: "DynTarget" });

            GenericFunction.defmethod(
                "addProperties",
                [DynTarget],
                function () {
                    propHookTriggered = true;
                },
                "after",
            );
            GenericFunction.defmethod(
                "addMethods",
                [DynTarget],
                function () {
                    methodHookTriggered = true;
                },
                "after",
            );

            DynTarget.addProperty("score", 42);
            DynTarget.addProperty("secretTag", "classified", {
                private: true,
            });
            DynTarget.addMethod("reveal", function () {
                return `${this.secretTag}:${this.score}`;
            });

            const inst = new DynTarget();
            return (
                propHookTriggered &&
                methodHookTriggered &&
                inst.score === 42 &&
                inst.secretTag === undefined &&
                inst.reveal() === "classified:42"
            );
        },
    });

    new Test({
        name: "TODO #5: Raw Class Definition Preservation",
        description:
            "Preserves the un-normalized raw definition object in __private.class.definition and getDefinition().",
        code: () => {
            const RawBlueprintTest = Class({
                name: "RawBlueprintTest",
                flatProp: "hello",
                flatMethod() {
                    return this.flatProp;
                },
            });
            const rawDef = RawBlueprintTest.getDefinition();
            return (
                rawDef &&
                rawDef.flatProp === "hello" &&
                typeof rawDef.flatMethod === "function" &&
                rawDef.properties === undefined
            );
        },
    });

    new Test({
        name: "TODO #7, #8, #9, #13, #17: Introspection, stringify, inspect, and audit",
        description:
            "Filters native noise in getProperties/getMethods, serializes blueprints/instances via stringify(), and inspects classes/instances.",
        code: () => {
            const ReflClass = Class({
                name: "ReflClass",
                description: "Reflective test class",
                count: 5,
                class: {
                    versionTag: "1.0",
                },
                private: {
                    token: "xyz",
                },
                increment() {
                    this.count++;
                    return this.count;
                },
            });

            const pubProps = ReflClass.getProperties("public", "instance");
            const classProps = ReflClass.getProperties("public", "class");
            const privProps = ReflClass.getProperties("private", "instance");
            const pubMethods = ReflClass.getMethods("public", "instance");

            const inst = new ReflClass();
            inst.increment();

            const classCode = stringify(ReflClass);
            const instJson = JSON.parse(stringify(inst));
            const classInspect = inspect(ReflClass);
            const instInspect = inst.inspect();
            const auditReport = Ouro.audit();

            return (
                pubProps.count === 5 &&
                !Object.prototype.hasOwnProperty.call(
                    pubProps,
                    "constructor",
                ) &&
                classProps.versionTag === "1.0" &&
                !Object.prototype.hasOwnProperty.call(classProps, "length") &&
                privProps.token === "xyz" &&
                typeof pubMethods.increment === "function" &&
                classCode.includes('name: "ReflClass"') &&
                classCode.includes("increment:") &&
                instJson.count === 6 &&
                classInspect.class === "ReflClass" &&
                instInspect.className === "ReflClass" &&
                instInspect.publicProperties.count === 6 &&
                !("versionTag" in instInspect.publicProperties) &&
                instInspect.privateVault.token === "xyz" &&
                Boolean(auditReport.classes.ReflClass)
            );
        },
    });

    new Test({
        name: "TODO #10: Forward Declarations & Abstract Requirements (requires / Forward)",
        description:
            "Tracks forward-declared properties/methods via requires and Forward symbol until resolved by subclasses or dynamic addition.",
        code: () => {
            const AbstractStore = Class({
                name: "AbstractStore",
                requires: ["connect", "disconnect"],
                endpoint: Forward,
            });

            const initiallyIncomplete =
                !AbstractStore.isComplete() &&
                AbstractStore.getForwardDeclarations().length === 3;

            const ConcreteStore = Class({
                name: "ConcreteStore",
                kindOf: AbstractStore,
                endpoint: "https://api.example.com",
                connect() {
                    return true;
                },
            });

            const partiallyComplete =
                !ConcreteStore.isComplete() &&
                ConcreteStore.getForwardDeclarations().length === 1 &&
                ConcreteStore.getForwardDeclarations()[0] === "disconnect";

            ConcreteStore.addMethod("disconnect", () => true);
            const finallyComplete = ConcreteStore.isComplete();

            return initiallyIncomplete && partiallyComplete && finallyComplete;
        },
    });

    new Test({
        name: "TODO #14: Vocabulary Aliasing via Ouro.extendVocabulary",
        description:
            "Supports custom vocabulary aliases (e.g. inheritsFrom, slots) while preserving default canonical keywords.",
        code: () => {
            Ouro.extendVocabulary("kindOf", "inheritsFrom");
            Ouro.extendVocabulary("properties", "slots");

            const BaseVocab = Class({
                name: "BaseVocab",
                slots: {
                    baseVal: 10,
                },
            });

            const SubVocab = Class({
                name: "SubVocab",
                inheritsFrom: BaseVocab,
                slots: {
                    subVal: 20,
                },
            });

            const inst = new SubVocab();
            return (
                inst.baseVal === 10 &&
                inst.subVal === 20 &&
                SubVocab.kindOf(BaseVocab)
            );
        },
    });

    new Test({
        name: "TODO #18: Classes Stored as Property Values",
        description:
            "Preserves Ouro and ES6 classes assigned to properties as property values rather than misclassifying them as methods.",
        code: () => {
            const HelperModel = Class({ name: "HelperModel" });
            class NativeHelper {}

            const ContainerModel = Class({
                name: "ContainerModel",
                modelClass: HelperModel,
                nativeClass: NativeHelper,
            });

            const inst = new ContainerModel();
            return (
                inst.modelClass === HelperModel &&
                inst.nativeClass === NativeHelper &&
                ContainerModel.getMethods("public", "instance").modelClass ===
                    undefined
            );
        },
    });

    new Test({
        name: "Advanced Expansion: Faceted Slots & Multi-Dispatch Specificity",
        description:
            "Executes slot facets (transform, validate, onChange) and dispatches multi-argument GenericFunctions by specificity.",
        code: () => {
            let changeLog = null;
            const FacetedUser = Class({
                name: "FacetedUser",
                age: 0,
            });
            FacetedUser.setSlotFacet("age", "transform", (v) => Math.round(v));
            FacetedUser.setSlotFacet("age", "validate", (v) => v >= 0);
            FacetedUser.setSlotFacet("age", "onChange", (next, prev) => {
                changeLog = `${prev}->${next}`;
            });

            const u = new FacetedUser();
            u.age = 25.6;
            let rejectedNegative = false;
            try {
                u.age = -5;
            } catch (_) {
                rejectedNegative = true;
            }

            const Shape = Class({ name: "Shape" });
            const Circle = Class({ name: "Circle", kindOf: Shape });
            GenericFunction.defgeneric("intersect");
            GenericFunction.defmethod(
                "intersect",
                [Circle, Circle],
                () => "circle-circle",
            );
            // Registered AFTER [Circle, Circle] — less specific on 2nd arg!
            GenericFunction.defmethod(
                "intersect",
                [Circle, Shape],
                () => "circle-shape",
            );

            const c = new Circle();
            const s = new Shape();
            const r1 = GenericFunction.defgeneric("intersect").dispatch(c, c);
            const r2 = GenericFunction.defgeneric("intersect").dispatch(c, s);

            let computeCount = 0;
            const InlineFacetClass = Class({
                name: "InlineFacetClass",
                publish: false,
                class: {
                    secretUrl: {
                        init: undefined,
                        ifNeeded: () => {
                            computeCount++;
                            return "https://plex.local/?X-Plex-Token=xyz789";
                        },
                    },
                    token: facetted({
                        init: undefined,
                        ifNeeded() {
                            return new URL(this.secretUrl).searchParams.get(
                                "X-Plex-Token",
                            );
                        },
                    }),
                },
                count: { init: 0, type: Number },
            });
            const fInst = new InlineFacetClass();
            fInst.count = "42";

            return (
                u.age === 26 &&
                changeLog === "0->26" &&
                rejectedNegative &&
                r1 === "circle-circle" &&
                r2 === "circle-shape" &&
                computeCount === 0 &&
                InlineFacetClass.token === "xyz789" &&
                InlineFacetClass.token === "xyz789" &&
                computeCount === 1 &&
                fInst.count === 42
            );
        },
    });

    new Test({
        name: "Graph & Scraper Enhancements: Multi-key get, prune, relations, and schemaless JSONPage",
        description:
            "Verifies multi-key Graph.get(), secondaryKeys, prune(), cross-graph resolve(), and schemaless JSONPage.scrape().",
        code: () => {
            if (typeof Graph === "undefined") return true;

            const ServerTestGraph = Class({
                name: "ServerTestGraph",
                kindOf: Graph,
                class: {
                    primaryKeys: ["server_id"],
                },
            });

            const MovieTestGraph = Class({
                name: "MovieTestGraph",
                kindOf: Graph,
                class: {
                    primaryKeys: ["imdb_id", "tmdb_id"],
                    secondaryKeys: ["plex_id"],
                    relations: {
                        server: {
                            target: ServerTestGraph,
                            foreignKey: "server_id",
                            targetKey: "server_id",
                        },
                    },
                },
            });

            ServerTestGraph.deleteAll();
            MovieTestGraph.deleteAll();

            ServerTestGraph.put({
                server_id: "srv1",
                name: "HomePlex",
            });

            MovieTestGraph.put({
                imdb_id: "tt1375666",
                tmdb_id: 27205,
                plex_id: "px99",
                server_id: "srv1",
                res: "1080p",
            });
            MovieTestGraph.put({
                imdb_id: "tt1375666",
                plex_id: "px100",
                server_id: "srv1",
                res: "4K",
            });

            // Multi-key get where first key misses and second key hits
            const found = MovieTestGraph.get({
                imdb_id: "tt_missing",
                plex_id: "px99",
            });
            const resolved = MovieTestGraph.resolve(
                { imdb_id: "tt1375666" },
                "server",
            );

            // Prune 1080p variant and verify secondary index px99 is cleaned up
            MovieTestGraph.prune({ imdb_id: "tt1375666" }, { res: "1080p" });
            const prunedLookup = MovieTestGraph.get({ plex_id: "px99" });
            const remaining = MovieTestGraph.records({ imdb_id: "tt1375666" });

            // Schemaless JSONPage scrape
            const RawApiPage = JSONPage.register({
                name: "rawApiTestPage",
                class: { routeTemplate: "https://api.test.local/item/${id}" },
            });
            const apiInst = new RawApiPage({ id: 1 });
            apiInst.content = { ok: true, id: 1 };
            const primaryScrape = Page.getMethods("public", "instance").scrape;
            const scraped = primaryScrape.call(apiInst);

            // Reactive route.args auto-rebuilds route.href without manual route.build()
            apiInst.route.args.id = 99;
            const rebuiltHref = apiInst.route.href;

            return (
                found !== null &&
                resolved.length === 2 &&
                resolved[0].server?.variants?.[0]?.name === "HomePlex" &&
                prunedLookup === null &&
                remaining.length === 1 &&
                remaining[0].res === "4K" &&
                scraped.ok === true &&
                scraped.id === 1 &&
                rebuiltHref === "https://api.test.local/item/99"
            );
        },
    });

    new Test({
        name: "TODO #19, #20, #21, #22, #23: Core Kernel Slimming & Extension Isolation",
        description:
            "Verifies that Method/GenericFunction/Metaclass reflection, instance/subclass tracking, and DevTools toString/inspect sugar live in extensions and Core operates cleanly when unloaded.",
        code: () => {
            const gf = GenericFunction.defgeneric("kernelSlimCheck");
            GenericFunction.defmethod(
                "kernelSlimCheck",
                [Number],
                (x) => x * 2,
            );
            const methodObj = gf.methods[0];

            // 1. Verify extensions provide reflection and DevTools toString when loaded
            const loadedChecks =
                gf.getName() === "kernelSlimCheck" &&
                Array.isArray(gf.getMethods()) &&
                methodObj.getQualifier() === "primary" &&
                methodObj.getSpecializers()[0] === Number &&
                typeof methodObj.getBody() === "function" &&
                gf.toString().includes("[GenericFunction: kernelSlimCheck()") &&
                methodObj.toString().includes("[Method: :primary (Number)]") &&
                Metaclass.toString().includes("ƒ <Metaclass> Class()");

            // 2. Unload Introspection and DevTools extensions
            Ouro.introspectionExtension.unload();
            Ouro.devtoolsExtension.unload();

            let unloadedChecks = false;
            try {
                const BareParent = Class({
                    name: "BareParent",
                    publish: false,
                    val: { init: 10, type: Number },
                    compute(n) {
                        return this.val + n;
                    },
                });
                const BareChild = Class({
                    name: "BareChild",
                    publish: false,
                    kindOf: BareParent,
                });
                const bareInst = new BareChild();
                bareInst.val = "15";

                unloadedChecks =
                    gf.getName === undefined &&
                    gf.getMethods === undefined &&
                    methodObj.getSpecializers === undefined &&
                    methodObj.getQualifier === undefined &&
                    methodObj.getBody === undefined &&
                    !Object.prototype.hasOwnProperty.call(
                        Metaclass.prototype,
                        "toString",
                    ) &&
                    !Object.prototype.hasOwnProperty.call(
                        GenericFunction.prototype,
                        "toString",
                    ) &&
                    !Object.prototype.hasOwnProperty.call(
                        Method.prototype,
                        "toString",
                    ) &&
                    BareParent.__meta.subclasses === undefined &&
                    BareChild.__meta.instances === undefined &&
                    bareInst.toSnapshot === undefined &&
                    bareInst.inspect === undefined &&
                    bareInst.val === 15 &&
                    bareInst.compute(5) === 20 &&
                    gf.dispatch(21) === 42;
            } finally {
                // 3. Reload extensions and verify full restoration
                Ouro.introspectionExtension.load();
                Ouro.devtoolsExtension.load();
            }

            const RestoredClass = Class({
                name: "RestoredClass",
                publish: false,
                tag: "restored",
            });
            const restoredInst = new RestoredClass();

            const restoredChecks =
                gf.getName() === "kernelSlimCheck" &&
                methodObj.getQualifier() === "primary" &&
                RestoredClass.getInstances().has(restoredInst) &&
                restoredInst.toSnapshot().tag === "restored" &&
                restoredInst.inspect().className === "RestoredClass" &&
                RestoredClass.toString().includes("ƒ <RestoredClass> Class()");

            return loadedChecks && unloadedChecks && restoredChecks;
        },
    });

    new Test({
        name: "TODO #24, #25, #27, #28: Flat routeTemplate Match Logging, KEE Inspector, Graph.record & StorageDB",
        description:
            "Verifies flat routeTemplate @match logging in Page.register, KEE-style inspect/audit coreFootprint, Graph.record(query), and StorageTable/StorageDB/BTKStorage operations.",
        code: () => {
            // 1. #27: Flat routeTemplate @match pattern logging in Page.register
            const loggedInfos = [];
            const origInfo = console.info;
            console.info = (...args) => {
                loggedInfos.push(args.join(" "));
                origInfo.apply(console, args);
            };
            let MultiPatternPage;
            try {
                MultiPatternPage = Page.register({
                    name: "multiPatternTestPage",
                    publish: false,
                    class: {
                        routeTemplate: [
                            "https://cinema.local/movies/${slug}",
                            "cinema.local/films/*",
                            "cinema.local/trending",
                        ],
                    },
                });
            } finally {
                console.info = origInfo;
            }
            const flatPatternsLogged =
                loggedInfos.some((l) =>
                    l.includes("*://cinema.local/films/*"),
                ) &&
                loggedInfos.some((l) =>
                    l.includes("*://cinema.local/trending"),
                );

            const matcher = new globalThis.RouteURL(
                MultiPatternPage.routeTemplate,
            );
            const flatPatternsMatched =
                matcher.match("cinema.local/films/arrival") !== null &&
                matcher.match("https://cinema.local/trending") !== null;

            // 2. #25: KEE Inspector & coreFootprint in Ouro.audit()
            const audit = Ouro.audit();
            const hasCoreFootprint =
                Array.isArray(audit.coreFootprint?.Metaclass?.prototypeKeys) &&
                Array.isArray(audit.coreFootprint?.Slot?.prototypeKeys);
            const pageInspect = inspect(MultiPatternPage);
            const hasKEERefs =
                pageInspect.superclass === Page &&
                typeof pageInspect.methodsDictionary === "object" &&
                typeof pageInspect.slots === "object";

            // 3. #24: Graph.record(query) single-entity hierarchical lookup
            const RecTestGraph = Class({
                name: "RecTestGraph",
                publish: false,
                kindOf: Graph,
                class: {
                    primaryKeys: ["item_id"],
                },
            });
            RecTestGraph.deleteAll();
            RecTestGraph.put({ item_id: "it-1", tag: "alpha" });
            const singleRec = RecTestGraph.record({ item_id: "it-1" });
            const graphRecordWorks =
                singleRec?.item_id === "it-1" &&
                singleRec?.variants?.[0]?.tag === "alpha";
            RecTestGraph.deleteAll();

            // 4. #28: StorageTable, StorageDB & BTKStorage facade
            let storageWorks = true;
            if (typeof BTKStorage !== "undefined") {
                const db = BTKStorage.createDB(
                    "OuroTestDB",
                    { autocommit: true },
                    "script",
                );
                if (!db.tables.movies) {
                    BTKStorage.createTable("movies", "imdb|res", db);
                } else {
                    db.tables.movies.rows = {};
                }
                BTKStorage.insert(
                    { imdb: "tt0133093", res: "1080p", title: "The Matrix" },
                    "movies",
                    db,
                );
                BTKStorage.update(
                    {
                        imdb: "tt0133093",
                        res: "1080p",
                        title: "The Matrix (Remastered)",
                    },
                    "movies",
                    db,
                );
                BTKStorage.upsert(
                    { imdb: "tt0133093", res: "4K", title: "The Matrix 4K" },
                    "movies",
                    db,
                );
                const selected = BTKStorage.select(
                    { imdb: "tt0133093" },
                    "movies",
                    db,
                );
                const rowKeys = Object.keys(selected.rows);

                // Reload from persistent GM storage driver to verify commit/load cycle
                const reloadedDb = BTKStorage.createDB(
                    "OuroTestDB",
                    { autocommit: true },
                    "script",
                );
                const reloadedRow =
                    reloadedDb.getTable("movies").rows["tt0133093|1080p"];

                BTKStorage.destroy(
                    { imdb: "tt0133093", res: "1080p" },
                    "movies",
                    reloadedDb,
                );
                const afterDestroy =
                    reloadedDb.getTable("movies").rows["tt0133093|1080p"];

                storageWorks =
                    rowKeys.length === 2 &&
                    reloadedRow?.title === "The Matrix (Remastered)" &&
                    afterDestroy === undefined;
            }

            return (
                flatPatternsLogged &&
                flatPatternsMatched &&
                hasCoreFootprint &&
                hasKEERefs &&
                graphRecordWorks &&
                storageWorks
            );
        },
    });

    // NEW TESTS ABOVE
};
