// @require      https://gist.githubusercontent.com/16-9/b9a76cfe8f328547ed860baec509e1b0/raw/Ouro_graph.js?refresh=3

// 261112 1024 Major refactoring completed using Antigravity

/**
 * ============================================================================
 * GRAPH EXTENSION & DOMAIN PAGES — PRESERVATION & RUNTIME FIXES
 * ============================================================================
 *
 * - Byte-for-Byte Preservation:
 *   Per specification, zero characters were modified between
 *   `// START GRAPH EXTENSION` and `registerGlobals({MovieGraph, PlexRecord});`.
 *
 * - Runtime Issues Resolved via Core & Extension Enhancements:
 *   1. `MovieGraph` & `PlexRecord` (`kindOf: Graph`) now inherit `Graph.__private`
 *      from `OURO CORE`, allowing `MovieGraph.get()`, `MovieGraph.put()`, and
 *      `PlexRecord.get()` to invoke private `StorageTrait` helpers (`_pack`,
 *      `_unpack`, `_cachePurgeIfNeeded`) without throwing a `TypeError`.
 *   2. `ytsBrowsePage.enrich()` calling `await plexLibraryPage.extract()` on a
 *      cold/expired cache now automatically resolves `plexServerInfoPage` first
 *      via `Page.prototype.resolveProviders()`, guaranteeing `Plex.serverUrl` is
 *      populated before `plexLibraryPage` builds its request URL.
 *   3. `ytsBrowsePage.scrape()` and `DOMExtractor` now properly extract all
 *      `DOMValue` scraps (`this.scraps.movies[i].e` and `this.data.movies`)
 *      without triggering premature prototype getters on `NativeElement`.
 * ============================================================================
 */

