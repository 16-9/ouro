# JMOP / Ouro Refactoring & Expansion Punch List

- [x] **1. Core Classes Audit Code:** Run baseline inventory of `Class`, `Metaclass`, `Method`, and `GenericFunction` keys *(Implemented `Ouro.audit()` and verified via unit tests)*.
- [x] **2. Sample Object to Minimal Class Conversion:** Build utility to convert plain JS sample objects into minimal class templates *(Implemented `Class.fromSample` / `Ouro.fromSample` with `{ preserveValues }` support)*.
- [x] **3. Class to JMOP Class Conversion:** Build mechanism to transform native JS classes into authentic JMOP managed classes *(Implemented `Class.fromClass` / `Ouro.fromClass`, preserved ES6 prototype chains, bridged native `kindOf: NativeES6Class` directly, and converted `tests/test.js` `Test` class to Ouro)*.
- [x] **4. Core JMOP Property/Method Addition Mechanism:** Ensure core kernel relies explicitly on internal `addMethod` and `addProperty` primitives *(Implemented singular `addProperty` / `addMethod` alongside `addProperties` / `addMethods` on `Metaclass`, all routed through `GenericFunction`)*.
- [x] **5. Meta Property Management:** Implement private `meta` container holding strictly the raw definition object *(Preserved un-normalized raw definition via `Bootstrap.cloneRawDefinition` in `newClass.__private.class.definition` and `Class.getDefinition()`, while storing normalized schema on `__meta.normalizedDefinition`)*.
- [x] **6. Post-Execution Hooks (Lifecycle Advices):** Implement the 3 core triggers:
  - `(a)` After class creation (`Class.addMethods({ after: { class: { forge } } })`)
  - `(b)` After `addMethod` / `addMethods` (`Metaclass.addMethods({ after: { instance: { addMethod, addMethods } } })`)
  - `(c)` After `addProperty` / `addProperties` (`Metaclass.addMethods({ after: { instance: { addProperty, addProperties } } })`)
- [x] **7. Introspection Metadata Inventory:** List all specific meta properties and methods required for reflection/querying *(Implemented `getProperties`, `getMethods`, `getDefinition`, `getNormalizedDefinition`, `getRequires`, `isAbstract`, `getSlot`, `getSlotFacet`, `setSlotFacet`, `snapshot`, `toSnapshot`, and `inspect` in `Ouro.introspectionExtension`)*.
- [x] **8. Stringify Method:** Build serialization routine to convert a class back into its text blueprint representation *(Implemented `stringify` `GenericFunction` handling classes—including accessors, static/private properties & methods, and `before`/`after`/`around` advices—and instances via `Ouro.snapshot`)*.
- [x] **9. DevTools Display Sugar (Extension):** Package custom formatting and presentation sugar as an independent extension layer *(Implemented `Ouro.devToolsExtension` with `Symbol.toStringTag`, `[Symbol.for("nodejs.util.inspect.custom")]`, and `window.devtoolsFormatters`)*.
- [x] **10. Forward-Defined Properties/Methods List:** Define and track registry of forward-referenced tokens or scaffolded attributes *(Implemented `Ouro.Forward` symbol, `requires: { properties: [], methods: [] }` vocabulary key, `Class.getRequires()`, and `Class.isAbstract()`, automatically resolving requirements on subclassing or dynamic mutation)*.
- [x] **11. Protected/Expected Class Definition Keys List:** Codify validation and handling for core structural keys (`name`, `description`, `properties`, `methods`, `kindOf`, `traits`, `requires`, `abstract`, `before`, `after`, `around`) and property facet keys (`init`, `value`, `default`, `ifNeeded`, `transform`, `validate`, `onChange`, `type`) *(Codified in `Ouro.Vocabulary`, `Ouro.Vocabulary.facets` / `Ouro.FacetVocabulary`, and `Ouro.normalizeMatrix`)*.
- [x] **12. Core Loaded Properties/Methods Inventory:** Document the precise set of primitives established directly within `Ouro.load()` *(Inventoried and exposed via `Ouro.audit()` and `Ouro.introspectionExtension`)*.

---

## Advanced Expansions & Investigations

