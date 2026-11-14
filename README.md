# 🐍 The Ouro Cookbook (v2.1.0)

```text
                                   .:-----.
                            :#@@@@%###++++*##%@@@@@*:.
                        .@@@%:                     +%@@.
                     .@@@:.        :*##:     =         .@%
                   =@@:        .-###%@@@@@@@@=      .@@. .%%.
                 -@#* *%@@@@@@%-.        -@%              .#@.
                %@: +@@@+--%@=              .%@-  #@@@@%++ =%+
              :@#:@@%-  =@* *.                  .#@= -@%    %*
             :@@@@=   .@%.                        =@# #%   -
             @@@=   .@@#                             .%%:%@. :%@=
            #@%    %@@#                OURO                  *@@+
           -@*    -@@@%                                      +@+@:
           #@   +@#-@.    Object Unified Reflective Ontology   ##-@=
           %+  +@*  *%    a JavaScript AOP Metaobject Protocol  =@.=@
           %- =@*   @%                                          :@: @#
           %- @@.  #%        The Forging of the Ouroboros        +@  @%
           ##=@+   -@.    Out of the void, the forge is lit.   @+ -@%
           #@ *@=   -@%      The serpent bites its own tail,    #% .@@#
            @@@=   =@@-         and from the circle,          %% .@@@+
            *@@=   -@@@.        true creation begins.      =@= +@%%%
             %@%   :@%-@* *@@.=@@-=@:
              %@=   @@..@@.            v2.1.0             %@:+@@= -@=
               #@.  :@%  -%@:                         =@@* @@#.  +@-
                =@-   *@+   .%@@=                 =@@@@@+.    %%.
                  #@: %@=* *@@@@@%--------=@@@@%* *-       .#@=
                    %@-#@%       #@@@*:.....             :@@@=
                      =@@@@-         #@@@@@@@#=-=#@@@@@@@@:
                         -@@@%             ...--:.. *@@@.
                             :#@@@%#*-    :+##%@@@=:
                                    .::---:.
```

> _"La clarté est le contrepoids des pensées profondes."_  
> — Luc de Clapiers, marquis de Vauvenargues

---

## Why Ouro? (The Forging of the Ouroboros)

JavaScript's `class` keyword is an illusion. Introduced in ES6 to appease developers coming from rigid, statically compiled languages like C++ and Java, it is merely syntactic sugar over raw constructor functions and prototype chains. Underneath that veneer, JavaScript's object model suffers from fundamental shortcomings whenever you try to build expressive, self-aware architectures:

- **Classes Are Not True Metaobjects:** In vanilla JavaScript, a class is just a function. It has no built-in knowledge of its own subclasses, its live instances, its structural blueprint, or its abstract requirements (`requires`). Once evaluated, its definition is lost to the void.
- **Dumb Properties Instead of Active Slots:** Standard JavaScript properties are passive memory locations. Enforcing type coercion, validation, lazy computation (`ifNeeded`), or change notifications (`onChange`) requires littering classes with manual getter/setter boilerplate or wrestling with fragile `Proxy` traps. Worse, mutable prototype defaults (like arrays or objects) are accidentally shared across instances unless manually initialized inside a constructor.
- **The `super` Trap & Cross-Cutting Boilerplate:** Standard OOP forces subclasses to manually orchestrate parent lifecycle execution via `super.method()`. If a subclass author forgets a single `super` call, the parent's caching, telemetry, or state-hydration pipeline silently breaks.
- **Single-Receiver, Single-Inheritance Rigidity:** JavaScript binds methods directly to prototypes rather than routing them through polymorphic **Generic Functions**. It offers no native multi-argument dispatch, no first-class **Traits** for horizontal composition, and hostile C++ internal slot restrictions (`Illegal Invocation`) whenever you try to extend native browser objects like `URL` or `HTMLElement`.

**Ouro** was born out of a desire to bring the live, malleable, reflective power of **Smalltalk** and the **Common Lisp Object System (CLOS)** into JavaScript—without polluting built-in prototypes.

### The Architecture of the Four Books

Out of the void, the forge is lit. The serpent bites its own tail, and from the circle, true creation begins. Both the source code of `src/ouro.js` and this Cookbook unfold in the exact sequence of the **Four Books**:

