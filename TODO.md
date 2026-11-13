# JMOP Refactoring & Expansion Punch List

- [x] **1. Core Classes Audit Code:** Run baseline inventory of `Class`, `Metaclass`, `Method`, and `GenericFunction` keys *(Audit executed and analyzed)*.
- [ ] **2. Sample Object to Minimal Class Conversion:** Build utility to convert plain JS sample objects into minimal class templates.
- [ ] **3. Class to JMOP Class Conversion:** Build mechanism to transform native JS classes into authentic JMOP managed classes.
- [ ] **4. Core JMOP Property/Method Addition Mechanism:** Ensure core kernel relies explicitly on internal `addMethod` and `addProperty` primitives.
- [ ] **5. Meta Property Management:** Implement private `meta` container holding strictly the raw definition object.
- [ ] **6. Post-Execution Hooks (Lifecycle Advices):** Implement the 3 core triggers:
  - `(a)` After class creation
  - `(b)` After `addMethod`
  - `(c)` After `addProperty`
- [ ] **7. Introspection Metadata Inventory:** List all specific meta properties and methods required for reflection/querying.
- [ ] **8. Stringify Method:** Build serialization routine to convert a class back into its text blueprint representation.
- [ ] **9. DevTools Display Sugar (Extension):** Package custom formatting and presentation sugar as an independent extension layer.
- [ ] **10. Forward-Defined Properties/Methods List:** Define and track registry of forward-referenced tokens or scaffolded attributes.
- [ ] **11. Protected/Expected Class Definition Keys List:** Codify validation and handling for core structural keys (`name`, `description`, `properties`, `methods`, `kindOf`).
- [ ] **12. Core Loaded Properties/Methods Inventory:** Document the precise set of primitives established directly within `JMOP.load()`.

---

## Advanced Expansions & Investigations

- [ ] **Investigate Faceted Slots:** Implement reactive metadata triggers.
- [ ] **Explore Multi-Dispatch (Generic Functions):** Expand dispatcher.
- [ ] **Forward-Declared / Scaffolded Manifests:** Design opt-in registry.
- [ ] **Modular Extension Packaging:** Separate core from optional plugins.

---

## Deep Dives & DX Enhancements

- [ ] **13. Audit Deep-Dive on Built-in Function Properties:** Revisit constructor audit findings regarding native properties like `.length`, `.name`, and `prototype` linkage to determine if/how they should be filtered during reflection.
- [ ] **14. Vocabulary Aliasing/Translation:** Explore capability for extensions to provide alternative syntax mappings (e.g., allowing multiple string keywords to map to the same semantic concept like `kindOf` and `inheritsFrom`).
- [ ] **15. Vocabulary Helper:** Implement `extendVocabulary(semantic, literal)` in the core return block to safely encapsulate syntax expansions.
- [ ] **16. DX Helpers as Extensions:** Ensure all developer experience (DX) helpers (like `extendVocabulary`) are strictly implemented in the extension phase by augmenting the `JMOP` namespace, keeping the core loader pure.
- [ ] **17. Evaluate Generic Function Upgrades:** Audit current standard functions (such as `stringify`, `printObject`, or even the core `load` pipeline) to determine which should be upgraded to `defgeneric` to unlock AOP advising and user-level type specialization.
- [ ] **18. Direct Class Reference in Property Values:** Ensure we can use a class directly as a property value in a class definition rather than having to protect it via a getter:
  ```javascript
  const DOMPage = Page.register({
    name: "DOMPage",
    class: { routeTemplate: "no route" },
    get extractor() { return DOMExtractor; }
  });