- [x] **Investigate Faceted Slots:** Implement KEE/CLOS-inspired reactive metadata triggers and declarative slot facets *(Implemented `Ouro.Vocabulary.facets`, declarative inline `{ init, value, default, ifNeeded, transform, validate, onChange, type }` property descriptors, `facetted({...})` / `faceted({...})` helper, `Class.setSlotFacet` / `Class.getSlotFacet` / `Class.getSlot`, subclass facet inheritance, reactive `RouteURL.args` Proxy, and `Graph.keyTypes`, integrated into both unadvised and advised slot metaobjects)*.
- [x] **Explore Multi-Dispatch (Generic Functions):** Expand dispatcher *(Added `Method.prototype.getSpecificity(args)` and lexicographic specificity sorting in `GenericFunction.prototype.dispatch` across multi-argument specializers)*.
- [x] **Forward-Declared / Scaffolded Manifests:** Design opt-in registry *(Implemented via `Ouro.Forward` and `requires:` manifest tracking in `__meta.requires`)*.
- [x] **Modular Extension Packaging:** Separate core from optional plugins *(Separated `Ouro.load()` kernel from modular extensions in `src/ouro.js`, `src/scraper.js`, and `src/graph.js`, and added `main`-branch-gated DEV -> Prod userscript sync in `src/userscripts/sync-prod.js`)*.

---

## Deep Dives & DX Enhancements

- [x] **13. Audit Deep-Dive on Built-in Function Properties:** Revisit constructor audit findings regarding native properties like `.length`, `.name`, and `prototype` linkage to determine if/how they should be filtered during reflection *(Filtered via `Ouro.NativeIgnoreList` in `getProperties` and `getMethods`, and unwrapped `closMethod.__originalFn` so reflection returns user functions)*.
- [x] **14. Vocabulary Aliasing/Translation:** Explore capability for extensions to provide alternative syntax mappings (e.g., allowing multiple string keywords to map to the same semantic concept like `kindOf` and `inheritsFrom`) *(Implemented `Ouro.VocabularyAliases` and alias translation in `Ouro.normalizeMatrix`)*.
- [x] **15. Vocabulary Helper:** Implement `extendVocabulary(semantic, ...literals)` to safely encapsulate syntax expansions *(Implemented `Ouro.extendVocabulary(semanticKey, ...stringLiterals)` preserving canonical keywords while registering aliases)*.
- [x] **16. DX Helpers as Extensions:** Ensure all developer experience (DX) helpers (like `extendVocabulary`) are strictly implemented in the extension phase by augmenting the `Ouro` namespace, keeping the core loader pure *(Implemented in `Ouro.syntaxExtensions`)*.
- [x] **17. Evaluate Generic Function Upgrades:** Audit current standard functions (such as `stringify`, `inspect`, `addProperty`, `addMethod`) to determine which should be upgraded to `defgeneric` to unlock AOP advising and user-level type specialization *(Upgraded `stringify`, `inspect`, `addProperty`, `addProperties`, `addMethod`, and `addMethods` to `GenericFunction`s)*.
- [x] **18. Direct Class Reference in Property Values:** Ensure we can use a class directly as a property value in a class definition rather than having to protect it via a getter *(Fixed in `Ouro.normalizeMatrix` via `Ouro.isClassValue(val)` check so Ouro classes and ES6 classes are stored directly as properties, and refactored `src/scraper.js` to use `extractor: DOMExtractor` / `JSONExtractor` / `XMLExtractor` directly)*.

---

## Core Kernel Slimming (Metaclass, Method & GenericFunction De-Bloating)

- [x] **19. Extract `Metaclass` Reflection from Core:** Move `getSubclasses`, `getInstances`, `getBlueprint`, `getName`, and `getKindOf` / `superclass` out of the core `Metaclass` definition into `Ouro.introspectionExtension` *(Completed in `src/ouro.js`)*.
- [x] **20. Extract `Method` Reflection from Core:** Move `getSpecializers()`, `getQualifier()`, and `getBody()` out of Core `Method` into `Ouro.introspectionExtension` *(Completed in `src/ouro.js`; core dispatcher and normalizer read `m.specializers`, `m.qualifier`, and `m.body` directly)*.
- [x] **21. Extract `GenericFunction` Reflection from Core:** Move `getMethods()` out of Core `GenericFunction` into `Ouro.introspectionExtension` and add `getName()` there *(Completed in `src/ouro.js`; core dispatcher and `removeMethod` access `this.methods` and `this.name` directly)*.
- [x] **22. Consolidate `toString` Sugar in DevTools Extension:** Move `Metaclass.prototype.toString`, `Method.prototype.toString`, and `GenericFunction.prototype.toString` from `Ouro.introspectionExtension` into `Ouro.devtoolsExtension` *(Completed in `src/ouro.js`)*.
- [x] **23. Slim `Bootstrap.allocate` Tracking & Inspection Hooks:** Move active instance tracking (`__meta.instances` `WeakSet` population), `__meta.subclasses` tracking, and prototype `toSnapshot` / `inspect` mounting out of `Bootstrap.allocate` and into `Ouro.introspectionExtension` and `Ouro.devtoolsExtension` via `Metaclass.bootstrap.allocateHooks` / `instantiateHooks` *(Completed in `src/ouro.js`)*.