1. **Book I — The Primordial Shadows (Pure Allocation):** _"Before the world had shape, there were shadows of what was to come."_ Establishes Phase 1 (The Anvil of Creation), the "Shazam!" Auto-Hydrator, deep per-instance cloning, cryptographic private vaults (`WeakMap` / `Symbol`), and Declarative Faceted Slots.
2. **Book II — The Great Forging (Initialization Engine):** _"The fires are stoked; the raw shapes of reality are hammered into being."_ Unfolds across Phase 2 (The First Breath), Phase 3 (The Weaving of Spells), Phase 4 (The Awakening), and Phase 5 (The Transmutation), where `Metaclass` weaves its own methods and `Method` and `GenericFunction` awaken the symmetric AOP Onion pipeline.
3. **Book III — The Gateway (The Loader API):** _"The portal through which mortals command the engine."_ Exposes `Ouro.load()`, the `.boros` ignition trigger, `Ouro.publish()`, context bridging (`Ouro.exportTo`), and the `Ouro.Lexicon` registry.
4. **Book IV — The Realm of Men (Domain Logic & Extensions):** _"Where the gods rest and mortals build their kingdoms."_ Keeps the core kernel razor-thin while layering Syntax DX, Schema Normalization, Introspection, DevTools Formatters, Traits, Caching, Web Scraping (`src/scraper.js`), and Graph Document Storage (`src/graph.js`) as loadable extensions.

---

## 📖 Table of Contents

