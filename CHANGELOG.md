# Changelog

All notable changes to the **OURO (Object Unified Reflective Ontology)** framework are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-11-13

### Changed

- **Modular Repository Architecture:** Migrated from standalone GitHub Gists (`Ouro_dev.js`, `Ouro_scraper.js`, `Ouro_graph.js`) into a unified repository layout (`src/ouro.js`, `src/scraper.js`, `src/graph.js`, `src/fragments.js`).
- **Self-Bootstrapping Metaclass (`src/ouro.js`):** Consolidated duplicate property and method installation loops between Phase 2 bootstrap and Phase 4 MOP weaving into `Metaclass.forge` and `Metaclass.addMethods`, allowing `Metaclass` to bootstrap itself via `Metaclass.addMethods(metaDef.methods)`.
- **Fast-Path MOP Dispatch (`src/ouro.js`):** Refactored `GenericFunction.dispatch` to perform single-pass method categorization (`primaries`, `befores`, `afters`, `arounds`) and execute a fast path when a method has a single primary and no advices, bypassing closure allocation.
- **Zero-Allocation Empty Private Vaults (`src/ouro.js`):** Optimized private vault mounting to skip `Object.defineProperty` loops when a class's private blueprint is empty.
- **Class-Level Cache Purge Throttling (`src/ouro.js`):** Updated `StorageTrait` to track `purged` state at the Class level rather than per instance, eliminating redundant `_meta_lastPurge` storage reads across instantiations.

### Added

- **Browser Test Suite & Runner (`tests/`):** Added `tests/test.js` wrapped in `registerOuroTests()` for deferred post-bootstrap execution, `tests/ouro_test.html`, and the `tests/ouro-test.user.js` Tampermonkey harness with wildcard `@match` (`file:///*/ouro_test.html`), live `#UnitTests` DOM console mirroring, and automatic `<h2>` pass-rate status updates.
- **First-Class Slot Metaobjects (`src/ouro.js`):** Registered first-class Slot metaobjects (`{ symbol, get, set }`) in `classConstructor.__meta.slotSymbols` for public properties, preserving backing Symbols when upgraded to AOP `GenericFunction`s and reusing inherited slot Symbols across subclasses.
- **Per-Instance Non-Primitive Cloning (`src/ouro.js`):** Added `Bootstrap.isCloneable` and descriptor-preserving `Bootstrap.cloneValue` to deep-clone non-primitive default property values (`[]`, `{}`) per instance on first read without triggering accessor getters.
- **Primary Super-Chaining (`src/ouro.js`):** Enabled overridden `primary` methods on subclasses to invoke `this.inner()` to call their superclass primary method (analogous to `super`).
- **In-Flight Cache Deduplication (`src/ouro.js`):** Added an `inFlight` Promise registry to `Cacheable` so concurrent calls for the same uncached key share a single network request.
- **Declarative DOM Builder & Fluent Helpers (`src/scraper.js`):** Added static `DOMValue.create(tag, options)` factory and chainable manipulation methods on `DOMValue`: `.css()`, `.attr()`, `.on()`, `.append()`, `.appendTo()`, `.wrap()`, `.linkify()`, and `.badge()`.
- **Declarative `Page` Schemas & Providers (`src/scraper.js`):**
    - Added class/instance `schema` (and `structure`) support so `Page.prototype.scrape()` automatically instantiates `DOMExtractor` or `JSONExtractor` and populates `this.scraps` and `this.data`.
    - Added declarative `providers` map and `resolveProviders()` to resolve route template variables (`${serverUrl}`, `${plexToken}`, `${librarySection}`, `${machineIdentifier}`, `${tmdbKey}`) automatically before `fetch()`, `scrape()`, and `extract()`.
    - Added multi-candidate fallback chains to `this.enrichWith()` and declarative `enrichers`.
    - Added `Page.maxConcurrent` (default `8`) semaphore queuing and automatic retry on transient network failures or `HTTP 429/502/503/504` in `_networkFetch`.
    - Added deduplicated CSS injection via `Page.addStyle(cssText)` and automatic `css` property injection during `before.process`.

### Fixed

- **Private State & Method Inheritance Across `kindOf` (`src/ouro.js`, `src/graph.js`):** Updated `forgeConstructor` to inherit `parentClass.__private.instance` and `parentClass.__private.class` so subclasses (such as `MovieGraph` and `PlexRecord` inheriting from `Graph`) retain access to private methods and state woven by traits (`_pack`, `_unpack`, `_cachePurgeIfNeeded`).
- **Defensive `RouteURL.build` Hydration Guard (`src/scraper.js`):** Enforced strict `!== undefined` and `!== null` checks on template variables in `RouteURL.build()` to prevent unhydrated route arguments from constructing invalid URLs (e.g., `"https://undefined/..."`).
- **Cold-Cache Provider Resolution (`src/scraper.js`, `src/graph.js`):** Resolved issue where `ytsBrowsePage.enrich()` calling `plexLibraryPage.extract()` on a cold/expired cache failed to populate `Plex.serverUrl` prior to URL construction.
- **Premature Prototype Getter Evaluation (`src/scraper.js`):** Fixed `DOMExtractor` and `ytsBrowsePage.scrape()` so extracting `DOMValue` scraps does not trigger premature prototype getters on `NativeElement`.

---

## [1.2.x] - 2026-08-04 to 2026-09-20

### Changed

- **2026-09-20:** Major core rewrite and architectural consolidation after extended stable development testing (`2026-09-19`).
- **2026-08-20:** Removed hardcoded `traits` from initial `Vocabulary` definition; refactored the Schema Normalizer to dynamically inspect `Vocabulary` and treat `Trait` definitions symmetrically with `Class` definitions.

### Added

- **2026-08-20:** Added recursive `Trait` dependency unpacking so traits can compose and cascade sub-traits automatically (e.g., `XMLTrait` pulling in both `DOMTrait` and `APITrait`).

### Fixed

- **2026-08-27:** Fixed `:after` advice execution order to run **FIFO** (First-In, First-Out), contrasting with **LIFO** (Last-In, First-Out) for `:before` and `:around` advices.
- **2026-08-17:** Fixed `:before` and `:after` advice dispatch to properly await and handle `async` methods.
- **2026-08-04:** Fixed missing private class methods in core and resolved Schema Normalizer edge cases.

---

## [1.0.0] - 2026-07-27 to 2026-07-30

### Added

- **2026-07-30:** Added `Ouro.VERSION` constant and ASCII Ouroboros startup banner.
- **2026-07-29:** Added custom `Metaclass` support (`NativeClass`) during class creation and allowed `initialize()` to return a custom object, `Proxy`, or native wrapper when invoked with `new`.
- **2026-07-28 ("The Shedding of the Skin"):** Birth of the unified `Ouro` namespace, sealing of the Four Books architecture, and full namespace/narrative cleanup.
- **2026-07-28:** Added `ExtensionPackage`, dynamic extension unload/force-reload capabilities, and `GenericFunction.prototype.removeMethod`.
- **2026-07-28:** Replaced CLOS-style `callNextMethod` with `this.inner()` across the AOP dispatch engine (`:before`, `:after`, `:around`) and introduced the Schema Normalizer.
- **2026-07-27:** Initial Unified Smart Loader, Phase 1 Auto-Hydrator (eliminating constructor boilerplate), unified private state for pre- and post-boot extensions, and fault-tolerant Extension MOP Class in Phase 5.5.