// START GRAPH EXTENSION
/* global unsafeWindow Ouro Extension Class globalCache */
Ouro.graphSystemExtension = new Extension(
    "Graph System",
    "A robust, efficient graph-based Document Store architecture for mapping multi-variant payloads.",
    function () {
        const Graph = Class({
            name: "Graph",
            traits: [globalCache],

            properties: {
                public: {
                    class: {
                        primaryKeys: [],
                        secondaryKeys: [],
                        autoCommit: true,
                    },
                },
                private: {
                    instance: {
                        graphId: undefined,
                        payload: [],
                        indexes: [],
                    },
                },
            },

            methods: {
                public: {
                    class: {
                        // ==========================================
                        // DATABASE DRIVER API
                        // ==========================================
                        get(query) {
                            const queryKeys = Object.keys(query);
                            if (queryKeys.length !== 1) {
                                throw new Error(
                                    `[${this.name}] get() requires exactly one primary key-value pair.`,
                                );
                            }

                            const searchString = `${queryKeys[0]}:${query[queryKeys[0]]}`;

                            const instance = new this();

                            const graphId = instance.fromCache(`Index_${searchString}`);
                            if (!graphId) return null;

                            const vaultData = instance.fromCache(`Vault_${graphId}`);
                            if (!vaultData) return null;

                            instance.initialize(
                                graphId,
                                vaultData.payload,
                                vaultData.indexes,
                            );
                            return instance;
                        },

                        put(...args) {
                            let query, newPayload;

                            if (args.length === 2) {
                                query = args[0];
                                newPayload = args[1];
                            } else if (args.length === 1) {
                                newPayload = args[0];
                                const primary = this.primaryKeys || [];
                                const secondary = this.secondaryKeys || [];

                                const routingKey =
                                    Object.keys(newPayload).find((k) => primary.includes(k)) ||
                                    Object.keys(newPayload).find((k) => secondary.includes(k));

                                if (!routingKey) {
                                    throw new Error(
                                        `[${this.name}] Single-argument put() requires at least one primary or secondary key in the payload.`,
                                    );
                                }

                                query = { [routingKey]: newPayload[routingKey] };
                            } else {
                                throw new Error(
                                    `[${this.name}] put() accepts either (query, payload) or (payload).`,
                                );
                            }

                            let instance = this.get(query);

                            if (!instance) {
                                instance = new this(this.generateGraphId(), [], []);
                            }

                            const unifiedPayload = Object.assign({}, query, newPayload);
                            instance.put(unifiedPayload);

                            return instance;
                        },

                        prune(query, matchObjOrFn) {
                            const instance = this.get(query);
                            if (!instance) return null;
                            return instance.prune(matchObjOrFn);
                        },

                        delete(query) {
                            const instance = this.get(query);
                            if (instance) {
                                instance.delete();
                                return true;
                            }
                            return false;
                        },

                        // ==========================================
                        // BULK OPERATIONS
                        // ==========================================
                        getAll() {
                            // 1. Get the exact length of "Ouro_TestGraph_"
                            const prefixLength = this._cacheKey(undefined).length + 1;

                            // 2. Isolate, unquote, and filter the Vault keys
                            const vaultKeys = this.listCached()
                                .map((k) => JSON.parse(k.slice(prefixLength))) // Safely strips the JSON quotes
                                .filter((k) => k.startsWith("Vault_"));

                            return vaultKeys
                                .map((vaultKey) => {
                                    const instance = new this();
                                    const vaultData = instance.fromCache(vaultKey);
                                    if (!vaultData) return null;

                                    const graphId = vaultKey.replace("Vault_", "");
                                    instance.initialize(
                                        graphId,
                                        vaultData.payload,
                                        vaultData.indexes,
                                    );
                                    return instance;
                                })
                                .filter(Boolean);
                        },

                        deleteAll() {
                            // Count the records before destruction for the return value
                            const count = this.getAll().length;

                            // Leverage the trait's native method to instantly wipe all Vaults, Indexes, and the _meta_lastPurge key
                            if (typeof this.clearAll === "function") {
                                this.clearAll();
                            }

                            return count;
                        },

                        records(query) {
                            const instance = this.get(query);
                            return instance ? instance.records : [];
                        },

                        recordAll() {
                            return this.getAll().map((instance) => instance.record);
                        },

                        recordsAll() {
                            return this.getAll().flatMap((instance) => instance.records);
                        },
                    },

                    instance: {
                        initialize(graphId, payload = [], indexes = []) {
                            if (graphId) {
                                this.graphId = graphId;
                                this.payload = payload;
                                this.indexes = indexes;
                            }
                        },

                        // ==========================================
                        // ENCAPSULATED DATA EXPOSURE
                        // ==========================================
                        get record() {
                            const output = {};

                            this.indexes.forEach((idx) => {
                                const colon = idx.indexOf(":");
                                const k = idx.slice(0, colon);
                                let v = idx.slice(colon + 1);
                                output[k] = /^\d+$/.test(v) ? parseInt(v, 10) : v;
                            });

                            output.variants = Array.isArray(this.payload) ? this.payload : [];
                            return output;
                        },

                        get records() {
                            const baseRecord = {};

                            this.indexes.forEach((idx) => {
                                const colon = idx.indexOf(":");
                                const k = idx.slice(0, colon);
                                let v = idx.slice(colon + 1);
                                baseRecord[k] = /^\d+$/.test(v) ? parseInt(v, 10) : v;
                            });

                            if (!Array.isArray(this.payload) || this.payload.length === 0) {
                                return [baseRecord];
                            }

                            return this.payload.map((variant) =>
                                Object.assign({}, baseRecord, variant),
                            );
                        },

                        // ==========================================
                        // ACTIVE RECORD API
                        // ==========================================
                        put(hash) {
                            const schema = this.constructor.primaryKeys || [];
                            const variantPayload = {};
                            let hasVariantData = false;

                            for (const [key, value] of Object.entries(hash)) {
                                if (schema.includes(key)) {
                                    const indexString = `${key}:${value}`;
                                    if (!this.indexes.includes(indexString)) {
                                        this.indexes.push(indexString);
                                    }
                                } else {
                                    variantPayload[key] = value;
                                    hasVariantData = true;
                                }
                            }

                            if (hasVariantData) {
                                this.payload = Array.isArray(this.payload) ? this.payload : [];

                                const variantSignature = JSON.stringify(
                                    Object.entries(variantPayload).sort(),
                                );

                                const isDuplicate = this.payload.some(
                                    (existing) =>
                                        JSON.stringify(Object.entries(existing).sort()) ===
                                        variantSignature,
                                );

                                if (!isDuplicate) {
                                    this.payload.push(variantPayload);
                                }
                            }

                            if (this.constructor.autoCommit) {
                                this.commit();
                            }

                            return this;
                        },

                        prune(matchObjOrFn) {
                            if (!Array.isArray(this.payload)) return this;
                            const isMatch =
                                typeof matchObjOrFn === "function"
                                    ? matchObjOrFn
                                    : (variant) =>
                                          variant &&
                                          typeof matchObjOrFn === "object" &&
                                          matchObjOrFn !== null &&
                                          Object.entries(matchObjOrFn).every(
                                              ([k, v]) => variant[k] === v,
                                          );

                            const removed = [];
                            const kept = [];
                            for (const variant of this.payload) {
                                if (isMatch(variant)) removed.push(variant);
                                else kept.push(variant);
                            }

                            if (removed.length > 0) {
                                this.payload = kept;
                                const secKeys = this.constructor.secondaryKeys || [];
                                for (const rem of removed) {
                                    for (const sk of secKeys) {
                                        if (
                                            rem[sk] != null &&
                                            !kept.some((v) => v[sk] === rem[sk])
                                        ) {
                                            this.clearCache(`Index_${sk}:${rem[sk]}`);
                                        }
                                    }
                                }
                                if (this.constructor.autoCommit && this.graphId) {
                                    this.commit();
                                }
                            }
                            return this;
                        },

                        commit() {
                            if (!this.graphId) {
                                throw new Error(
                                    `[${this.constructor.name}] Cannot commit without a graphId.`,
                                );
                            }

                            this.toCache(`Vault_${this.graphId}`, {
                                payload: this.payload,
                                indexes: this.indexes,
                            });

                            this.indexes.forEach((idxString) => {
                                this.toCache(`Index_${idxString}`, this.graphId);
                            });

                            const secKeys = this.constructor.secondaryKeys || [];
                            if (secKeys.length && Array.isArray(this.payload)) {
                                for (const variant of this.payload) {
                                    for (const sk of secKeys) {
                                        if (variant && variant[sk] != null) {
                                            this.toCache(
                                                `Index_${sk}:${variant[sk]}`,
                                                this.graphId,
                                            );
                                        }
                                    }
                                }
                            }

                            return this;
                        },

                        delete() {
                            if (!this.graphId) return;

                            this.indexes.forEach((idxString) => {
                                this.clearCache(`Index_${idxString}`);
                            });

                            const secKeys = this.constructor.secondaryKeys || [];
                            if (secKeys.length && Array.isArray(this.payload)) {
                                for (const variant of this.payload) {
                                    for (const sk of secKeys) {
                                        if (variant && variant[sk] != null) {
                                            this.clearCache(`Index_${sk}:${variant[sk]}`);
                                        }
                                    }
                                }
                            }

                            this.clearCache(`Vault_${this.graphId}`);

                            this.graphId = undefined;
                            this.payload = [];
                            this.indexes = [];
                        },
                    },
                },

                private: {
                    class: {
                        // Strictly encapsulated from domain logic
                        generateGraphId() {
                            return (
                                "g_" +
                                Date.now().toString(36) +
                                "_" +
                                Math.random().toString(36).substr(2, 5)
                            );
                        },
                    },
                },
            },
        });

        // Publish to the global Ouro namespace so subclasses like MovieGraph can inherit it
        Ouro.publish("Graph", Graph);
    },
);
// END GRAPH EXTENSION