- **[Book I: The Primordial Shadows (State, Slots & Lineage)](#book-i-the-primordial-shadows-state-slots--lineage)**
    - [Recipe 1.1: Forging a Class & The "Shazam!" Auto-Hydrator](#recipe-11-forging-a-class--the-shazam-auto-hydrator)
    - [Recipe 1.2: Single Inheritance (`kindOf`), Lineage Queries & `this.inner()`](#recipe-12-single-inheritance-kindof-lineage-queries--thisinner)
    - [Recipe 1.3: Storing Classes Directly as Slot Values](#recipe-13-storing-classes-directly-as-slot-values)
    - [Recipe 1.4: Declarative Faceted Slots (`type`, `transform`, `validate`, `onChange`)](#recipe-14-declarative-faceted-slots-type-transform-validate-onchange)
    - [Recipe 1.5: Lazy Computation & Memoization (`ifNeeded` Daemon)](#recipe-15-lazy-computation--memoization-ifneeded-daemon)
    - [Recipe 1.6: Runtime Facet Mutation (`setSlotFacet` & `getSlotFacet`)](#recipe-16-runtime-facet-mutation-setslotfacet--getslotfacet)
- **[Book II: The Great Forging (AOP & Generic Dispatch)](#book-ii-the-great-forging-aop--generic-dispatch)**
    - [Recipe 2.1: The Symmetric AOP Onion (`:around`, `:before`, `primary`, `:after`)](#recipe-21-the-symmetric-aop-onion-around-before-primary-after)
    - [Recipe 2.2: Advising Properties & Preserving Facets](#recipe-22-advising-properties--preserving-facets)
    - [Recipe 2.3: Polymorphic Multi-Dispatch (`GenericFunction` & `Method`)](#recipe-23-polymorphic-multi-dispatch-genericfunction--method)
    - [Recipe 2.4: Dynamic Schema Evolution & Lifecycle Hooks (`addProperty` & `addMethod`)](#recipe-24-dynamic-schema-evolution--lifecycle-hooks-addproperty--addmethod)
- **[Book III: The Gateway (Commanding & Reflecting the Engine)](#book-iii-the-gateway-commanding--reflecting-the-engine)**
    - [Recipe 3.1: Igniting the Ouroboros (`Ouro.boros`, `Ouro.load`, `Ouro.exportTo`)](#recipe-31-igniting-the-ouroboros-ouroboros-ouroload-ouroexportto)
    - [Recipe 3.2: Transmuting Sample Objects (`Class.fromSample`)](#recipe-32-transmuting-sample-objects-classfromsample)
    - [Recipe 3.3: Bridging Native ES6 Classes (`Class.fromClass` & Direct `kindOf`)](#recipe-33-bridging-native-es6-classes-classfromclass--direct-kindof)
    - [Recipe 3.4: Enforcing Abstract Contracts (`requires` & `Forward`)](#recipe-34-enforcing-abstract-contracts-requires--forward)
    - [Recipe 3.5: Extending the DSL Vocabulary (`Ouro.extendVocabulary`)](#recipe-35-extending-the-dsl-vocabulary-ouroextendvocabulary)
    - [Recipe 3.6: The Mirror of Reflection (`inspect`, `stringify`, `toSnapshot`, `audit`)](#recipe-36-the-mirror-of-reflection-inspect-stringify-tosnapshot-audit)
- **[Book IV: The Realm of Men (Traits, Caching, Scrapers & Graphs)](#book-iv-the-realm-of-men-traits-caching-scrapers--graphs)**
    - [Recipe 4.1: Horizontal Composition & Recursive Trait Cascades (`Trait`)](#recipe-41-horizontal-composition--recursive-trait-cascades-trait)
    - [Recipe 4.2: Taming Native C++ Host Objects (`Trait.native`)](#recipe-42-taming-native-c-host-objects-traitnative)
    - [Recipe 4.3: Vaults of Memory (`localCache`, `sessionCache`, `globalCache` & `Cacheable`)](#recipe-43-vaults-of-memory-localcache-sessioncache-globalcache--cacheable)
    - [Recipe 4.4: Reactive URL Templates (`RouteURL`)](#recipe-44-reactive-url-templates-routeurl)
    - [Recipe 4.5: The WebWeaver's Loom (`HTMLPage`, `JSONPage`, `XMLPage`)](#recipe-45-the-webweavers-loom-htmlpage-jsonpage-xmlpage)
    - [Recipe 4.6: The Constellation Vault (`Graph` Document Store)](#recipe-46-the-constellation-vault-graph-document-store)
- **[CLI Commands & Repository Layout](#-cli-commands--repository-layout)**

---

# Book I: The Primordial Shadows (State, Slots & Lineage)

> _"Before the world had shape, there were shadows of what was to come."_  
> _— Phase 1: The Anvil of Creation (Bootstrap & State Isolation)_

Before a single method is dispatched, an object requires identity, isolated state, and lineage. Book I governs how Ouro allocates instances, deep-clones reference defaults so instances never bleed state into one another, seals private properties inside a cryptographic vault (`WeakMap` / `Symbol`), and promotes properties into active **Faceted Slots**.

### Recipe 1.1: Forging a Class & The "Shazam!" Auto-Hydrator

Thanks to `Ouro.schemaNormalizerExtension`, you never need to write deeply nested `properties.public.instance` matrices by hand. Top-level values become public instance slots, and top-level functions become public instance methods. Named classes automatically publish themselves to `globalThis` via `Ouro.publish` (pass `publish: false` to keep a class local).

If your class omits an explicit `initialize` method, Ouro's **"Shazam!" Auto-Hydrator** automatically populates public instance slots from a plain configuration object passed to `new MyClass({ ... })`:

```javascript
// Awaken the engine and its standard extensions first
Ouro.boros;

Class({
    name: "Spaceship",
    description: "A standard orbital vessel",

    // Public instance slots (arrays & objects are deep-cloned per instance!)
    vesselName: "Unnamed",
    hull: 100,
    cargo: [],

    // Public static (class-level) slots & methods
    class: {
        fleetCount: 0,
        commission(spec) {
            this.fleetCount++;
            return new this(spec);
        },
    },

    // Cryptographically isolated private slots & methods (WeakMap/Symbol vault)
    private: {
        reactorCode: "OMEGA-9",
        verifyClearance() {
            return this.reactorCode === "OMEGA-9";
        },
    },

    launch() {
        if (!this.verifyClearance()) throw new Error("Clearance denied");
        return `${this.vesselName} launched with hull at ${this.hull}%`;
    },
});

// Shazam! Auto-hydrated directly from a plain object without writing initialize()
const ship1 = Spaceship.commission({ vesselName: "Bebop", cargo: ["fuel"] });
const ship2 = Spaceship.commission({ vesselName: "Swordfish" });

ship1.cargo.push("bounty");
ship2.cargo.length; // 0 (deep-cloned per instance, never shared on the prototype!)
ship1.launch(); // "Bebop launched with hull at 100%"
ship1.reactorCode; // undefined (strictly sealed inside the Private Vault)
```

### Recipe 1.2: Single Inheritance (`kindOf`), Lineage Queries & `this.inner()`

Use `kindOf` to inherit from a parent Ouro class. Inside overridden methods, call `this.inner(...args)` (Ouro's equivalent of CLOS `call-next-method`) to invoke the superclass implementation. Use `instance.isA(Target)` or `Subclass.kindOf(Target)` to query lineage by class reference or string name:

```javascript
Class({
    name: "Frigate",
    kindOf: Spaceship,
    shields: 250,

    launch() {
        const baseStatus = this.inner();
        return `${baseStatus} [Shields: ${this.shields}]`;
    },
});

const defender = new Frigate({ vesselName: "Rocinante" });
defender.isA(Spaceship); // true
defender.isA("Spaceship"); // true
Frigate.kindOf(Spaceship); // true
defender.launch(); // "Rocinante launched with hull at 100% [Shields: 250]"
```

### Recipe 1.3: Storing Classes Directly as Slot Values

Ouro's schema normalizer distinguishes between standard methods and class constructors (`Ouro.isClassValue`). You can assign Ouro or native ES6 classes directly to properties without wrapping them in getters:

```javascript
Class({
    name: "FleetCarrier",
    kindOf: Spaceship,
    escortClass: Frigate, // Stored directly as a slot value, NOT misclassified as a method
});

const carrier = new FleetCarrier();
carrier.escortClass === Frigate; // true
```

### Recipe 1.4: Declarative Faceted Slots (`type`, `transform`, `validate`, `onChange`)

Properties in Ouro are backed by active slot metaobjects supporting declarative facets: `init` (or `value` / `default`), `type`, `ifNeeded`, `transform`, `validate`, and `onChange`. Subclasses automatically inherit parent slot facets:

```javascript
Class({
    name: "ReactorCore",

    temperature: {
        init: 300,
        type: Number, // Coerces "450" -> 450; throws on NaN
        transform(val) {
            return Math.round(val);
        }, // Runs before validation
        validate(val) {
            return val >= 0 && val <= 5000;
        }, // Throws Error if false
        onChange(nextVal, prevVal, slotName) {
            if (nextVal > 4000)
                console.warn(`[Alert] ${slotName} critical: ${nextVal}K`);
        },
    },

    tags: {
        init: [],
        type: Array, // Validates Array.isArray(val)
    },
});

const core = new ReactorCore();
core.temperature = "1250.7"; // Coerced to Number, rounded to 1251
```

### Recipe 1.5: Lazy Computation & Memoization (`ifNeeded` Daemon)

When a slot's value is `undefined`, reading it triggers its `ifNeeded` daemon, caches the computed result on the receiver, and returns it on all subsequent reads:

```javascript
Class({
    name: "PlexClient",
    class: {
        infoUrl:
            "[https://plex.local/identity?X-Plex-Token=abc123xyz](https://plex.local/identity?X-Plex-Token=abc123xyz)",

        // Lazily extracted & memoized on first read of PlexClient.token
        token: {
            init: undefined,
            ifNeeded() {
                return new URL(this.infoUrl).searchParams.get("X-Plex-Token");
            },
        },
    },
});

PlexClient.token; // Computes, caches, and returns "abc123xyz"
```

### Recipe 1.6: Runtime Facet Mutation (`setSlotFacet` & `getSlotFacet`)

You can wrap facet descriptors explicitly using `faceted({ ... })` / `facetted({ ... })`, or attach and inspect slot facets dynamically at runtime:

```javascript
ReactorCore.setSlotFacet("temperature", "onChange", function (next, prev) {
    console.log(`Temperature shifted from ${prev}K to ${next}K`);
});

const hook = ReactorCore.getSlotFacet("temperature", "onChange");
const slotMeta = ReactorCore.getSlot("temperature");
```

---

# Book II: The Great Forging (AOP & Generic Dispatch)

> _"The fires are stoked; the raw shapes of reality are hammered into being."_  
> _— Phases 2–5: The First Breath, The Weaving of Spells, The Awakening & The Transmutation_

In Book II, the Ouroboros bites its own tail: `Metaclass` weaves its own methods (`Metaclass.addMethods(metaDef.methods)`), and `Method` and `GenericFunction` awaken. Every method and advised slot in Ouro is routed through a polymorphic **Generic Function**, replacing brittle `super.method()` calls with a symmetric Aspect-Oriented "Onion" pipeline.

### Recipe 2.1: The Symmetric AOP Onion (`:around`, `:before`, `primary`, `:after`)

Ouro's dispatcher weaves method executions across class hierarchies and traits as a symmetric onion:

1. **`:around` (LIFO — Subclass $\rightarrow$ Parent):** Wraps the entire execution. Must call `this.inner()` to proceed deeper into the onion and exclusively controls the final return value.
2. **`:before` (LIFO — Subclass $\rightarrow$ Parent):** Runs before the primary method. Supports `async/await`. Return values are ignored.
3. **`primary`:** The core method body executes and its return value is captured.
4. **`:after` (FIFO — Parent $\rightarrow$ Subclass):** Runs inside-out as execution unwinds from the core, ensuring base classes finish post-processing before subclasses tear down.

```javascript
Class({
    name: "DataPipeline",
    status: "idle",

    async execute(payload) {
        return { processed: payload.toUpperCase() };
    },

    before: {
        // Async method advice: awaited before primary `execute()` runs
        async execute(payload) {
            this.status = "running";
        },
    },

    around: {
        async execute(payload) {
            const start = performance.now();
            const result = await this.inner(payload); // Yield to inner onion layers
            result.elapsedMs = Math.round(performance.now() - start);
            return result;
        },
    },

    after: {
        async execute() {
            this.status = "completed";
        },
    },
});
```

### Recipe 2.2: Advising Properties & Preserving Facets

Any public or static property can be advised with `:before`, `:after`, or `:around` simply by naming the property inside an advice block. Ouro automatically upgrades the property into a `GenericFunction`-backed slot while preserving all declarative slot facets (`type`, `ifNeeded`, `transform`, `validate`, `onChange`):

```javascript
Class({
    name: "LedgerAccount",
    balance: {
        init: 0,
        type: Number,
        validate(val) {
            return val >= 0;
        },
    },
    auditLog: [],

    after: {
        // Triggered automatically whenever `this.balance = ...` is assigned
        balance(newVal) {
            this.auditLog.push(`Balance updated to ${newVal}`);
        },
    },
});

const acc = new LedgerAccount();
acc.balance = "250"; // Coerced to 250 via `type: Number`, validated, then logged by `:after`!
```

### Recipe 2.3: Polymorphic Multi-Dispatch (`GenericFunction` & `Method`)

While methods declared inside a `Class` specialize on their first argument (`this`), you can register multi-argument specializations directly on any `GenericFunction`. When multiple primary methods are applicable, Ouro sorts them lexicographically by class lineage specificity (`Method.prototype.getSpecificity`):

```javascript
const Shape = Class({ name: "Shape" });
const Circle = Class({ name: "Circle", kindOf: Shape });
const Polygon = Class({ name: "Polygon", kindOf: Shape });

const collide = GenericFunction.defgeneric("collide");

GenericFunction.defmethod(
    "collide",
    [Shape, Shape],
    () => "generic shape collision",
);
GenericFunction.defmethod(
    "collide",
    [Circle, Shape],
    () => "circle hits shape",
);
GenericFunction.defmethod(
    "collide",
    [Circle, Circle],
    () => "circle-on-circle elastic bounce",
);

const c = new Circle();
const p = new Polygon();

collide.dispatch(c, c); // "circle-on-circle elastic bounce" (most specific)
collide.dispatch(c, p); // "circle hits shape"
```

### Recipe 2.4: Dynamic Schema Evolution & Lifecycle Hooks (`addProperty` & `addMethod`)

Because `addProperty`, `addProperties`, `addMethod`, and `addMethods` are `GenericFunction`s on `Metaclass`, you can mutate classes dynamically at runtime and attach `:after` lifecycle hooks to observe schema evolution:

```javascript
// Dynamically add a faceted property and a method to an existing class
Spaceship.addProperty("warpFactor", { init: 1, type: Number });
Spaceship.addMethod("engageWarp", function (factor) {
    this.warpFactor = factor;
});

// Observe whenever new properties are added to Spaceship
GenericFunction.defmethod(
    "addProperties",
    [Spaceship],
    function (matrix) {
        console.log(`[MOP Hook] Spaceship schema expanded:`, matrix);
    },
    "after",
);
```

---

# Book III: The Gateway (Commanding & Reflecting the Engine)

> _"The portal through which mortals command the engine."_  
> _— The Loader API, Context Bridging, Transmutation & Reflection_

Book III opens the portal between the internal MOP closure and the outside world—governing how extensions are loaded or unloaded, how symbols are bridged into userscript sandboxes, how plain JavaScript objects and ES6 classes are transmuted into Ouro classes, and how live classes and instances are reflected.

### Recipe 3.1: Igniting the Ouroboros (`Ouro.boros`, `Ouro.load`, `Ouro.exportTo`)

```javascript
// 1. Zero-argument syntactic sugar: awakens all registered extensions
Ouro.boros;

// 2. Load or force-reload a specific extension by name
Ouro.load("Introspection API", true);

// 3. Unload an extension to strip its methods and hooks cleanly from the kernel
Ouro.introspectionExtension.unload();
Ouro.introspectionExtension.load();

// 4. Bridge all published Lexicon symbols into a userscript sandbox (e.g., Tampermonkey)
if (typeof unsafeWindow !== "undefined") {
    Ouro.exportTo(unsafeWindow);
}
```

### Recipe 3.2: Transmuting Sample Objects (`Class.fromSample`)

Generate a minimal Ouro class directly from a plain JavaScript sample object. By default, `Class.fromSample` infers empty type-appropriate defaults (`""`, `0`, `false`, `[]`, `{}`); pass `{ preserveValues: true }` to retain the sample's exact values as defaults:

```javascript
const sampleMovie = {
    title: "Arrival",
    year: 2016,
    genres: ["Sci-Fi"],
    summary() {
        return `${this.title} (${this.year})`;
    },
};

// Infers empty type defaults (title: "", year: 0, genres: [])
const MovieTemplate = Class.fromSample(sampleMovie, "MovieTemplate");

// Or preserve the exact values from the sample as defaults:
const PresetMovie = Class.fromSample(sampleMovie, {
    name: "PresetMovie",
    preserveValues: true,
});
```

### Recipe 3.3: Bridging Native ES6 Classes (`Class.fromClass` & Direct `kindOf`)

Convert any native ES6 class into an Ouro class via `Class.fromClass`, or pass a native ES6 class directly to `kindOf:` with full `this.inner()` and `instanceof` compatibility:

```javascript
class NativeWidget {
    static category = "UI";
    constructor(id) {
        this.id = id;
    }
    render() {
        return `<div id="${this.id}"></div>`;
    }
}

// Direct inheritance from a native ES6 class!
Class({
    name: "OuroWidget",
    kindOf: NativeWidget,
    render() {
        return `<!-- Ouro Wrapper -->${this.inner()}`;
    },
});

const w = new OuroWidget("hero");
w.render(); // '<!-- Ouro Wrapper --><div id="hero"></div>'
w instanceof NativeWidget; // true
w.isA(NativeWidget); // true
OuroWidget.kindOf(NativeWidget); // true
```

### Recipe 3.4: Enforcing Abstract Contracts (`requires` & `Forward`)

Declare incomplete or abstract classes using `requires: [...]` or the `Forward` symbol token. Subclasses automatically resolve requirements as they implement the missing methods or properties:

```javascript
Class({
    name: "BaseAdapter",
    requires: ["connect", "disconnect"],
    endpoint: Forward,
});

BaseAdapter.isComplete(); // false
BaseAdapter.getForwardDeclarations(); // ["endpoint", "connect", "disconnect"]

Class({
    name: "PostgresAdapter",
    kindOf: BaseAdapter,
    endpoint: "postgres://localhost:5432",
    connect() {
        return true;
    },
    disconnect() {
        return true;
    },
});

PostgresAdapter.isComplete(); // true
```

### Recipe 3.5: Extending the DSL Vocabulary (`Ouro.extendVocabulary`)

Register domain-specific aliases for any structural keyword without breaking canonical Ouro definitions:

```javascript
Ouro.extendVocabulary("kindOf", "inheritsFrom", "extends");
Ouro.extendVocabulary("properties", "slots");

Class({
    name: "CustomEntity",
    inheritsFrom: Spaceship,
    slots: { shieldRating: 100 },
});
```

### Recipe 3.6: The Mirror of Reflection (`inspect`, `stringify`, `toSnapshot`, `audit`)

Because reflection and DevTools formatting live inside `Ouro.introspectionExtension` and `Ouro.devtoolsExtension`, the core allocator stays lean while providing full Smalltalk-style live inspection when loaded:

```javascript
// 1. Structured reflection report (pass { log: true } for rich console groups & tables)
const classReport = inspect(Spaceship, { log: true });
const instanceReport = ship1.inspect({ log: true });

// 2. Clean key-value snapshot of all public instance slots (excludes static slots)
const plainObj = ship1.toSnapshot(); // or Ouro.snapshot(ship1)

// 3. Reconstruct a class's source code blueprint or serialize an instance to JSON
console.log(stringify(Spaceship));
console.log(stringify(ship1));

// 4. Preserve & inspect the un-normalized raw definition passed to Class(...)
const rawBlueprint = Spaceship.getDefinition();

// 5. Full MOP inventory of all GenericFunctions, Methods, Classes, and Core footprint
const kernelInventory = Ouro.audit();
```

---

# Book IV: The Realm of Men (Traits, Caching, Scrapers & Graphs)

> _"Where the gods rest and mortals build their kingdoms."_  
> _— Domain Logic, Horizontal Traits, Storage Drivers, Web Scrapers & Document Graphs_

With the MOP kernel forged and the Gateway open, Book IV is where high-level capabilities and domain kingdoms are built—completely decoupled from the core allocator.

### Recipe 4.1: Horizontal Composition & Recursive Trait Cascades (`Trait`)

In Ouro, `Trait` is a first-class Metaobject. Traits can unpack recursive cascades of sub-traits (`Auditable` brings `Timestamped`; `XMLContent` brings `DOMContent` and `APIContent`), carry public/private properties, methods, and AOP advices, and be woven at compile-time, onto existing classes, or onto individual instances (Eigenclass / `eql`-specialization):

```javascript
new Trait({
    name: "Timestamped",
    createdAt: null,
    after: {
        initialize() {
            this.createdAt = Date.now();
        },
    },
});

new Trait({
    name: "Auditable",
    traits: [Timestamped], // Recursive trait dependency unpacking
    auditSummary() {
        return `[${this.constructor.getName()}] created at ${this.createdAt}`;
    },
});

// 1. Compile-time adoption
Class({
    name: "Invoice",
    traits: [Auditable],
});

// 2. Dynamic Class-level adoption at runtime
Spaceship.addTrait(Auditable);

// 3. Dynamic Instance-level adoption (Eigenclass — affects ONLY this instance)
const specialShip = new Spaceship({ vesselName: "Normandy" });
specialShip.addTrait(Exportable);
```

### Recipe 4.2: Taming Native C++ Host Objects (`Trait.native`)

Browser host objects (`URL`, `HTMLElement`, `Request`) use internal C++ slots that throw `TypeError: Illegal invocation` if subclassed naively. `Trait.native` generates descriptor-safe forwarding stubs so your Ouro class acts seamlessly like the native object while supporting AOP and facets:

```javascript
Class({
    name: "SmartURL",
    traits: [
        Trait.native(URL, {
            state: "url", // Exposes this.url() & private this._urlObject
            only: ["href", "pathname", "searchParams"], // Optional whitelist
        }),
    ],
    initialize(rawUrl) {
        this._urlObject = new URL(rawUrl);
    },
});
```

### Recipe 4.3: Vaults of Memory (`localCache`, `sessionCache`, `globalCache` & `Cacheable`)

Ouro ships with three storage traits—`localCache` (`localStorage`), `sessionCache` (`sessionStorage`), and `globalCache` (Tampermonkey `GM_getValue`/`GM_setValue` with automatic fallback)—plus the `Cacheable()` method-memoization factory:

```javascript
Class({
    name: "CatalogService",
    traits: [
        globalCache,
        // Automatically wraps fetchCatalog(id) in an :around cache layer!
        Cacheable("fetchCatalog", (self, id) => `cat_${id}`, globalCache),
    ],
    cacheTTL: { days: 7 }, // Automatic TTL expiration

    async fetchCatalog(id) {
        // Only executes on cache miss; result is packed & stored automatically
        return { id, items: ["item1", "item2"] };
    },
});

// Purge all Ouro caches across Local, Session, and Global storage engines if needed:
// Cacheable.nuke();
```

### Recipe 4.4: Reactive URL Templates (`RouteURL`)

Located in `src/scraper.js`, `RouteURL` wraps the native `URL` object with template variable extraction (`${var}`). Both `RouteURL.builder` and `RouteURL.args` are reactive facetted slots—mutating any nested key inside `route.args` automatically triggers `route.build()` via a `Proxy`:

```javascript
const route = new RouteURL(
    "[https://api.themoviedb.org/3/movie/$](https://api.themoviedb.org/3/movie/$){tmdbId}?api_key=${apiKey}",
    { tmdbId: 550, apiKey: "secret" },
);

route.pathname; // "/3/movie/550"
route.args.tmdbId = 603; // Reactive Proxy automatically triggers route.build()!
route.pathname; // "/3/movie/603"
```

### Recipe 4.5: The WebWeaver's Loom (`HTMLPage`, `JSONPage`, `XMLPage`)

The Page System turns URL routing, network fetching (`fetch` / `GM_xmlhttpRequest`), DOM/JSON/XML extraction, dependency resolution (`providers`), cross-page enrichment (`enrichers`), and SPA navigation into declarative class blueprints. If a `JSONPage` omits a `schema`, `scrape()` automatically falls back to populating `this.data` with the raw JSON payload:

```javascript
// 1. Register a JSON API scraper
JSONPage.register({
    name: "tmdbMoviePage",
    class: {
        routeTemplate:
            "[https://api.themoviedb.org/3/movie/$](https://api.themoviedb.org/3/movie/$){tmdb_id}?api_key=${tmdbKey}",
        providers: {
            tmdbKey: () => TMDB.apiKey, // Lazily resolved before fetch()
        },
    },
    schema: {
        title: "title",
        imdb_id: "imdb_id",
        releaseYear: ["release_date", (d) => Number(d?.slice(0, 4))],
    },
});

// 2. Register a DOM/HTML scraper with CSS selectors & automatic enrichment
HTMLPage.register({
    name: "movieDetailPage",
    class: {
        routeTemplate:
            "[https://example-cinema.org/movies/$](https://example-cinema.org/movies/$){slug}",
        enrichers: {
            // Automatically fetches tmdbMoviePage when this.data.tmdb_id is present
            tmdb: [tmdbMoviePage, ["tmdb_id"]],
        },
    },
    schema: {
        heading: "h1.movie-title",
        tmdb_id: [
            "a[href*='themoviedb.org/movie/']",
            "href",
            (href) => href.match(/movie\/(\d+)/)?.[1],
        ],
        torrents: [
            "all_",
            "div.torrent-row",
            {
                quality: ".badge-quality",
                magnet: ["a.magnet-link", "href"],
            },
        ],
    },
    after: {
        process() {
            console.log("Scraped & enriched data:", this.data);
        },
    },
});

// 3. Boot the SPA router & process the current window URL
Page.start();
```

### Recipe 4.6: The Constellation Vault (`Graph` Document Store)

Located in `src/graph.js`, `Graph` is a multi-key, multi-variant active-record document store backed by `globalCache`. It merges records sharing any `primaryKeys` into a unified entity vault while indexing `secondaryKeys`, coercing `keyTypes`, and resolving cross-graph `relations`:

```javascript
Class({
    name: "ServerGraph",
    kindOf: Graph,
    class: {
        primaryKeys: ["server_id"],
    },
});

Class({
    name: "MovieGraph",
    kindOf: Graph,
    class: {
        primaryKeys: ["imdb_id", "tmdb_id", "yts_id"],
        secondaryKeys: ["plex_id"],
        keyTypes: {
            tmdb_id: Number,
            yts_id: Number,
            imdb_id: String,
        },
        relations: {
            server: {
                target: ServerGraph,
                foreignKey: "server_id",
                targetKey: "server_id",
            },
        },
    },
});

// 1. Insert or merge identity keys + variant payloads
ServerGraph.put({ server_id: "srv-01", name: "HomeMedia" });

MovieGraph.put({
    imdb_id: "tt0133093",
    tmdb_id: "603", // Coerced to Number(603) via keyTypes
    plex_id: "rk-900",
    server_id: "srv-01",
    resolution: "1080p",
});

MovieGraph.put({
    imdb_id: "tt0133093", // Automatically merges into the same Vault!
    plex_id: "rk-901",
    server_id: "srv-01",
    resolution: "4K",
});

// 2. Multi-key lookup (falls back across provided keys until a match hits)
const movie = MovieGraph.get({ imdb_id: "tt_unknown", plex_id: "rk-900" });

// 3. Flatten all variants with primary keys
movie.records;
// -> [
//   { imdb_id: "tt0133093", tmdb_id: 603, plex_id: "rk-900", server_id: "srv-01", resolution: "1080p" },
//   { imdb_id: "tt0133093", tmdb_id: 603, plex_id: "rk-901", server_id: "srv-01", resolution: "4K" }
// ]

// 4. Resolve cross-graph foreign relations
const withServer = MovieGraph.resolve({ tmdb_id: 603 }, "server");

// 5. Prune a specific variant (and automatically clean up its orphaned secondary index)
MovieGraph.prune({ imdb_id: "tt0133093" }, { resolution: "1080p" });
```

---

## 🛠️ CLI Commands & Repository Layout

```bash
# Run the full Ouro + Scraper + Graph test suite in Node.js
npm test

# Synchronize DEV userscript to Prod (gated to the `main` branch)
npm run sync:prod

# Force-synchronize DEV userscript to Prod regardless of current Git branch
npm run sync:prod:force
```

```text
ouro/
├── src/
│   ├── ouro.js         # Books I–IV: Core MOP Kernel & Standard Extensions
│   ├── scraper.js      # Page System, RouteURL, DOMValue & Extractors
│   ├── graph.js        # Graph Document Store & Relational Engine
│   └── userscripts/    # DEV Userscript & main-gated Prod sync script
├── tests/
│   ├── test.js         # Ouro Unit Test Suite
│   ├── run-node.js     # Headless Node.js Test Runner
│   └── ouro_test.html  # Browser Test Runner
├── CHANGELOG.md
├── TODO.md
└── README.md
```
