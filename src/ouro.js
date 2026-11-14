//=========================================
// OURO: Object Unified Reflective Ontology
// a JavaScript AOP Metaobject Protocol
//
// "La clarté est le contrepoids des pensées profondes."
// — Luc de Clapiers, marquis de Vauvenargues
//
// The Forging of the Ouroboros:
// Out of the void, the forge is lit. The serpent bites its own tail,
// and from the circle, true creation begins.
//=========================================

// START OURO CORE

globalThis.Ouro = (function () {
    const VERSION = "2.1.0";

    // --- INTERNAL NAMESPACE & STATE ---
    let isLoaded = false;
    let Class,
        Metaclass,
        Method,
        GenericFunction,
        Extension,
        ExtensionPackage,
        Ouro_API;

    const FacetVocabulary = {
        init: "init",
        value: "value",
        default: "default",
        ifNeeded: "ifNeeded",
        transform: "transform",
        validate: "validate",
        onChange: "onChange",
        type: "type",
    };

    const Vocabulary = {
        name: "name",
        description: "description",
        kindOf: "kindOf",
        properties: "properties",
        methods: "methods",
    };
    Object.defineProperty(Vocabulary, "facets", {
        value: FacetVocabulary,
        enumerable: false,
        configurable: true,
        writable: true,
    });
    const v = Vocabulary;
    const fv = FacetVocabulary;

    const banner = `
                                     .:-----.
                             :#@@@@%###++++*##%@@@@@*:.
                         .@@@%:                   +%@@.
                      .@@@:.         :*##:      =         .@%
                    =@@:         .-###%@@@@@@@@=      .@@. .%%.
                  -@#    *%@@@@@@%-.         -@%             .#@.
                 %@: +@@@+--%@=              .%@-  #@@@@%++ =%+
               :@#:@@%-  =@*.                  .#@= -@%    %*
              :@@@@=   .@%.                        =@# #%   -
              @@@=   .@@#                            .%%:%@. :%@=
             #@%    %@@#                OURO                 *@@+
            -@*   -@@@%                                        +@+@:
            #@   +@#-@.    Object Unified Reflective Ontology    ##-@=
            %+  +@* *%     a JavaScript AOP Metaobject Protocol  =@.=@
            %- =@*  @%                                           :@: @#
            %- @@.  #%        The Forging of the Ouroboros         +@  @%
            ##=@+   -@.    Out of the void, the forge is lit.   @+ -@%
            #@*@=   -@%      The serpent bites its own tail,    #% .@@#
             @@@=   =@@-         and from the circle,          %% .@@@+
             *@@=   -@@@.        true creation begins.       =@= +@%%%
              %@%   :@%-@*                                 @@.=@@-=@:
               %@=   @@..@@.            vx.y.z              %@:+@@= -@=
                #@.  :@%  -%@:                         =@@*@@#.  +@-
                 =@-  *@+   .%@@=                 =@@@@@+.    %%.
                  #@: %@=     *@@@@@%--------=@@@@%*-      .#@=
                    %@-#@%       #@@@*:.....             :@@@=
                      =@@@@-         #@@@@@@@#=-=#@@@@@@@@:
                         -@@@%             ...--:..*@@@.
                             :#@@@%#*-    :+##%@@@=:
                                    .::---:.
`;

    // ==========================================
    // BOOK I: THE PRIMORDIAL SHADOWS (Pure Allocation)
    // "Before the world had shape, there were shadows of what was to come."
    // ==========================================

    // ------------------------------------------
    // Phase 1: The Anvil of Creation (Bootstrap & State Isolation)
    // ------------------------------------------
    const Bootstrap = (function () {
        const PrivateStateRegistry = new WeakMap();
        const PrivateSymbol = Symbol("PrivateState");

        function isCloneable(val) {
            return (
                Array.isArray(val) ||
                (val !== null &&
                    typeof val === "object" &&
                    Object.getPrototypeOf(val) === Object.prototype)
            );
        }

        function cloneValue(val) {
            if (Array.isArray(val)) return val.map(cloneValue);
            if (isCloneable(val)) {
                const descriptors = Object.getOwnPropertyDescriptors(val);
                const out = {};
                for (const [k, desc] of Object.entries(descriptors)) {
                    if ("value" in desc) {
                        desc.value = cloneValue(desc.value);
                    }
                    Object.defineProperty(out, k, desc);
                }
                return out;
            }
            return val;
        }

        function ensurePrivateVault(target, blueprint) {
            let secrets = PrivateStateRegistry.get(target);
            if (!secrets) {
                secrets = cloneValue(blueprint);
                PrivateStateRegistry.set(target, secrets);
                Object.defineProperty(target, PrivateSymbol, {
                    value: secrets,
                    writable: true,
                    configurable: true,
                    enumerable: false,
                });
            }
            return secrets;
        }

        const RawDefSymbol = Symbol("Ouro.rawDefinition");
        const FacetSymbol = Symbol.for("Ouro.FacetDescriptor");

        function createFaceted(spec = {}) {
            if (spec && typeof spec === "object") {
                Object.defineProperty(spec, FacetSymbol, {
                    value: true,
                    enumerable: false,
                    configurable: true,
                });
            }
            return spec;
        }

        function isFacetDescriptor(val) {
            if (!val || typeof val !== "object" || Array.isArray(val))
                return false;
            if (val[FacetSymbol]) return true;
            if (Object.getPrototypeOf(val) !== Object.prototype) return false;
            const keys = Object.keys(val);
            if (keys.length === 0) return false;
            const validKeys = new Set(Object.values(fv));
            if (!keys.every((k) => validKeys.has(k))) return false;
            const activeKeys = [
                fv.ifNeeded,
                fv.transform,
                fv.validate,
                fv.onChange,
                fv.type,
            ];
            return activeKeys.some(
                (k) => k in val && typeof val[k] === "function",
            );
        }

        function applySlotType(val, typeSpec, propName) {
            if (val === undefined || val === null || !typeSpec) return val;
            if (typeSpec === Number) {
                const coerced = Number(val);
                if (Number.isNaN(coerced)) {
                    throw new Error(
                        `Slot validation failed for '${propName}': expected Number`,
                    );
                }
                return coerced;
            }
            if (typeSpec === String) {
                return String(val);
            }
            if (typeSpec === Boolean) {
                return Boolean(val);
            }
            if (typeSpec === Array) {
                if (!Array.isArray(val)) {
                    throw new Error(
                        `Slot validation failed for '${propName}': expected Array`,
                    );
                }
                return val;
            }
            if (typeSpec === Object) {
                if (typeof val !== "object" || Array.isArray(val)) {
                    throw new Error(
                        `Slot validation failed for '${propName}': expected Object`,
                    );
                }
                return val;
            }
            if (typeof typeSpec === "function") {
                const ok =
                    val instanceof typeSpec ||
                    (typeof val?.isA === "function" && val.isA(typeSpec));
                if (!ok) {
                    throw new Error(
                        `Slot validation failed for '${propName}': expected ${typeSpec.name || "matching type"}`,
                    );
                }
                return val;
            }
            return val;
        }

        function cloneRawDefinition(def) {
            if (!def || typeof def !== "object") return def;
            const copy = {};
            const descs = Object.getOwnPropertyDescriptors(def);
            for (const [k, desc] of Object.entries(descs)) {
                if (
                    "value" in desc &&
                    desc.value &&
                    typeof desc.value === "object" &&
                    !Array.isArray(desc.value) &&
                    Object.getPrototypeOf(desc.value) === Object.prototype
                ) {
                    desc.value = cloneRawDefinition(desc.value);
                } else if ("value" in desc && Array.isArray(desc.value)) {
                    desc.value = [...desc.value];
                }
                Object.defineProperty(copy, k, desc);
            }
            if (def[FacetSymbol]) {
                Object.defineProperty(copy, FacetSymbol, {
                    value: true,
                    enumerable: false,
                    configurable: true,
                });
            }
            return copy;
        }

        function matchesLineage(startClass, target) {
            if (!target) return false;
            const isName = typeof target === "string";
            let curr = startClass;
            while (curr && curr.__meta) {
                if (
                    isName
                        ? curr.__meta.name === target ||
                          curr.__meta.nativeParent?.name === target
                        : curr === target ||
                          curr.__meta.nativeParent === target ||
                          curr.__meta.name === target.name
                ) {
                    return true;
                }
                curr = curr.__meta.parent;
            }
            if (
                !isName &&
                typeof target === "function" &&
                startClass?.prototype
            ) {
                return startClass.prototype instanceof target;
            }
            return false;
        }

        const allocateHooks = new Set();
        const instantiateHooks = new Set();

        function allocate(definition, parentClass = Object) {
            const className = definition[v.name] || "AnonymousClass";

            const fns = {
                [className]: function (...args) {
                    for (const hook of instantiateHooks) {
                        hook(this);
                    }

                    const priv = this.constructor.__private?.instance;
                    if (priv && Object.keys(priv).length > 0) {
                        ensurePrivateVault(this, priv);
                    }

                    if (typeof this.initialize === "function") {
                        const initResult = this.initialize(...args);
                        if (
                            (typeof initResult === "object" ||
                                typeof initResult === "function") &&
                            initResult !== null
                        ) {
                            return initResult;
                        }
                    }
                },
            };

            const rawClass = fns[className];

            rawClass.prototype = Object.create(parentClass.prototype);
            Object.defineProperty(rawClass.prototype, "constructor", {
                value: rawClass,
                writable: true,
                configurable: true,
                enumerable: false,
            });

            if (!("isA" in rawClass.prototype)) {
                Object.defineProperty(rawClass.prototype, "isA", {
                    value: function (target) {
                        return (
                            (typeof target === "function" &&
                                this instanceof target) ||
                            matchesLineage(this.constructor, target)
                        );
                    },
                    writable: true,
                    configurable: true,
                    enumerable: false,
                });
            }

            if (!("className" in rawClass.prototype)) {
                Object.defineProperty(rawClass.prototype, "className", {
                    get: function () {
                        return this.__meta
                            ? this.__meta.name
                            : this.constructor?.__meta?.name ||
                                  this.constructor?.name;
                    },
                    configurable: true,
                    enumerable: false,
                });
            }

            Object.setPrototypeOf(rawClass, parentClass);

            const rawDef =
                (definition && definition[RawDefSymbol]) ||
                cloneRawDefinition(definition);

            const meta = {
                name: className,
                description: definition[v.description] || "",
                parent: parentClass,
                rawDefinition: rawDef,
                normalizedDefinition: definition,
            };

            Object.defineProperty(rawClass, "__meta", {
                get: function () {
                    return this !== rawClass ? undefined : meta;
                },
                enumerable: false,
                configurable: false,
            });

            for (const hook of allocateHooks) {
                hook(rawClass, parentClass, meta);
            }

            return rawClass;
        }
        return {
            allocate,
            allocateHooks,
            instantiateHooks,
            isCloneable,
            cloneValue,
            cloneRawDefinition,
            ensurePrivateVault,
            matchesLineage,
            createFaceted,
            isFacetDescriptor,
            applySlotType,
            PrivateStateRegistry,
            PrivateSymbol,
            RawDefSymbol,
            FacetSymbol,
        };
    })();

    // ==========================================
    // BOOK II: THE GREAT FORGING (Initialization Engine)
    // "The fires are stoked; the raw shapes of reality are hammered into being."
    // ==========================================

    // ------------------------------------------
    // Phase 2: The First Breath (Minimum Artifacts & Class Factory)
    // ------------------------------------------
    function forgeConstructor(definition) {
        const parentClass = definition[v.kindOf] || Object;
        const newClass = Bootstrap.allocate(definition, parentClass);
        const rawDef = newClass.__meta?.rawDefinition || definition;
        Object.defineProperty(newClass, "__private", {
            value: {
                instance: {
                    ...(parentClass.__private?.instance || {}),
                    ...(definition[v.properties]?.private?.instance || {}),
                },
                class: {
                    ...(parentClass.__private?.class || {}),
                    definition: rawDef,
                    ...(definition[v.properties]?.private?.class || {}),
                },
            },
            writable: true,
            configurable: true,
            enumerable: false,
        });
        if (
            definition[v.name] !== "Metaclass" &&
            (!definition[v.kindOf] || definition[v.kindOf] === Object)
        ) {
            Object.setPrototypeOf(newClass, Metaclass.prototype);
        }
        return newClass;
    }

    const metaDef = {
        [v.name]: "Metaclass",
        [v.description]: "The structural blueprint generator.",
        [v.methods]: {
            public: {
                class: {
                    forge: function (definition) {
                        const newClass = forgeConstructor(definition);
                        if (
                            definition[v.name] !== "Metaclass" &&
                            (!definition[v.kindOf] ||
                                definition[v.kindOf] === Object)
                        ) {
                            Object.setPrototypeOf(newClass, this.prototype);
                        }

                        if (definition[v.properties]) {
                            if (typeof newClass.addProperties === "function") {
                                newClass.addProperties(
                                    definition[v.properties],
                                );
                            } else {
                                Metaclass.prototype.addProperties.call(
                                    newClass,
                                    definition[v.properties],
                                );
                            }
                        }

                        if (definition[v.methods]) {
                            if (typeof newClass.addMethods === "function") {
                                newClass.addMethods(definition[v.methods]);
                            } else {
                                Metaclass.prototype.addMethods.call(
                                    newClass,
                                    definition[v.methods],
                                );
                            }
                        }

                        return newClass;
                    },
                },
                instance: {
                    kindOf: function (target) {
                        return !target
                            ? this.__meta?.parent
                            : Bootstrap.matchesLineage(this, target);
                    },
                    addProperties: function (propsObj, ...rest) {
                        if (!propsObj || typeof propsObj !== "object")
                            return this;
                        const overwrite =
                            rest.length > 0 ? Boolean(rest[0]) : true;
                        const classConstructor = this;

                        let p = propsObj;
                        if (
                            !Object.prototype.hasOwnProperty.call(
                                propsObj,
                                "public",
                            ) &&
                            !Object.prototype.hasOwnProperty.call(
                                propsObj,
                                "private",
                            )
                        ) {
                            p = {
                                public: {
                                    instance: propsObj.instance || propsObj,
                                    class: propsObj.class || {},
                                },
                                private: { instance: {}, class: {} },
                            };
                        }

                        for (const key of ["private", "public"]) {
                            if (p[key]?.shared) {
                                p[key].instance = {
                                    ...p[key].shared,
                                    ...(p[key].instance || {}),
                                };
                                p[key].class = {
                                    ...p[key].shared,
                                    ...(p[key].class || {}),
                                };
                            }
                        }

                        classConstructor.__private ??= {
                            instance: {},
                            class: {},
                        };
                        classConstructor.__private.instance ??= {};
                        classConstructor.__private.class ??= {};

                        if (p.private) {
                            if (p.private.instance) {
                                const descriptors =
                                    Object.getOwnPropertyDescriptors(
                                        p.private.instance,
                                    );
                                for (const [k, desc] of Object.entries(
                                    descriptors,
                                )) {
                                    if (
                                        overwrite ||
                                        !Object.prototype.hasOwnProperty.call(
                                            classConstructor.__private.instance,
                                            k,
                                        )
                                    ) {
                                        Object.defineProperty(
                                            classConstructor.__private.instance,
                                            k,
                                            desc,
                                        );
                                    }
                                }
                            }
                            if (p.private.class) {
                                const descriptors =
                                    Object.getOwnPropertyDescriptors(
                                        p.private.class,
                                    );
                                const classSecrets =
                                    Bootstrap.PrivateStateRegistry.get(
                                        classConstructor,
                                    );
                                for (const [k, desc] of Object.entries(
                                    descriptors,
                                )) {
                                    if (
                                        overwrite ||
                                        !Object.prototype.hasOwnProperty.call(
                                            classConstructor.__private.class,
                                            k,
                                        )
                                    ) {
                                        Object.defineProperty(
                                            classConstructor.__private.class,
                                            k,
                                            desc,
                                        );
                                        if (classSecrets) {
                                            Object.defineProperty(
                                                classSecrets,
                                                k,
                                                desc,
                                            );
                                        }
                                    }
                                }
                            }
                        }

                        const installProps = (target, source, isStatic) => {
                            if (!source) return;
                            const descriptors =
                                Object.getOwnPropertyDescriptors(source);

                            for (const [propName, descriptor] of Object.entries(
                                descriptors,
                            )) {
                                classConstructor.__meta.slotSymbols ??= {};
                                classConstructor.__meta.slotFacets ??= {};
                                const existingSlot =
                                    classConstructor.__meta.slotSymbols[
                                        propName
                                    ];
                                if (
                                    !overwrite &&
                                    Object.prototype.hasOwnProperty.call(
                                        target,
                                        propName,
                                    )
                                ) {
                                    continue;
                                }

                                const hasAccessor =
                                    descriptor.get !== undefined ||
                                    descriptor.set !== undefined;
                                const rawVal = descriptor.value;
                                const isInlineFacet =
                                    !hasAccessor &&
                                    Bootstrap.isFacetDescriptor(rawVal);
                                const defaultVal = isInlineFacet
                                    ? fv.init in rawVal
                                        ? rawVal[fv.init]
                                        : fv.value in rawVal
                                          ? rawVal[fv.value]
                                          : rawVal[fv.default]
                                    : rawVal;

                                let inheritedFacets = {};
                                let p = classConstructor.__meta?.parent;
                                while (p && p !== Object) {
                                    if (p.__meta?.slotFacets?.[propName]) {
                                        inheritedFacets = {
                                            ...p.__meta.slotFacets[propName],
                                            ...inheritedFacets,
                                        };
                                    }
                                    p = p.__meta?.parent;
                                }

                                const inlineFacets = {};
                                if (isInlineFacet) {
                                    for (const [semKey, rawFk] of [
                                        ["ifNeeded", fv.ifNeeded],
                                        ["transform", fv.transform],
                                        ["validate", fv.validate],
                                        ["onChange", fv.onChange],
                                        ["type", fv.type],
                                    ]) {
                                        if (rawVal[rawFk] !== undefined) {
                                            inlineFacets[semKey] =
                                                rawVal[rawFk];
                                        }
                                    }
                                }

                                const backingSymbol =
                                    existingSlot?.symbol ||
                                    existingSlot ||
                                    Symbol(`Ouro.slot.${propName}`);
                                const facets = Object.assign(
                                    {},
                                    inheritedFacets,
                                    existingSlot?.facets || {},
                                    classConstructor.__meta.slotFacets[
                                        propName
                                    ] || {},
                                    inlineFacets,
                                );
                                classConstructor.__meta.slotFacets[propName] =
                                    facets;
                                const needsClone =
                                    !isStatic &&
                                    Bootstrap.isCloneable(defaultVal);
                                const slotMetaobject = {
                                    name: propName,
                                    symbol: backingSymbol,
                                    isStatic: Boolean(isStatic),
                                    facets,
                                    get: (recv) => {
                                        if (
                                            needsClone &&
                                            recv !== target &&
                                            !Object.prototype.hasOwnProperty.call(
                                                recv,
                                                backingSymbol,
                                            )
                                        ) {
                                            let cloned =
                                                Bootstrap.cloneValue(
                                                    defaultVal,
                                                );
                                            if (
                                                typeof facets.transform ===
                                                "function"
                                            ) {
                                                cloned = facets.transform.call(
                                                    recv,
                                                    cloned,
                                                    propName,
                                                );
                                            }
                                            recv[backingSymbol] = cloned;
                                        }
                                        if (
                                            recv[backingSymbol] === undefined &&
                                            typeof facets.ifNeeded ===
                                                "function" &&
                                            (isStatic || recv !== target)
                                        ) {
                                            const computed =
                                                facets.ifNeeded.call(
                                                    recv,
                                                    propName,
                                                );
                                            if (computed !== undefined) {
                                                recv[backingSymbol] = computed;
                                            }
                                            return computed;
                                        }
                                        return recv[backingSymbol];
                                    },
                                    set: (recv, val) => {
                                        let nextVal = val;
                                        if (facets.type !== undefined) {
                                            nextVal = Bootstrap.applySlotType(
                                                nextVal,
                                                facets.type,
                                                propName,
                                            );
                                        }
                                        if (
                                            typeof facets.transform ===
                                            "function"
                                        ) {
                                            nextVal = facets.transform.call(
                                                recv,
                                                nextVal,
                                                propName,
                                            );
                                        }
                                        if (
                                            typeof facets.validate ===
                                            "function"
                                        ) {
                                            const valid = facets.validate.call(
                                                recv,
                                                nextVal,
                                                propName,
                                            );
                                            if (valid === false) {
                                                throw new Error(
                                                    `Slot validation failed for '${propName}'`,
                                                );
                                            }
                                        }
                                        const prevVal = recv[backingSymbol];
                                        recv[backingSymbol] = nextVal;
                                        if (
                                            typeof facets.onChange ===
                                            "function"
                                        ) {
                                            facets.onChange.call(
                                                recv,
                                                nextVal,
                                                prevVal,
                                                propName,
                                            );
                                        }
                                        return nextVal;
                                    },
                                };
                                classConstructor.__meta.slotSymbols[propName] =
                                    slotMetaobject;

                                if (
                                    hasAccessor &&
                                    typeof GenericFunction?.defgeneric ===
                                        "function"
                                ) {
                                    if (descriptor.get) {
                                        const primaryGet = (recv) =>
                                            descriptor.get.call(recv);
                                        primaryGet.__originalArity = 0;
                                        GenericFunction.defmethod(
                                            `get:${propName}`,
                                            [classConstructor],
                                            primaryGet,
                                            "primary",
                                            isStatic,
                                        );
                                    }
                                    if (descriptor.set) {
                                        const primarySet = (recv, val) => {
                                            descriptor.set.call(recv, val);
                                            return val;
                                        };
                                        primarySet.__originalArity = 1;
                                        GenericFunction.defmethod(
                                            `set:${propName}`,
                                            [classConstructor],
                                            primarySet,
                                            "primary",
                                            isStatic,
                                        );
                                    }
                                    Object.defineProperty(target, propName, {
                                        get: descriptor.get
                                            ? function () {
                                                  return GenericFunction.defgeneric(
                                                      `get:${propName}`,
                                                  ).dispatch(this);
                                              }
                                            : undefined,
                                        set: descriptor.set
                                            ? function (newVal) {
                                                  return GenericFunction.defgeneric(
                                                      `set:${propName}`,
                                                  ).dispatch(this, newVal);
                                              }
                                            : undefined,
                                        enumerable: true,
                                        configurable: true,
                                    });
                                } else {
                                    Object.defineProperty(target, propName, {
                                        get: function () {
                                            return slotMetaobject.get(this);
                                        },
                                        set: function (val) {
                                            slotMetaobject.set(this, val);
                                        },
                                        enumerable: true,
                                        configurable: true,
                                    });
                                    if (isStatic && defaultVal !== undefined) {
                                        slotMetaobject.set(target, defaultVal);
                                    } else {
                                        target[backingSymbol] = defaultVal;
                                    }
                                }
                            }
                        };

                        if (p.public?.instance)
                            installProps(
                                classConstructor.prototype,
                                p.public.instance,
                                false,
                            );
                        if (p.public?.class)
                            installProps(
                                classConstructor,
                                p.public.class,
                                true,
                            );

                        return classConstructor;
                    },
                    addProperty: function (
                        propName,
                        valueOrDesc,
                        options = {},
                    ) {
                        if (!propName || typeof propName !== "string")
                            return this;
                        const visibility =
                            options.visibility ||
                            (options.private ? "private" : "public");
                        const allocation =
                            options.allocation ||
                            (options.static || options.class
                                ? "class"
                                : options.shared
                                  ? "shared"
                                  : "instance");
                        const overwrite =
                            options.overwrite !== undefined
                                ? Boolean(options.overwrite)
                                : true;
                        const holder = {};
                        if (
                            valueOrDesc &&
                            typeof valueOrDesc === "object" &&
                            ("get" in valueOrDesc || "set" in valueOrDesc) &&
                            Object.keys(valueOrDesc).every((k) =>
                                [
                                    "get",
                                    "set",
                                    "enumerable",
                                    "configurable",
                                ].includes(k),
                            )
                        ) {
                            Object.defineProperty(holder, propName, {
                                get: valueOrDesc.get,
                                set: valueOrDesc.set,
                                enumerable: true,
                                configurable: true,
                            });
                        } else {
                            holder[propName] = valueOrDesc;
                        }
                        if (
                            options.facets &&
                            typeof options.facets === "object"
                        ) {
                            this.__meta.slotFacets ??= {};
                            this.__meta.slotFacets[propName] = {
                                ...(this.__meta.slotFacets[propName] || {}),
                                ...options.facets,
                            };
                        }
                        return this.addProperties(
                            { [visibility]: { [allocation]: holder } },
                            overwrite,
                        );
                    },
                    setSlotFacet: function (propName, facetName, fn) {
                        if (!propName || !facetName) return this;
                        this.__meta.slotFacets ??= {};
                        this.__meta.slotFacets[propName] ??= {};
                        this.__meta.slotFacets[propName][facetName] = fn;
                        const slotObj = this.__meta.slotSymbols?.[propName];
                        if (slotObj && typeof slotObj === "object") {
                            slotObj.facets ??= {};
                            slotObj.facets[facetName] = fn;
                        }
                        return this;
                    },
                    getSlotFacet: function (propName, facetName) {
                        return (
                            this.__meta?.slotFacets?.[propName]?.[facetName] ??
                            this.__meta?.slotSymbols?.[propName]?.facets?.[
                                facetName
                            ]
                        );
                    },
                    addMethod: function (name, fn, options = {}) {
                        if (
                            !name ||
                            typeof name !== "string" ||
                            (typeof fn !== "function" && typeof fn !== "string")
                        )
                            return this;
                        const qualifier = options.qualifier || "primary";
                        const visibility =
                            qualifier !== "primary"
                                ? qualifier
                                : options.visibility ||
                                  (options.private ? "private" : "public");
                        const allocation =
                            options.allocation ||
                            (options.static || options.class
                                ? "class"
                                : options.shared
                                  ? "shared"
                                  : "instance");
                        return this.addMethods({
                            [visibility]: {
                                [allocation]: {
                                    [name]: fn,
                                },
                            },
                        });
                    },
                    addMethods: function (matrixObj) {
                        if (!matrixObj) return this;
                        const classConstructor = this;

                        for (const key of [
                            "private",
                            "public",
                            "before",
                            "after",
                            "around",
                        ]) {
                            if (matrixObj[key]?.shared) {
                                matrixObj[key].instance = {
                                    ...matrixObj[key].shared,
                                    ...(matrixObj[key].instance || {}),
                                };
                                matrixObj[key].class = {
                                    ...matrixObj[key].shared,
                                    ...(matrixObj[key].class || {}),
                                };
                            }
                        }

                        classConstructor.__private ??= {
                            instance: {},
                            class: {},
                        };
                        classConstructor.__private.instance ??= {};
                        classConstructor.__private.class ??= {};

                        if (matrixObj.private) {
                            if (matrixObj.private.instance) {
                                Object.assign(
                                    classConstructor.__private.instance,
                                    matrixObj.private.instance,
                                );
                            }
                            if (matrixObj.private.class) {
                                Object.assign(
                                    classConstructor.__private.class,
                                    matrixObj.private.class,
                                );
                                const classSecrets =
                                    Bootstrap.PrivateStateRegistry.get(
                                        classConstructor,
                                    );
                                if (classSecrets)
                                    Object.assign(
                                        classSecrets,
                                        matrixObj.private.class,
                                    );
                            }
                        }

                        const convertPropertyIfNeeded = (block, isStatic) => {
                            if (!block) return;
                            const target = isStatic
                                ? classConstructor
                                : classConstructor.prototype;

                            for (const propName of Object.keys(block)) {
                                if (
                                    propName.startsWith("get:") ||
                                    propName.startsWith("set:")
                                )
                                    continue;

                                const descriptor =
                                    Object.getOwnPropertyDescriptor(
                                        target,
                                        propName,
                                    );
                                if (
                                    !descriptor ||
                                    typeof descriptor.value === "function"
                                )
                                    continue;

                                const isUpgraded =
                                    GenericFunction._registry?.has(propName) &&
                                    GenericFunction._registry
                                        .get(propName)
                                        .methods.some(
                                            (m) =>
                                                m.qualifier === "primary" &&
                                                m.specializers[0] ===
                                                    classConstructor &&
                                                m.isStatic === isStatic,
                                        );
                                if (isUpgraded) continue;

                                classConstructor.__meta.slotSymbols ??= {};
                                classConstructor.__meta.slotFacets ??= {};
                                const slotObj =
                                    classConstructor.__meta.slotSymbols[
                                        propName
                                    ];
                                if (
                                    slotObj &&
                                    typeof slotObj === "object" &&
                                    slotObj.facets
                                ) {
                                    classConstructor.__meta.slotFacets[
                                        propName
                                    ] = slotObj.facets;
                                }
                                const backingSymbol =
                                    slotObj?.symbol ||
                                    slotObj ||
                                    Symbol(`Ouro.slot.${propName}`);
                                classConstructor.__meta.slotSymbols[propName] =
                                    backingSymbol;

                                const isSlotMetaAccessor = Boolean(
                                    slotObj &&
                                    typeof slotObj === "object" &&
                                    typeof slotObj.get === "function",
                                );
                                const originalGet = descriptor.get;
                                const originalSet = descriptor.set;
                                const hasAccessor =
                                    originalGet !== undefined ||
                                    originalSet !== undefined;
                                const defaultVal = descriptor.value;
                                const needsClone =
                                    !isStatic &&
                                    !hasAccessor &&
                                    Bootstrap.isCloneable(defaultVal);

                                const primaryPropFn = function (recv, val) {
                                    if (arguments.length === 1) {
                                        if (hasAccessor) {
                                            return originalGet
                                                ? originalGet.call(recv)
                                                : undefined;
                                        }
                                        if (
                                            needsClone &&
                                            recv !== target &&
                                            !Object.prototype.hasOwnProperty.call(
                                                recv,
                                                backingSymbol,
                                            )
                                        ) {
                                            recv[backingSymbol] =
                                                Bootstrap.cloneValue(
                                                    defaultVal,
                                                );
                                        }
                                        const facets =
                                            classConstructor.__meta
                                                ?.slotFacets?.[propName];
                                        if (
                                            recv[backingSymbol] === undefined &&
                                            facets &&
                                            typeof facets.ifNeeded ===
                                                "function" &&
                                            (isStatic || recv !== target)
                                        ) {
                                            const computed =
                                                facets.ifNeeded.call(
                                                    recv,
                                                    propName,
                                                );
                                            if (computed !== undefined) {
                                                recv[backingSymbol] = computed;
                                            }
                                            return computed;
                                        }
                                        return recv[backingSymbol];
                                    }
                                    if (isSlotMetaAccessor && originalSet) {
                                        return originalSet.call(recv, val);
                                    }
                                    const facets =
                                        classConstructor.__meta?.slotFacets?.[
                                            propName
                                        ];
                                    let nextVal = val;
                                    if (facets && facets.type !== undefined) {
                                        nextVal = Bootstrap.applySlotType(
                                            nextVal,
                                            facets.type,
                                            propName,
                                        );
                                    }
                                    if (
                                        facets &&
                                        typeof facets.transform === "function"
                                    ) {
                                        nextVal = facets.transform.call(
                                            recv,
                                            nextVal,
                                            propName,
                                        );
                                    }
                                    if (
                                        facets &&
                                        typeof facets.validate === "function"
                                    ) {
                                        const valid = facets.validate.call(
                                            recv,
                                            nextVal,
                                            propName,
                                        );
                                        if (valid === false) {
                                            throw new Error(
                                                `Slot validation failed for '${propName}'`,
                                            );
                                        }
                                    }
                                    const prevVal = recv[backingSymbol];
                                    if (hasAccessor) {
                                        if (originalSet)
                                            originalSet.call(recv, nextVal);
                                    } else {
                                        recv[backingSymbol] = nextVal;
                                    }
                                    if (
                                        facets &&
                                        typeof facets.onChange === "function"
                                    ) {
                                        facets.onChange.call(
                                            recv,
                                            nextVal,
                                            prevVal,
                                            propName,
                                        );
                                    }
                                    return nextVal;
                                };
                                primaryPropFn.__originalArity =
                                    hasAccessor && originalGet && !originalSet
                                        ? 0
                                        : 1;

                                GenericFunction.defmethod(
                                    propName,
                                    [classConstructor],
                                    primaryPropFn,
                                    "primary",
                                    isStatic,
                                );

                                Object.defineProperty(target, propName, {
                                    get: function () {
                                        return GenericFunction.defgeneric(
                                            propName,
                                        ).dispatch(this);
                                    },
                                    set: function (newVal) {
                                        return GenericFunction.defgeneric(
                                            propName,
                                        ).dispatch(this, newVal);
                                    },
                                    enumerable: true,
                                    configurable: true,
                                });

                                if (!hasAccessor)
                                    target[backingSymbol] = descriptor.value;
                            }
                        };

                        for (const q of ["before", "after", "around"]) {
                            convertPropertyIfNeeded(
                                matrixObj[q]?.instance,
                                false,
                            );
                            convertPropertyIfNeeded(matrixObj[q]?.class, true);
                        }

                        const registerMethods = (
                            block,
                            qualifier,
                            isStatic,
                            isPrivate = false,
                        ) => {
                            if (!block) return;
                            for (const [name, fn] of Object.entries(block)) {
                                const target = isStatic
                                    ? classConstructor
                                    : classConstructor.prototype;

                                let isAccessor = false;
                                let currentProto = target;
                                while (
                                    currentProto &&
                                    currentProto !== Object.prototype
                                ) {
                                    const desc =
                                        Object.getOwnPropertyDescriptor(
                                            currentProto,
                                            name,
                                        );
                                    if (desc) {
                                        isAccessor = Boolean(
                                            desc.get || desc.set,
                                        );
                                        break;
                                    }
                                    currentProto =
                                        Object.getPrototypeOf(currentProto);
                                }

                                const closMethod = function (
                                    recv,
                                    ...methodArgs
                                ) {
                                    const actualFn =
                                        typeof fn === "string" ? recv[fn] : fn;
                                    if (typeof actualFn !== "function") return;

                                    let injectSelf = false;
                                    if (isAccessor) {
                                        if (
                                            methodArgs.length === 0 &&
                                            actualFn.length > 0
                                        )
                                            return;
                                        if (actualFn.length === 2)
                                            injectSelf = true;
                                    } else if (
                                        actualFn.length > methodArgs.length
                                    ) {
                                        injectSelf = true;
                                    }

                                    return injectSelf
                                        ? actualFn.apply(recv, [
                                              recv,
                                              ...methodArgs,
                                          ])
                                        : actualFn.apply(recv, methodArgs);
                                };
                                closMethod.__originalArity =
                                    typeof fn === "function" ? fn.length : 0;
                                closMethod.__originalFn = fn;

                                GenericFunction.defmethod(
                                    name,
                                    [classConstructor],
                                    closMethod,
                                    qualifier,
                                    isStatic,
                                );

                                const isBootstrappingCore = [
                                    "GenericFunction",
                                    "Method",
                                ].includes(classConstructor.__meta?.name);
                                const dispatcher = function (...args) {
                                    return GenericFunction.defgeneric(
                                        name,
                                    ).dispatch(this, ...args);
                                };

                                const privTarget = isStatic
                                    ? classConstructor.__private.class
                                    : classConstructor.__private.instance;

                                if (isPrivate) {
                                    privTarget[name] = dispatcher;
                                    if (isStatic) {
                                        const classSecrets =
                                            Bootstrap.PrivateStateRegistry.get(
                                                classConstructor,
                                            );
                                        if (classSecrets)
                                            classSecrets[name] = dispatcher;
                                    }
                                } else if (
                                    !privTarget ||
                                    !Object.prototype.hasOwnProperty.call(
                                        privTarget,
                                        name,
                                    )
                                ) {
                                    if (
                                        isBootstrappingCore &&
                                        qualifier === "primary"
                                    ) {
                                        if (!isAccessor) target[name] = fn;
                                    } else if (!isAccessor) {
                                        Object.defineProperty(target, name, {
                                            value: dispatcher,
                                            writable: true,
                                            configurable: true,
                                            enumerable: false,
                                        });
                                    }
                                }
                            }
                        };

                        for (const [key, qual, isPriv] of [
                            ["private", "primary", true],
                            ["public", "primary", false],
                            ["before", "before", false],
                            ["after", "after", false],
                            ["around", "around", false],
                        ]) {
                            registerMethods(
                                matrixObj[key]?.instance,
                                qual,
                                false,
                                isPriv,
                            );
                            registerMethods(
                                matrixObj[key]?.class,
                                qual,
                                true,
                                isPriv,
                            );
                        }
                        return classConstructor;
                    },
                },
            },
        },
    };

    Metaclass = forgeConstructor(metaDef);
    Object.setPrototypeOf(Metaclass, Metaclass.prototype);
    Metaclass.Private = Bootstrap.PrivateSymbol;
    Metaclass.forge = forgeConstructor;
    Metaclass.forgeConstructor = forgeConstructor;
    Metaclass.bootstrap = {
        allocate: Bootstrap.allocate,
        forgeConstructor,
        allocateHooks: Bootstrap.allocateHooks,
        instantiateHooks: Bootstrap.instantiateHooks,
    };

    Class = function (definition) {
        if (
            definition &&
            typeof definition === "object" &&
            !definition[Bootstrap.RawDefSymbol]
        ) {
            definition[Bootstrap.RawDefSymbol] =
                Bootstrap.cloneRawDefinition(definition);
        }
        const className =
            definition?.[v.name] ||
            (Ouro_API?.VocabularyAliases &&
                Object.keys(definition || {}).reduce((acc, k) => {
                    if (Ouro_API.VocabularyAliases[k] === "name")
                        return definition[k];
                    return acc;
                }, undefined));
        const shouldPublish =
            definition?.publish === true ||
            (definition?.publish !== false &&
                className &&
                className !== "AnonymousClass" &&
                globalThis[className] === undefined);

        const customMetaclass = definition?.[v.kindOf];
        let createdClass;
        if (
            customMetaclass &&
            typeof customMetaclass.forge === "function" &&
            customMetaclass !== Metaclass
        ) {
            createdClass = customMetaclass.forge(definition);
        } else if (GenericFunction?._registry?.has("forge")) {
            createdClass = GenericFunction.defgeneric("forge").dispatch(
                Metaclass,
                definition,
            );
        } else {
            createdClass = Metaclass.forge(definition);
        }

        if (
            shouldPublish &&
            className &&
            typeof Ouro_API?.publish === "function"
        ) {
            Ouro_API.publish(className, createdClass);
        }
        return createdClass;
    };

    // ------------------------------------------
    // Phase 3: The Weaving of Spells (Core Shapes)
    // ------------------------------------------
    Method = Class({
        [v.name]: "Method",
        [v.description]: "The executable aspect payload.",
        [v.methods]: {
            public: {
                instance: {
                    initialize: function (
                        specializers,
                        body,
                        qualifier = "primary",
                        isStatic = undefined,
                    ) {
                        this.specializers = specializers;
                        this.body = body;
                        this.qualifier = qualifier;
                        this.isStatic = isStatic;
                    },
                    getSpecificity: function (args) {
                        return this.specializers.map((spec, i) => {
                            if (spec === "Any" || spec === undefined)
                                return -1000;
                            if (spec === Object) return -500;
                            if (spec === Function) return -400;
                            const arg = args[i];
                            if (arg === spec) return 1000;
                            if (arg === null || arg === undefined) return -900;

                            if (
                                i === 0 &&
                                this.isStatic &&
                                typeof arg === "function"
                            ) {
                                let d = 0;
                                let curr = arg;
                                while (curr && curr !== Object) {
                                    if (curr === spec) return 500 - d;
                                    curr =
                                        curr.__meta?.parent ||
                                        Object.getPrototypeOf(curr);
                                    d++;
                                }
                                return 100;
                            }

                            let d = 0;
                            let curr = arg.constructor;
                            while (curr && curr !== Object) {
                                if (
                                    curr === spec ||
                                    curr.__meta?.nativeParent === spec
                                ) {
                                    return 500 - d;
                                }
                                curr =
                                    curr.__meta?.parent ||
                                    Object.getPrototypeOf(curr.prototype || {})
                                        ?.constructor;
                                d++;
                            }
                            return 100;
                        });
                    },
                    isApplicable: function (args) {
                        if (args.length === 0) return false;
                        const isReceiverClass = typeof args[0] === "function";

                        return this.specializers.every((spec, i) => {
                            if (spec === "Any" || spec === undefined)
                                return true;
                            const arg = args[i];

                            if (spec === Object) {
                                return !(
                                    i === 0 &&
                                    this.isStatic === false &&
                                    isReceiverClass
                                );
                            }

                            if (arg === spec) {
                                if (
                                    i === 0 &&
                                    this.isStatic === false &&
                                    isReceiverClass
                                ) {
                                    return (
                                        spec === Metaclass ||
                                        arg.constructor === spec ||
                                        Boolean(
                                            arg.constructor
                                                ?.prototype instanceof spec,
                                        )
                                    );
                                }
                                return true;
                            }

                            if (arg === null || arg === undefined) return false;

                            if (i === 0 && typeof this.isStatic === "boolean") {
                                if (this.isStatic) {
                                    return (
                                        isReceiverClass &&
                                        Boolean(arg.prototype instanceof spec)
                                    );
                                }
                                if (isReceiverClass) {
                                    return (
                                        spec === Metaclass ||
                                        arg.constructor === spec ||
                                        Boolean(
                                            arg.constructor
                                                ?.prototype instanceof spec,
                                        )
                                    );
                                }
                                return (
                                    arg.constructor === spec ||
                                    arg instanceof spec
                                );
                            }

                            return (
                                arg.constructor === spec ||
                                arg instanceof spec ||
                                (spec === Function && isReceiverClass)
                            );
                        });
                    },
                },
            },
        },
    });

    GenericFunction = Class({
        [v.name]: "GenericFunction",
        [v.description]: "The AOP method router.",
        [v.methods]: {
            public: {
                class: {
                    defgeneric: function (name) {
                        if (!this._registry.has(name)) {
                            this._registry.set(name, new GenericFunction(name));
                        }
                        return this._registry.get(name);
                    },
                    defmethod: function (
                        name,
                        specializers,
                        body,
                        qualifier = "primary",
                        isStatic = undefined,
                    ) {
                        const gf = this.defgeneric(name);
                        gf.methods.unshift(
                            new Method(specializers, body, qualifier, isStatic),
                        );
                        return gf;
                    },
                },
                instance: {
                    initialize: function (name) {
                        this.name = name;
                        this.methods = [];
                    },
                    removeMethod: function (qualifier, specializer) {
                        this.methods = this.methods.filter(
                            (m) =>
                                !(
                                    m.qualifier === qualifier &&
                                    m.specializers.includes(specializer)
                                ),
                        );
                        return this;
                    },
                    dispatch: function (...args) {
                        const primaries = [];
                        const befores = [];
                        const afters = [];
                        const arounds = [];

                        for (
                            let i = 0, len = this.methods.length;
                            i < len;
                            i++
                        ) {
                            const m = this.methods[i];
                            if (m.isApplicable(args)) {
                                if (m.qualifier === "primary")
                                    primaries.push(m);
                                else if (m.qualifier === "before")
                                    befores.push(m);
                                else if (m.qualifier === "after")
                                    afters.push(m);
                                else if (m.qualifier === "around")
                                    arounds.push(m);
                            }
                        }

                        if (primaries.length === 0) {
                            if (
                                befores.length === 0 &&
                                afters.length === 0 &&
                                arounds.length === 0
                            ) {
                                throw new Error(
                                    `No applicable method found for '${this.name}'`,
                                );
                            }
                            throw new Error(
                                `No primary method available for '${this.name}'`,
                            );
                        }

                        if (primaries.length > 1) {
                            const compareSpec = (a, b) => {
                                const sa = a.getSpecificity(args);
                                const sb = b.getSpecificity(args);
                                const len = Math.max(sa.length, sb.length);
                                for (let i = 0; i < len; i++) {
                                    const va = sa[i] ?? -1000;
                                    const vb = sb[i] ?? -1000;
                                    if (va !== vb) return vb - va;
                                }
                                return 0;
                            };
                            primaries.sort(compareSpec);
                        }

                        const primary = primaries[0];
                        const rawContext = args.length > 0 ? args[0] : null;

                        if (
                            rawContext &&
                            (typeof rawContext === "object" ||
                                typeof rawContext === "function")
                        ) {
                            if (!rawContext.__mop_dispatch_stack) {
                                Object.defineProperty(
                                    rawContext,
                                    "__mop_dispatch_stack",
                                    {
                                        value: new Set(),
                                        configurable: true,
                                        enumerable: false,
                                    },
                                );
                            }
                            if (
                                rawContext.__mop_dispatch_stack.has(
                                    this.name,
                                ) &&
                                this.name !== "ensure"
                            ) {
                                return primary.body.apply(rawContext, args);
                            }
                            rawContext.__mop_dispatch_stack.add(this.name);
                        }

                        let mountedHere = false;
                        const mountedKeys = [];

                        const isClassContext =
                            rawContext &&
                            typeof rawContext === "function" &&
                            rawContext.__meta;
                        const privBlueprint = isClassContext
                            ? rawContext.__private?.class
                            : rawContext?.constructor?.__private?.instance;
                        const privKeys = privBlueprint
                            ? Object.keys(privBlueprint)
                            : [];

                        if (
                            privKeys.length > 0 &&
                            rawContext &&
                            !Object.prototype.hasOwnProperty.call(
                                rawContext,
                                "__mop_executing",
                            )
                        ) {
                            const secrets = Bootstrap.ensurePrivateVault(
                                rawContext,
                                privBlueprint,
                            );
                            mountedHere = true;
                            Object.defineProperty(
                                rawContext,
                                "__mop_executing",
                                {
                                    value: true,
                                    configurable: true,
                                    enumerable: false,
                                },
                            );
                            for (let i = 0; i < privKeys.length; i++) {
                                const key = privKeys[i];
                                if (
                                    !Object.prototype.hasOwnProperty.call(
                                        rawContext,
                                        key,
                                    )
                                ) {
                                    Object.defineProperty(rawContext, key, {
                                        get: () => secrets[key],
                                        set: (val) => {
                                            secrets[key] = val;
                                        },
                                        configurable: true,
                                        enumerable: false,
                                    });
                                    mountedKeys.push(key);
                                }
                            }
                        }

                        const teardown = () => {
                            if (rawContext && rawContext.__mop_dispatch_stack) {
                                rawContext.__mop_dispatch_stack.delete(
                                    this.name,
                                );
                            }
                            if (mountedHere) {
                                delete rawContext.__mop_executing;
                                for (let i = 0; i < mountedKeys.length; i++) {
                                    delete rawContext[mountedKeys[i]];
                                }
                            }
                        };

                        // Fast-path: unadvised single-primary method
                        if (
                            arounds.length === 0 &&
                            befores.length === 0 &&
                            afters.length === 0 &&
                            primaries.length === 1
                        ) {
                            try {
                                const fastResult = primary.body.apply(
                                    rawContext,
                                    args,
                                );
                                if (
                                    fastResult &&
                                    typeof fastResult.then === "function"
                                ) {
                                    return fastResult.then(
                                        (res) => {
                                            teardown();
                                            return res;
                                        },
                                        (err) => {
                                            teardown();
                                            throw err;
                                        },
                                    );
                                }
                                teardown();
                                return fastResult;
                            } catch (err) {
                                teardown();
                                throw err;
                            }
                        }

                        const invokePrimaryChain = (pIndex, activeArgs) => {
                            const currentPrimary = primaries[pIndex];
                            if (!currentPrimary) return undefined;
                            if (pIndex + 1 >= primaries.length) {
                                return currentPrimary.body.apply(
                                    rawContext,
                                    activeArgs,
                                );
                            }

                            const hasExistingInner =
                                Object.prototype.hasOwnProperty.call(
                                    rawContext,
                                    "inner",
                                );
                            const originalInner = rawContext.inner;
                            rawContext.inner = (...superArgs) =>
                                invokePrimaryChain(
                                    pIndex + 1,
                                    superArgs.length > 0
                                        ? [rawContext, ...superArgs]
                                        : activeArgs,
                                );

                            let res;
                            try {
                                res = currentPrimary.body.apply(
                                    rawContext,
                                    activeArgs,
                                );
                            } catch (e) {
                                if (!hasExistingInner) delete rawContext.inner;
                                else rawContext.inner = originalInner;
                                throw e;
                            }

                            if (res && typeof res.then === "function") {
                                return res.then(
                                    (v) => {
                                        if (!hasExistingInner)
                                            delete rawContext.inner;
                                        else rawContext.inner = originalInner;
                                        return v;
                                    },
                                    (e) => {
                                        if (!hasExistingInner)
                                            delete rawContext.inner;
                                        else rawContext.inner = originalInner;
                                        throw e;
                                    },
                                );
                            }
                            if (!hasExistingInner) delete rawContext.inner;
                            else rawContext.inner = originalInner;
                            return res;
                        };

                        const executeCore = (...innerArgs) => {
                            const activeArgs =
                                innerArgs.length > 0
                                    ? [rawContext, ...innerArgs]
                                    : args;

                            const runBefores = (index) => {
                                while (index < befores.length) {
                                    const res = befores[index].body.apply(
                                        rawContext,
                                        activeArgs,
                                    );
                                    if (res && typeof res.then === "function")
                                        return res.then(() =>
                                            runBefores(index + 1),
                                        );
                                    index++;
                                }
                                return invokePrimaryChain(0, activeArgs);
                            };

                            return runBefores(0);
                        };

                        const executeAroundChain = (index) => {
                            if (index >= arounds.length) return executeCore;
                            return (...innerArgs) => {
                                const activeArgs =
                                    innerArgs.length > 0
                                        ? [rawContext, ...innerArgs]
                                        : args;
                                const hasExistingInner =
                                    Object.prototype.hasOwnProperty.call(
                                        rawContext,
                                        "inner",
                                    );
                                const originalInner = rawContext.inner;

                                rawContext.inner = executeAroundChain(
                                    index + 1,
                                );

                                let res;
                                try {
                                    res = arounds[index].body.apply(
                                        rawContext,
                                        activeArgs,
                                    );
                                } catch (e) {
                                    if (!hasExistingInner)
                                        delete rawContext.inner;
                                    else rawContext.inner = originalInner;
                                    throw e;
                                }

                                if (res && typeof res.then === "function") {
                                    return res.then(
                                        (v) => {
                                            if (!hasExistingInner)
                                                delete rawContext.inner;
                                            else
                                                rawContext.inner =
                                                    originalInner;
                                            return v;
                                        },
                                        (e) => {
                                            if (!hasExistingInner)
                                                delete rawContext.inner;
                                            else
                                                rawContext.inner =
                                                    originalInner;
                                            throw e;
                                        },
                                    );
                                } else {
                                    if (!hasExistingInner)
                                        delete rawContext.inner;
                                    else rawContext.inner = originalInner;
                                    return res;
                                }
                            };
                        };

                        const runAfters = (index, finalResult) => {
                            while (index >= 0) {
                                const res = afters[index].body.apply(
                                    rawContext,
                                    args,
                                );
                                if (res && typeof res.then === "function") {
                                    return res.then(() =>
                                        runAfters(index - 1, finalResult),
                                    );
                                }
                                index--;
                            }
                            return finalResult;
                        };

                        try {
                            let dispatchResult = executeAroundChain(0)();

                            if (
                                dispatchResult &&
                                typeof dispatchResult.then === "function"
                            ) {
                                return dispatchResult.then(
                                    (res) => {
                                        const afterResult = runAfters(
                                            afters.length - 1,
                                            res,
                                        );
                                        if (
                                            afterResult &&
                                            typeof afterResult.then ===
                                                "function"
                                        ) {
                                            return afterResult.then((final) => {
                                                teardown();
                                                return final;
                                            });
                                        }
                                        teardown();
                                        return afterResult;
                                    },
                                    (err) => {
                                        teardown();
                                        throw err;
                                    },
                                );
                            }

                            const afterResult = runAfters(
                                afters.length - 1,
                                dispatchResult,
                            );
                            if (
                                afterResult &&
                                typeof afterResult.then === "function"
                            ) {
                                return afterResult.then((final) => {
                                    teardown();
                                    return final;
                                });
                            }
                            teardown();
                            return afterResult;
                        } catch (err) {
                            teardown();
                            throw err;
                        }
                    },
                },
            },
        },
    });

    // ------------------------------------------
    // Phase 4: The Bridging (Igniting the Router)
    // ------------------------------------------
    GenericFunction._registry = new Map();
    [Method, GenericFunction, Metaclass].forEach((coreObj) => {
        const pub = coreObj.__private.class.definition[v.methods].public;
        if (pub.class) Object.assign(coreObj, pub.class);
        if (pub.instance) {
            for (const [k, fn] of Object.entries(pub.instance)) {
                Object.defineProperty(coreObj.prototype, k, {
                    value: fn,
                    writable: true,
                    configurable: true,
                    enumerable: false,
                });
            }
        }
    });
    [Metaclass, GenericFunction, Method].forEach((coreObj) => {
        coreObj.addMethods(coreObj.__private.class.definition[v.methods]);
    });

    // ------------------------------------------
    // Phase 5: The Transmutation (Extensions as Pure Classes)
    // ------------------------------------------
    Extension = Class({
        [v.name]: "Extension",
        [v.description]:
            "Fault-tolerant wrapper for OURO framework extensions.",
        [v.properties]: {
            public: {
                class: { registry: new Set() },
                instance: {
                    name: "",
                    description: "",
                    extension: null,
                    unloader: null,
                },
            },
            private: { instance: { isLoaded: false } },
        },
        [v.methods]: {
            public: {
                class: {
                    all: function () {
                        return Array.from(this.registry).filter(
                            (e) => e.constructor === this,
                        );
                    },
                    find: function (name) {
                        return this.all().find((e) => e.name === name) || null;
                    },
                },
                instance: {
                    initialize: function (
                        name,
                        description,
                        extFn,
                        uFn = null,
                    ) {
                        this.name = name;
                        this.description = description;
                        this.extension = extFn;
                        this.unloader = uFn;
                        this.isLoaded = false;
                        this.constructor.registry.add(this);
                    },
                    load: function (force = false) {
                        if (force && this.isLoaded) this.unload();
                        if (this.isLoaded) return;
                        try {
                            if (typeof this.extension === "function")
                                this.extension();
                            this.isLoaded = true;
                            console.log(
                                `[OURO] Extension Loaded: ${this.name}`,
                            );
                        } catch (e) {
                            console.error(
                                `[OURO] Ext Load FAIL: ${this.name}`,
                                e,
                            );
                        }
                    },
                    unload: function () {
                        if (!this.isLoaded) return;
                        try {
                            if (typeof this.unloader === "function")
                                this.unloader();
                        } finally {
                            this.isLoaded = false;
                        }
                    },
                },
            },
        },
    });

    ExtensionPackage = Class({
        [v.name]: "ExtensionPackage",
        [v.kindOf]: Extension,
        [v.description]: "Package container for multiple extensions.",
        [v.properties]: { public: { instance: { extensions: [] } } },
        [v.methods]: {
            public: {
                instance: {
                    initialize: function (
                        name,
                        description,
                        initialExtensions = [],
                    ) {
                        this.name = name;
                        this.description = description;
                        this.extensions = [...initialExtensions];
                        this.isLoaded = false;
                        Extension.registry.add(this);
                    },
                    add: function (ext) {
                        if (!this.extensions.includes(ext))
                            this.extensions.push(ext);
                        return this;
                    },
                    remove: function (ext) {
                        this.extensions = this.extensions.filter(
                            (e) => e !== ext,
                        );
                        return this;
                    },
                    load: function (force = false) {
                        if (this.isLoaded && !force) return;
                        console.log(
                            `[OURO Package] Loading Package: ${this.name}`,
                        );
                        for (const ext of this.extensions)
                            if (ext && typeof ext.load === "function")
                                ext.load(force);
                        this.isLoaded = true;
                    },
                    unload: function () {
                        if (!this.isLoaded) return;
                        console.log(
                            `[OURO Package] Unloading Package: ${this.name}`,
                        );
                        for (const ext of [...this.extensions].reverse())
                            if (ext && typeof ext.unload === "function")
                                ext.unload();
                        this.isLoaded = false;
                    },
                },
            },
        },
    });

    // ==========================================
    // BOOK III: THE GATEWAY (The Loader API)
    // "The portal through which mortals command the engine."
    // ==========================================
    const exportTargets = new Set();

    Ouro_API = {
        version: VERSION,
        Vocabulary,
        Lexicon: new Set(),
        get Extension() {
            return Extension;
        },
        get ExtensionPackage() {
            return ExtensionPackage;
        },

        publish: function (name, reference) {
            if (name && typeof name === "object") {
                for (const [k, val] of Object.entries(name)) {
                    this.publish(k, val);
                }
                return name;
            }
            globalThis[name] = reference;
            this.Lexicon.add(name);
            for (const target of exportTargets) {
                target[name] = reference;
            }
            return reference;
        },

        load: function (target) {
            if (!isLoaded) {
                isLoaded = true;
            }
            if (target === undefined) target = Extension.all();
            const forceReload = arguments.length > 1 ? arguments[1] : false;

            if (Array.isArray(target)) {
                target.forEach((t) => Ouro_API.load(t, forceReload));
                return Metaclass;
            }

            const extTarget =
                typeof target === "string" ? Extension.find(target) : target;
            if (extTarget && typeof extTarget.load === "function")
                extTarget.load(forceReload);
            else
                console.warn(
                    "Ouro.load: Invalid extension target provided.",
                    target,
                );

            return Metaclass;
        },

        get boros() {
            return this.load();
        },

        exportTo: function (targetContext) {
            if (!targetContext) return this;
            exportTargets.add(targetContext);
            targetContext.Ouro = this;
            for (const sym of this.Lexicon)
                if (globalThis[sym] !== undefined)
                    targetContext[sym] = globalThis[sym];
            return this;
        },
    };

    // Expose True Shapes to the Mortal Realm
    Ouro_API.FacetVocabulary = FacetVocabulary;
    Ouro_API.faceted = Bootstrap.createFaceted;
    Ouro_API.facetted = Bootstrap.createFaceted;
    Ouro_API.facet = Bootstrap.createFaceted;
    Ouro_API.publish("Class", Class);
    Ouro_API.publish("Metaclass", Metaclass);
    Ouro_API.publish("GenericFunction", GenericFunction);
    Ouro_API.publish("Method", Method);
    Ouro_API.publish("Extension", Extension);
    Ouro_API.publish("ExtensionPackage", ExtensionPackage);
    Ouro_API.publish("faceted", Bootstrap.createFaceted);
    Ouro_API.publish("facetted", Bootstrap.createFaceted);
    Ouro_API.publish("facet", Bootstrap.createFaceted);

    console.info(
        "\n" +
            banner.replace(/vx\.y\.z\s*/, (m) =>
                `v${VERSION}`.padEnd(m.length, " "),
            ) +
            "\n",
    );

    return Ouro_API;
})();

// END OURO CORE

// START COMMON EXTENSIONS

// ==========================================
// BOOK IV: THE REALM OF MEN (Domain Logic & Extensions)
// "Where the gods rest and mortals build their kingdoms."
// ==========================================

// 1. Syntax DX Helpers
Ouro.syntaxDXExtension = new Ouro.Extension(
    "Syntax DX Helpers",
    "Provides tooling for protected keyword registries, DSL vocabulary extensions, sample/native class converters, and forward-declaration tracking.",
    function () {
        const v = Ouro.Vocabulary;
        Ouro.ReservedKeys = new Set(Object.values(Ouro.Vocabulary));
        Ouro.VocabularyAliases = {};
        for (const [semKey, canonVal] of Object.entries(Ouro.Vocabulary)) {
            Ouro.VocabularyAliases[canonVal] = semKey;
        }
        Ouro.extendVocabulary = function (semanticKey, ...stringLiterals) {
            if (
                Ouro.Vocabulary[semanticKey] &&
                !Ouro.VocabularyAliases[Ouro.Vocabulary[semanticKey]]
            ) {
                Ouro.VocabularyAliases[Ouro.Vocabulary[semanticKey]] =
                    semanticKey;
            }
            for (const lit of stringLiterals) {
                if (!lit || typeof lit !== "string") continue;
                Ouro.VocabularyAliases[lit] = semanticKey;
                Ouro.ReservedKeys.add(lit);
                if (!Ouro.Vocabulary[semanticKey]) {
                    Ouro.Vocabulary[semanticKey] = lit;
                }
            }
            return Ouro.Vocabulary;
        };

        // #10: Forward-Declared / Scaffolded Properties & Methods Registry
        Ouro.forward = Symbol.for("Ouro.forward");
        Ouro.publish("Forward", Ouro.forward);
        Ouro.extendVocabulary("requires", "requires");

        const NATIVE_STATIC_SKIP = new Set([
            "length",
            "name",
            "arguments",
            "caller",
            "prototype",
            "__meta",
            "__private",
            "__mop_dispatch_stack",
        ]);

        // #2: Sample Object to Minimal Class Conversion
        const fromSample = function (sampleObj, nameOrOptions = "SampleClass") {
            if (!sampleObj || typeof sampleObj !== "object") {
                throw new Error(
                    "Class.fromSample requires a non-null sample object.",
                );
            }
            const opts =
                typeof nameOrOptions === "string"
                    ? { name: nameOrOptions }
                    : nameOrOptions || {};
            const className = opts.name || "SampleClass";
            const preserveValues = Boolean(opts.preserveValues);

            const props = {};
            const methods = {};
            const descriptors = Object.getOwnPropertyDescriptors(sampleObj);

            for (const [key, desc] of Object.entries(descriptors)) {
                if (desc.get || desc.set) {
                    Object.defineProperty(props, key, desc);
                } else if (typeof desc.value === "function") {
                    methods[key] = desc.value;
                } else {
                    const val = desc.value;
                    if (preserveValues) {
                        props[key] = Array.isArray(val)
                            ? [...val]
                            : val &&
                                typeof val === "object" &&
                                Object.getPrototypeOf(val) === Object.prototype
                              ? { ...val }
                              : val;
                    } else if (Array.isArray(val)) {
                        props[key] = [];
                    } else if (
                        val !== null &&
                        typeof val === "object" &&
                        Object.getPrototypeOf(val) === Object.prototype
                    ) {
                        props[key] = {};
                    } else if (typeof val === "string") {
                        props[key] = "";
                    } else if (typeof val === "number") {
                        props[key] = 0;
                    } else if (typeof val === "boolean") {
                        props[key] = false;
                    } else {
                        props[key] = null;
                    }
                }
            }

            if (!methods.initialize) {
                methods.initialize = function (initData = {}) {
                    if (initData && typeof initData === "object") {
                        for (const [k, val] of Object.entries(initData)) {
                            if (
                                k in this ||
                                Object.prototype.hasOwnProperty.call(props, k)
                            ) {
                                this[k] = val;
                            }
                        }
                    }
                };
            }

            return globalThis.Class({
                [v.name]: className,
                [v.description]:
                    opts.description ||
                    `Auto-generated class from sample object (${className}).`,
                [v.kindOf]: opts.kindOf || Object,
                [v.properties]: { public: { instance: props, class: {} } },
                [v.methods]: { public: { instance: methods, class: {} } },
            });
        };

        // #3: Native JS Class to Ouro Managed Class Conversion
        const fromClass = function (NativeClass, overrides = {}) {
            if (typeof NativeClass !== "function") {
                throw new Error(
                    "Class.fromClass requires a constructor or class.",
                );
            }
            if (NativeClass.__meta) {
                return globalThis.Class({
                    ...overrides,
                    [v.name]:
                        overrides[v.name] ||
                        overrides.name ||
                        `${NativeClass.__meta.name}Sub`,
                    [v.kindOf]: NativeClass,
                });
            }

            const className =
                overrides[v.name] ||
                overrides.name ||
                NativeClass.name ||
                "ConvertedClass";
            const isExoticNative =
                Boolean(overrides.delegate) ||
                /\[native code\]/.test(
                    Function.prototype.toString.call(NativeClass),
                );

            if (
                isExoticNative &&
                globalThis.Trait &&
                typeof globalThis.Trait.native === "function"
            ) {
                const stateName = overrides.state || "native";
                const privateKey = `_${stateName}Object`;
                const nativeTrait = globalThis.Trait.native(NativeClass, {
                    state: stateName,
                    only: overrides.only,
                    alias: overrides.alias,
                });
                const def = {
                    ...overrides,
                    [v.name]: className,
                    traits: [...(overrides.traits || []), nativeTrait],
                };
                delete def.delegate;
                delete def.state;
                delete def.only;
                delete def.alias;
                if (
                    !def.initialize &&
                    !def[v.methods]?.public?.instance?.initialize
                ) {
                    def.initialize = function (...args) {
                        if (
                            args.length === 1 &&
                            args[0] instanceof NativeClass
                        ) {
                            this[privateKey] = args[0];
                        } else if (args.length > 0) {
                            try {
                                this[privateKey] = new NativeClass(...args);
                            } catch (e) {
                                this[privateKey] = args[0];
                            }
                        }
                    };
                }
                return globalThis.Class(def);
            }

            const instProps = {};
            const instMethods = {};
            const classProps = {};
            const classMethods = {};

            // Harvest prototype chain up to Object.prototype
            const seenProtoKeys = new Set(["constructor"]);
            let currProto = NativeClass.prototype;
            while (currProto && currProto !== Object.prototype) {
                const protoDescs = Object.getOwnPropertyDescriptors(currProto);
                for (const [k, desc] of Object.entries(protoDescs)) {
                    if (seenProtoKeys.has(k)) continue;
                    seenProtoKeys.add(k);
                    if (desc.get || desc.set) {
                        Object.defineProperty(instProps, k, {
                            get: desc.get,
                            set: desc.set,
                            enumerable: true,
                            configurable: true,
                        });
                    } else if (typeof desc.value === "function") {
                        instMethods[k] = desc.value;
                    } else {
                        instProps[k] = desc.value;
                    }
                }
                currProto = Object.getPrototypeOf(currProto);
            }

            // Harvest static members on NativeClass
            const staticDescs = Object.getOwnPropertyDescriptors(NativeClass);
            for (const [k, desc] of Object.entries(staticDescs)) {
                if (NATIVE_STATIC_SKIP.has(k)) continue;
                if (desc.get || desc.set) {
                    Object.defineProperty(classProps, k, {
                        get: desc.get,
                        set: desc.set,
                        enumerable: true,
                        configurable: true,
                    });
                } else if (typeof desc.value === "function") {
                    classMethods[k] = desc.value;
                } else {
                    classProps[k] = desc.value;
                }
            }

            if (!instMethods.initialize) {
                instMethods.initialize = function (...args) {
                    try {
                        const sample = Reflect.construct(NativeClass, args);
                        for (const [k, val] of Object.entries(sample)) {
                            this[k] = val;
                        }
                    } catch (e) {
                        try {
                            NativeClass.apply(this, args);
                        } catch (_) {}
                    }
                };
            }

            const baseClass = globalThis.Class({
                publish: overrides.publish,
                [v.name]: className,
                [v.description]:
                    overrides[v.description] ||
                    overrides.description ||
                    `Converted Ouro class from ${NativeClass.name || "native class"}.`,
                [v.kindOf]: overrides[v.kindOf] || overrides.kindOf || Object,
                [v.properties]: {
                    public: { instance: instProps, class: classProps },
                    private: { instance: {}, class: {} },
                },
                [v.methods]: {
                    public: { instance: instMethods, class: classMethods },
                    private: { instance: {}, class: {} },
                },
            });

            if (baseClass.__meta) {
                baseClass.__meta.nativeParent = NativeClass;
            }
            if (
                NativeClass.prototype &&
                !overrides[v.kindOf] &&
                !overrides.kindOf
            ) {
                Object.setPrototypeOf(
                    baseClass.prototype,
                    NativeClass.prototype,
                );
            }

            const extraKeys = Object.keys(overrides).filter(
                (k) =>
                    ![
                        v.name,
                        "name",
                        v.description,
                        "description",
                        v.kindOf,
                        "kindOf",
                        "publish",
                    ].includes(k),
            );
            if (extraKeys.length > 0) {
                const extraDef = {};
                for (const k of extraKeys) {
                    Object.defineProperty(
                        extraDef,
                        k,
                        Object.getOwnPropertyDescriptor(overrides, k),
                    );
                }
                if (typeof Ouro.normalizeMatrix === "function") {
                    Ouro.normalizeMatrix(extraDef);
                    baseClass.addProperties(extraDef[v.properties]);
                    baseClass.addMethods(extraDef[v.methods]);
                }
            }

            return baseClass;
        };

        Ouro.fromSample = fromSample;
        Ouro.fromClass = fromClass;
        if (globalThis.Class) {
            globalThis.Class.fromSample = fromSample;
            globalThis.Class.fromClass = fromClass;
        }
    },
);

// 2. Schema Normalizer Extension
Ouro.schemaNormalizerExtension = new Ouro.Extension(
    "Class & Trait Schema Normalizer",
    "Extracts the normalization algorithm for global framework use, and applies it to Metaclass.forge, addProperties, addMethods, and Trait initialization.",
    function () {
        const v = Ouro.Vocabulary;

        const isAlreadyStrictProperties = (obj) => {
            if (!obj || typeof obj !== "object") return false;
            const keys = Object.keys(obj);
            if (keys.length === 0) return false;
            return (
                keys.every((k) => k === "public" || k === "private") &&
                keys.some(
                    (k) =>
                        obj[k] &&
                        typeof obj[k] === "object" &&
                        ("instance" in obj[k] || "class" in obj[k]),
                )
            );
        };

        const isAlreadyStrictMethods = (obj) => {
            if (!obj || typeof obj !== "object") return false;
            const keys = Object.keys(obj);
            if (keys.length === 0) return false;
            const validTop = ["public", "private", "before", "after", "around"];
            return (
                keys.every((k) => validTop.includes(k)) &&
                keys.every((k) => {
                    const sub = obj[k];
                    if (sub === undefined) return true;
                    if (!sub || typeof sub !== "object") return false;
                    return Object.keys(sub).every(
                        (ak) => ak === "instance" || ak === "class",
                    );
                })
            );
        };

        const resolveVocabKey = (k) => {
            const semKey = Ouro.VocabularyAliases?.[k];
            if (semKey && Ouro.Vocabulary[semKey]) {
                return Ouro.Vocabulary[semKey];
            }
            return k;
        };

        Ouro.normalizeMatrix = function (
            d,
            additionalSkips = [],
            defaultSection = null,
        ) {
            if (!d || typeof d !== "object") return d;

            if (defaultSection === null && Ouro.VocabularyAliases) {
                for (const k of Object.getOwnPropertyNames(d)) {
                    const canon = resolveVocabKey(k);
                    if (
                        canon !== k &&
                        canon !== v.properties &&
                        canon !== v.methods
                    ) {
                        if (d[canon] === undefined) {
                            d[canon] = d[k];
                        }
                        delete d[k];
                    }
                }
            }

            const strict = Object.fromEntries(
                Object.entries(Ouro.Vocabulary).map(([key, localizedKey]) => {
                    if (key === "properties") {
                        return [
                            localizedKey,
                            {
                                public: { instance: {}, class: {} },
                                private: { instance: {}, class: {} },
                            },
                        ];
                    } else if (key === "methods") {
                        return [
                            localizedKey,
                            {
                                public: { instance: {}, class: {} },
                                private: { instance: {}, class: {} },
                                before: { instance: {}, class: {} },
                                after: { instance: {}, class: {} },
                                around: { instance: {}, class: {} },
                            },
                        ];
                    } else {
                        return [localizedKey, d[localizedKey]];
                    }
                }),
            );

            additionalSkips.forEach((skipKey) => {
                if (d[skipKey] !== undefined) {
                    strict[skipKey] = d[skipKey];
                }
            });

            const topLevelSkips = [
                v.name,
                v.description,
                v.kindOf,
                v.traits,
                v.requires || "requires",
                ...additionalSkips,
            ];

            const structuralKeys = [
                "public",
                "private",
                "instance",
                "class",
                "shared",
                "before",
                "after",
                "around",
                v.properties,
                v.methods,
            ];

            const rootContext = {
                section: defaultSection,
                visibility: "public",
                allocation: "instance",
                qualifier: "primary",
            };

            const getAllocations = (alloc) =>
                alloc === "shared" ? ["instance", "class"] : [alloc];

            const walk = (node, context = rootContext) => {
                if (node === null || typeof node !== "object") return;

                for (const rawKey of Object.getOwnPropertyNames(node)) {
                    const resolved = resolveVocabKey(rawKey);
                    const key =
                        resolved === v.properties || resolved === v.methods
                            ? resolved
                            : rawKey;

                    if (
                        defaultSection === null &&
                        context === rootContext &&
                        topLevelSkips.includes(resolved)
                    )
                        continue;

                    const descriptor = Object.getOwnPropertyDescriptor(
                        node,
                        rawKey,
                    );
                    const isAccessor =
                        descriptor &&
                        (descriptor.get !== undefined ||
                            descriptor.set !== undefined);
                    const val = isAccessor ? null : node[rawKey];

                    if (
                        !isAccessor &&
                        val === undefined &&
                        structuralKeys.includes(key)
                    ) {
                        continue;
                    }

                    if (
                        structuralKeys.includes(key) &&
                        !isAccessor &&
                        val !== null &&
                        typeof val === "object" &&
                        Object.getPrototypeOf(val) === Object.prototype
                    ) {
                        const nextContext = { ...context };
                        if (key === v.properties || key === v.methods)
                            nextContext.section = key;
                        else if (key === "public" || key === "private")
                            nextContext.visibility = key;
                        else if (
                            key === "instance" ||
                            key === "class" ||
                            key === "shared"
                        )
                            nextContext.allocation = key;
                        else if (["before", "after", "around"].includes(key)) {
                            nextContext.section = v.methods;
                            nextContext.qualifier = key;
                            if (
                                context.allocation !== "class" &&
                                context.allocation !== "shared"
                            ) {
                                nextContext.allocation = "instance";
                            }
                        }
                        walk(val, nextContext);
                        continue;
                    }

                    const isClassValue =
                        typeof val === "function" &&
                        (Boolean(val.__meta) ||
                            /^class\s/.test(
                                Function.prototype.toString.call(val),
                            ));

                    const isMethod =
                        !isAccessor &&
                        !isClassValue &&
                        context.section !== v.properties &&
                        (context.section === v.methods ||
                            (context.section === null &&
                                typeof val === "function"));

                    for (const alloc of getAllocations(context.allocation)) {
                        if (isAccessor) {
                            const targetProps =
                                strict[v.properties][context.visibility][alloc];
                            Object.defineProperty(
                                targetProps,
                                rawKey,
                                descriptor,
                            );
                        } else if (isMethod) {
                            const targetContainer =
                                context.qualifier !== "primary"
                                    ? strict[v.methods][context.qualifier][
                                          alloc
                                      ]
                                    : strict[v.methods][context.visibility][
                                          alloc
                                      ];
                            targetContainer[rawKey] = val;
                        } else {
                            const targetProps =
                                strict[v.properties][context.visibility][alloc];
                            targetProps[rawKey] = val;
                        }
                    }
                }
            };

            walk(d, rootContext);

            Object.keys(d).forEach((k) => delete d[k]);
            if (defaultSection === v.properties) {
                Object.defineProperties(
                    d,
                    Object.getOwnPropertyDescriptors(strict[v.properties]),
                );
            } else if (defaultSection === v.methods) {
                Object.defineProperties(
                    d,
                    Object.getOwnPropertyDescriptors(strict[v.methods]),
                );
            } else {
                Object.defineProperties(
                    d,
                    Object.getOwnPropertyDescriptors(strict),
                );
            }

            return d;
        };

        const resolveForwardDeclarations = function (
            cls,
            propsOrMethods,
            isMethods,
        ) {
            if (!cls || !cls.__meta) return;
            cls.__meta.forwardDeclarations ??= new Set();
            const fwd = cls.__meta.forwardDeclarations;

            const scanBlock = (block) => {
                if (!block || typeof block !== "object") return;
                const descs = Object.getOwnPropertyDescriptors(block);
                for (const [k, desc] of Object.entries(descs)) {
                    if ("value" in desc && desc.value === Ouro.forward) {
                        fwd.add(k);
                        delete block[k];
                    } else {
                        fwd.delete(k);
                    }
                }
            };

            if (isMethods) {
                scanBlock(propsOrMethods?.public?.instance);
                scanBlock(propsOrMethods?.public?.class);
                scanBlock(propsOrMethods?.private?.instance);
                scanBlock(propsOrMethods?.private?.class);
            } else {
                scanBlock(propsOrMethods?.public?.instance);
                scanBlock(propsOrMethods?.public?.class);
                scanBlock(propsOrMethods?.private?.instance);
                scanBlock(propsOrMethods?.private?.class);
            }
        };

        if (globalThis.Metaclass) {
            globalThis.Metaclass.addMethods({
                before: {
                    class: {
                        forge: function (definition) {
                            if (
                                definition &&
                                definition[v.name] === "Metaclass"
                            )
                                return;
                            Ouro.normalizeMatrix(definition);
                            const parent = definition?.[v.kindOf];
                            if (
                                typeof parent === "function" &&
                                parent !== Object &&
                                !parent.__meta &&
                                typeof Ouro.fromClass === "function"
                            ) {
                                parent.__ouroBridgeClass ??= Ouro.fromClass(
                                    parent,
                                    {
                                        name: `${parent.name || "Native"}Bridge`,
                                        publish: false,
                                    },
                                );
                                definition[v.kindOf] = parent.__ouroBridgeClass;
                            }
                        },
                    },
                    instance: {
                        addProperties: function (propsObj) {
                            if (!propsObj || typeof propsObj !== "object")
                                return;
                            if (!isAlreadyStrictProperties(propsObj)) {
                                Ouro.normalizeMatrix(
                                    propsObj,
                                    [],
                                    v.properties,
                                );
                            }
                            resolveForwardDeclarations(this, propsObj, false);
                        },
                        addMethods: function (methodsObj) {
                            if (!methodsObj || typeof methodsObj !== "object")
                                return;
                            if (!isAlreadyStrictMethods(methodsObj)) {
                                Ouro.normalizeMatrix(methodsObj, [], v.methods);
                            }
                            resolveForwardDeclarations(this, methodsObj, true);
                        },
                    },
                },
                after: {
                    class: {
                        forge: function (definition) {
                            const reqKey = v.requires || "requires";
                            const parentFwd =
                                definition[v.kindOf]?.__meta
                                    ?.forwardDeclarations;
                            const ownReqs = Array.isArray(definition[reqKey])
                                ? definition[reqKey]
                                : [];
                            if (!parentFwd && ownReqs.length === 0) return;

                            // Find the newly forged class via subclasses or global registry
                            for (const gf of globalThis.GenericFunction._registry.values()) {
                                for (const m of gf.methods) {
                                    const spec = m.specializers[0];
                                    if (
                                        spec &&
                                        spec.__meta &&
                                        spec.__meta.name === definition[v.name]
                                    ) {
                                        spec.__meta.forwardDeclarations ??=
                                            new Set();
                                        if (parentFwd) {
                                            for (const item of parentFwd) {
                                                if (
                                                    !(item in spec.prototype) &&
                                                    !(item in spec) &&
                                                    !(
                                                        item in
                                                        (spec.__private
                                                            ?.instance || {})
                                                    ) &&
                                                    !(
                                                        item in
                                                        (spec.__private
                                                            ?.class || {})
                                                    )
                                                ) {
                                                    spec.__meta.forwardDeclarations.add(
                                                        item,
                                                    );
                                                }
                                            }
                                        }
                                        for (const req of ownReqs) {
                                            if (
                                                !(req in spec.prototype) &&
                                                !(req in spec) &&
                                                !(
                                                    req in
                                                    (spec.__private?.instance ||
                                                        {})
                                                ) &&
                                                !(
                                                    req in
                                                    (spec.__private?.class ||
                                                        {})
                                                )
                                            ) {
                                                spec.__meta.forwardDeclarations.add(
                                                    req,
                                                );
                                            }
                                        }
                                        return;
                                    }
                                }
                            }
                        },
                    },
                },
            });
        }

        if (globalThis.Trait) {
            globalThis.Trait.addMethods({
                before: {
                    instance: {
                        initialize: function (definition) {
                            Ouro.normalizeMatrix(definition, [
                                "native",
                                "delegateTo",
                                "only",
                                "alias",
                            ]);
                        },
                    },
                },
            });
        }
    },
    function () {
        if (globalThis.Metaclass && globalThis.GenericFunction) {
            globalThis.GenericFunction._registry
                .get("forge")
                ?.removeMethod("before", globalThis.Metaclass);
            globalThis.GenericFunction._registry
                .get("forge")
                ?.removeMethod("after", globalThis.Metaclass);
            globalThis.GenericFunction._registry
                .get("addProperties")
                ?.removeMethod("before", globalThis.Metaclass);
            globalThis.GenericFunction._registry
                .get("addMethods")
                ?.removeMethod("before", globalThis.Metaclass);
        }
        if (globalThis.Trait && globalThis.GenericFunction) {
            globalThis.GenericFunction._registry
                .get("initialize")
                ?.removeMethod("before", globalThis.Trait);
        }
        delete Ouro.normalizeMatrix;
    },
);

// 3. Introspection & Reflective Serialization API
Ouro.introspectionExtension = new Ouro.Extension(
    "Introspection API",
    "Provides runtime reflection (#7, #10, #13, #19, #20, #21, #23) and GenericFunction-powered blueprint serialization (#8, #17).",
    function () {
        if (
            typeof globalThis.Metaclass === "undefined" ||
            !globalThis.Metaclass
        )
            return;

        const v = Ouro.Vocabulary;

        // #23: Subclass & Instance tracking hooks outside core allocate
        const trackAllocation = (rawClass, parentClass, meta) => {
            meta.subclasses ??= [];
            meta.instances ??= new WeakSet();
            if (
                parentClass &&
                parentClass !== Object &&
                parentClass.__meta
            ) {
                parentClass.__meta.subclasses ??= [];
                if (!parentClass.__meta.subclasses.includes(meta.name)) {
                    parentClass.__meta.subclasses.push(meta.name);
                }
            }
        };
        const trackInstantiation = (inst) => {
            const meta = inst?.constructor?.__meta;
            if (meta) {
                meta.instances ??= new WeakSet();
                meta.instances.add(inst);
            }
        };
        Ouro.introspectionExtension._trackAllocation = trackAllocation;
        Ouro.introspectionExtension._trackInstantiation = trackInstantiation;
        globalThis.Metaclass.bootstrap?.allocateHooks?.add(trackAllocation);
        globalThis.Metaclass.bootstrap?.instantiateHooks?.add(
            trackInstantiation,
        );

        // Retroactively initialize tracking on already-allocated core classes
        for (const sym of Ouro.Lexicon || []) {
            const cls = globalThis[sym];
            if (typeof cls === "function" && cls.__meta) {
                trackAllocation(cls, cls.__meta.parent, cls.__meta);
            }
        }
        if (globalThis.Extension?.registry) {
            for (const ext of globalThis.Extension.registry) {
                trackInstantiation(ext);
            }
        }
        if (globalThis.GenericFunction?._registry) {
            for (const gf of globalThis.GenericFunction._registry.values()) {
                trackInstantiation(gf);
                for (const m of gf.methods || []) {
                    trackInstantiation(m);
                }
            }
        }

        const NATIVE_FN_PROPS = new Set([
            "length",
            "name",
            "arguments",
            "caller",
            "prototype",
            "__meta",
            "__private",
            "__mop_dispatch_stack",
        ]);
        const NATIVE_PROTO_PROPS = new Set([
            "constructor",
            "isA",
            "className",
            "addTrait",
            "toSnapshot",
            "inspect",
            "__mop_dispatch_stack",
        ]);

        const serializeValue = (val, indent = "    ") => {
            if (val === undefined) return "undefined";
            if (val === null) return "null";
            if (typeof val === "function") {
                if (val.__meta?.name) return val.__meta.name;
                return val.toString();
            }
            if (val instanceof RegExp) return val.toString();
            if (typeof val === "symbol")
                return `Symbol(${JSON.stringify(val.description || "")})`;
            if (Array.isArray(val)) {
                return `[${val.map((item) => serializeValue(item, indent)).join(", ")}]`;
            }
            if (
                typeof val === "object" &&
                Object.getPrototypeOf(val) === Object.prototype
            ) {
                const entries = Object.entries(val).map(
                    ([k, subVal]) =>
                        `${JSON.stringify(k)}: ${serializeValue(subVal, indent)}`,
                );
                return `{ ${entries.join(", ")} }`;
            }
            return JSON.stringify(val);
        };

        globalThis.Metaclass.addMethods({
            public: {
                instance: {
                    getName: function () {
                        return this.__meta.name;
                    },
                    getKindOf: function () {
                        return this.__meta.parent;
                    },
                    getSubclasses: function () {
                        return this.__meta.subclasses;
                    },
                    superclass: function () {
                        return this.__meta.parent;
                    },
                    subclasses: function () {
                        return this.__meta.subclasses;
                    },
                    getInstances: function () {
                        return this.__meta.instances;
                    },
                    getBlueprint: function () {
                        return this.__private;
                    },
                    getDefinition: function () {
                        return this.__private?.class?.definition;
                    },
                    getSlots: function () {
                        return { ...(this.__meta.slotSymbols || {}) };
                    },
                    getSlot: function (propName) {
                        return this.__meta?.slotSymbols?.[propName];
                    },
                    getForwardDeclarations: function () {
                        const reqKey = v.requires || "requires";
                        const rawDef = this.__private?.class?.definition;
                        const normDef = this.__meta?.normalizedDefinition;
                        const set = new Set(
                            this.__meta.forwardDeclarations || [],
                        );
                        const reqList =
                            rawDef?.[reqKey] || normDef?.[reqKey] || [];
                        if (Array.isArray(reqList)) {
                            for (const req of reqList) {
                                if (
                                    !(req in this.prototype) &&
                                    !(req in this) &&
                                    !(
                                        req in (this.__private?.instance || {})
                                    ) &&
                                    !(req in (this.__private?.class || {}))
                                ) {
                                    set.add(req);
                                }
                            }
                        }
                        return Array.from(set);
                    },
                    isComplete: function () {
                        return this.getForwardDeclarations().length === 0;
                    },
                    getProperties: function (
                        visibility = "public",
                        allocation = "instance",
                    ) {
                        const out = {};
                        if (visibility === "private") {
                            const src =
                                allocation === "class"
                                    ? this.__private?.class
                                    : this.__private?.instance;
                            if (!src) return out;
                            for (const [k, desc] of Object.entries(
                                Object.getOwnPropertyDescriptors(src),
                            )) {
                                if (k === "definition") continue;
                                if (
                                    "value" in desc &&
                                    typeof desc.value === "function"
                                )
                                    continue;
                                Object.defineProperty(out, k, desc);
                            }
                            return out;
                        }

                        const target =
                            allocation === "class" ? this : this.prototype;
                        const skipSet =
                            allocation === "class"
                                ? NATIVE_FN_PROPS
                                : NATIVE_PROTO_PROPS;
                        const slots = this.__meta?.slotSymbols || {};
                        for (const k of Object.getOwnPropertyNames(target)) {
                            if (skipSet.has(k)) continue;
                            const desc = Object.getOwnPropertyDescriptor(
                                target,
                                k,
                            );
                            if (!desc) continue;
                            if (
                                "value" in desc &&
                                typeof desc.value === "function" &&
                                !desc.value.__meta
                            ) {
                                continue;
                            }
                            if (slots[k]) {
                                const sym = slots[k].symbol || slots[k];
                                if (typeof sym === "symbol" && sym in target) {
                                    out[k] = target[sym];
                                    continue;
                                }
                            }
                            Object.defineProperty(out, k, desc);
                        }
                        return out;
                    },
                    getMethods: function (
                        visibility = "public",
                        allocation = "instance",
                        qualifier = "primary",
                    ) {
                        const out = {};
                        const isStatic = allocation === "class";
                        if (
                            visibility === "private" &&
                            qualifier === "primary"
                        ) {
                            const src = isStatic
                                ? this.__private?.class
                                : this.__private?.instance;
                            if (!src) return out;
                            for (const [k, val] of Object.entries(src)) {
                                if (
                                    k !== "definition" &&
                                    typeof val === "function"
                                ) {
                                    out[k] = val;
                                }
                            }
                            return out;
                        }
                        for (const gf of globalThis.GenericFunction._registry.values()) {
                            for (const m of gf.getMethods()) {
                                if (
                                    m.getSpecializers()[0] === this &&
                                    m.getQualifier() === qualifier &&
                                    Boolean(m.isStatic) === isStatic
                                ) {
                                    const body = m.getBody();
                                    out[gf.name] = body?.__originalFn || body;
                                }
                            }
                        }
                        return out;
                    },
                    getAdvices: function () {
                        return {
                            before: {
                                instance: this.getMethods(
                                    "public",
                                    "instance",
                                    "before",
                                ),
                                class: this.getMethods(
                                    "public",
                                    "class",
                                    "before",
                                ),
                            },
                            after: {
                                instance: this.getMethods(
                                    "public",
                                    "instance",
                                    "after",
                                ),
                                class: this.getMethods(
                                    "public",
                                    "class",
                                    "after",
                                ),
                            },
                            around: {
                                instance: this.getMethods(
                                    "public",
                                    "instance",
                                    "around",
                                ),
                                class: this.getMethods(
                                    "public",
                                    "class",
                                    "around",
                                ),
                            },
                        };
                    },
                    getAttachedMethods: function () {
                        const attached = [];
                        for (const gf of globalThis.GenericFunction._registry.values()) {
                            if (
                                gf
                                    .getMethods()
                                    .some((m) =>
                                        m.getSpecializers().includes(this),
                                    )
                            )
                                attached.push(gf);
                        }
                        return attached;
                    },
                    stringify: function () {
                        return globalThis.GenericFunction.defgeneric(
                            "stringify",
                        ).dispatch(this);
                    },
                },
            },
        });

        // #8 & #17: Upgrade `stringify` to a first-class GenericFunction
        const stringifyGF = globalThis.GenericFunction.defgeneric("stringify");

        // Specializer 1: Metaclass (Class Blueprint Serialization)
        globalThis.GenericFunction.defmethod(
            "stringify",
            [globalThis.Metaclass],
            function (cls) {
                const normDef = cls.__meta?.normalizedDefinition || {};
                const lines = ["Class({"];
                lines.push(
                    `    ${v.name}: ${JSON.stringify(cls.__meta.name)},`,
                );
                if (cls.__meta.description) {
                    lines.push(
                        `    ${v.description}: ${JSON.stringify(cls.__meta.description)},`,
                    );
                }
                if (cls.__meta.parent && cls.__meta.parent !== Object) {
                    const parentName =
                        cls.__meta.parent.__meta?.name ||
                        cls.__meta.parent.name ||
                        "Object";
                    lines.push(`    ${v.kindOf}: ${parentName},`);
                }
                const fwd = cls.getForwardDeclarations?.() || [];
                if (fwd.length > 0) {
                    lines.push(
                        `    ${v.requires || "requires"}: ${JSON.stringify(fwd)},`,
                    );
                }

                const pubInstProps = cls.getProperties("public", "instance");
                const pubClassProps = cls.getProperties("public", "class");
                const privInstProps = cls.getProperties("private", "instance");
                const privClassProps = cls.getProperties("private", "class");

                const pubInstMethods = {
                    ...(normDef[v.methods]?.public?.instance || {}),
                    ...cls.getMethods("public", "instance"),
                };
                const pubClassMethods = {
                    ...(normDef[v.methods]?.public?.class || {}),
                    ...cls.getMethods("public", "class"),
                };
                const privInstMethods = {
                    ...(normDef[v.methods]?.private?.instance || {}),
                    ...cls.getMethods("private", "instance"),
                };
                const privClassMethods = {
                    ...(normDef[v.methods]?.private?.class || {}),
                    ...cls.getMethods("private", "class"),
                };
                const advices = cls.getAdvices?.() || {};

                for (const [k, desc] of Object.entries(
                    Object.getOwnPropertyDescriptors(pubInstProps),
                )) {
                    if ("value" in desc) {
                        lines.push(`    ${k}: ${serializeValue(desc.value)},`);
                    } else {
                        if (desc.get) lines.push(`    ${desc.get.toString()},`);
                        if (desc.set) lines.push(`    ${desc.set.toString()},`);
                    }
                }

                if (
                    Object.keys(pubClassProps).length > 0 ||
                    Object.keys(pubClassMethods).length > 0
                ) {
                    lines.push("    class: {");
                    for (const [k, desc] of Object.entries(
                        Object.getOwnPropertyDescriptors(pubClassProps),
                    )) {
                        if ("value" in desc) {
                            lines.push(
                                `        ${k}: ${serializeValue(desc.value)},`,
                            );
                        }
                    }
                    for (const [mName, fn] of Object.entries(pubClassMethods)) {
                        lines.push(`        ${mName}: ${serializeValue(fn)},`);
                    }
                    lines.push("    },");
                }

                if (
                    Object.keys(privInstProps).length > 0 ||
                    Object.keys(privClassProps).length > 0 ||
                    Object.keys(privInstMethods).length > 0 ||
                    Object.keys(privClassMethods).length > 0
                ) {
                    lines.push("    private: {");
                    for (const [k, desc] of Object.entries(
                        Object.getOwnPropertyDescriptors(privInstProps),
                    )) {
                        if ("value" in desc) {
                            lines.push(
                                `        ${k}: ${serializeValue(desc.value)},`,
                            );
                        }
                    }
                    for (const [mName, fn] of Object.entries(privInstMethods)) {
                        lines.push(`        ${mName}: ${serializeValue(fn)},`);
                    }
                    if (
                        Object.keys(privClassProps).length > 0 ||
                        Object.keys(privClassMethods).length > 0
                    ) {
                        lines.push("        class: {");
                        for (const [k, desc] of Object.entries(
                            Object.getOwnPropertyDescriptors(privClassProps),
                        )) {
                            if ("value" in desc) {
                                lines.push(
                                    `            ${k}: ${serializeValue(desc.value)},`,
                                );
                            }
                        }
                        for (const [mName, fn] of Object.entries(
                            privClassMethods,
                        )) {
                            lines.push(
                                `            ${mName}: ${serializeValue(fn)},`,
                            );
                        }
                        lines.push("        },");
                    }
                    lines.push("    },");
                }

                for (const [mName, fn] of Object.entries(pubInstMethods)) {
                    if (mName === "addTrait") continue;
                    lines.push(`    ${mName}: ${serializeValue(fn)},`);
                }

                for (const qual of ["before", "after", "around"]) {
                    const qInst = advices[qual]?.instance || {};
                    const qClass = advices[qual]?.class || {};
                    if (
                        Object.keys(qInst).length > 0 ||
                        Object.keys(qClass).length > 0
                    ) {
                        lines.push(`    ${qual}: {`);
                        for (const [mName, fn] of Object.entries(qInst)) {
                            lines.push(
                                `        ${mName}: ${serializeValue(fn)},`,
                            );
                        }
                        if (Object.keys(qClass).length > 0) {
                            lines.push("        class: {");
                            for (const [mName, fn] of Object.entries(qClass)) {
                                lines.push(
                                    `            ${mName}: ${serializeValue(fn)},`,
                                );
                            }
                            lines.push("        },");
                        }
                        lines.push("    },");
                    }
                }

                lines.push("})");
                return lines.join("\n");
            },
            "primary",
            false,
        );

        // Specializer 2: Object / Instance state serialization
        globalThis.GenericFunction.defmethod(
            "stringify",
            [Object],
            function (inst) {
                if (inst && typeof inst === "function" && inst.__meta) {
                    return stringifyGF.dispatch(inst);
                }
                const out = {};
                const cls = inst?.constructor;
                const slots = cls?.__meta?.slotSymbols || {};
                for (const [propName, slotObj] of Object.entries(slots)) {
                    if (slotObj?.isStatic) continue;
                    try {
                        out[propName] = inst[propName];
                    } catch (_) {}
                }
                for (const k of Object.keys(inst || {})) {
                    if (k === "inner" || k === "__mop_dispatch_stack") continue;
                    out[k] = inst[k];
                }
                return JSON.stringify(out, null, 2);
            },
            "primary",
            false,
        );

        const stringifyDispatcher = function (target) {
            return stringifyGF.dispatch(target);
        };
        Ouro.stringify = stringifyDispatcher;
        Ouro.publish("stringify", stringifyDispatcher);

        Ouro.audit = function () {
            const auditTargets = {
                Class: {
                    constructor: globalThis.Class,
                    prototype: globalThis.Class?.prototype,
                },
                Metaclass: {
                    constructor: globalThis.Metaclass,
                    prototype: globalThis.Metaclass?.prototype,
                },
                Method: {
                    constructor: globalThis.Method,
                    prototype: globalThis.Method?.prototype,
                },
                GenericFunction: {
                    constructor: globalThis.GenericFunction,
                    prototype: globalThis.GenericFunction?.prototype,
                },
                Slot: {
                    constructor: globalThis.Slot,
                    prototype: globalThis.Slot?.prototype,
                },
            };
            const coreFootprint = {};
            for (const [name, targets] of Object.entries(auditTargets)) {
                coreFootprint[name] = {
                    constructorKeys: targets.constructor
                        ? Reflect.ownKeys(targets.constructor)
                        : ["[NOT LOADED]"],
                    prototypeKeys: targets.prototype
                        ? Reflect.ownKeys(targets.prototype)
                        : ["[NOT LOADED]"],
                };
            }

            const report = {
                version: Ouro.version,
                timestamp: new Date().toISOString(),
                lexicon: Array.from(Ouro.Lexicon || []),
                coreFootprint,
                genericFunctions: {},
                classes: {},
            };
            if (globalThis.GenericFunction?._registry) {
                for (const [
                    gfName,
                    gfInstance,
                ] of globalThis.GenericFunction._registry.entries()) {
                    report.genericFunctions[gfName] = {
                        totalMethods: gfInstance.methods.length,
                        methods: gfInstance.methods.map((m) => ({
                            qualifier: m.qualifier,
                            isStatic: m.isStatic,
                            specializers: m.specializers.map(
                                (s) =>
                                    s?.__meta?.name ||
                                    s?.name ||
                                    String(s || "Any"),
                            ),
                        })),
                    };
                }
            }
            for (const sym of Ouro.Lexicon || []) {
                const ref = globalThis[sym];
                if (typeof ref === "function" && ref.__meta) {
                    report.classes[sym] = {
                        name: ref.__meta.name,
                        kindOf:
                            ref.__meta.parent?.__meta?.name ||
                            ref.__meta.parent?.name ||
                            "Object",
                        subclasses: [...(ref.__meta.subclasses || [])],
                        isComplete: ref.isComplete ? ref.isComplete() : true,
                        requires: ref.getForwardDeclarations
                            ? ref.getForwardDeclarations()
                            : [],
                    };
                }
            }
            return report;
        };
        Ouro.publish("audit", Ouro.audit);

        if (globalThis.GenericFunction) {
            globalThis.GenericFunction.addMethods({
                public: {
                    instance: {
                        getName: function () {
                            return this.name;
                        },
                        getMethods: function () {
                            return this.methods;
                        },
                    },
                },
            });
        }

        if (globalThis.Method) {
            globalThis.Method.addMethods({
                public: {
                    instance: {
                        getSpecializers: function () {
                            return this.specializers;
                        },
                        getBody: function () {
                            return this.body;
                        },
                        getQualifier: function () {
                            return this.qualifier;
                        },
                    },
                },
            });
        }
    },
    function () {
        if (Ouro.introspectionExtension._trackAllocation) {
            globalThis.Metaclass?.bootstrap?.allocateHooks?.delete(
                Ouro.introspectionExtension._trackAllocation,
            );
        }
        if (Ouro.introspectionExtension._trackInstantiation) {
            globalThis.Metaclass?.bootstrap?.instantiateHooks?.delete(
                Ouro.introspectionExtension._trackInstantiation,
            );
        }
        const mToRemove = [
            "getName",
            "getKindOf",
            "getSubclasses",
            "superclass",
            "subclasses",
            "getInstances",
            "getBlueprint",
            "getDefinition",
            "getSlots",
            "getSlot",
            "getForwardDeclarations",
            "isComplete",
            "getProperties",
            "getMethods",
            "getAdvices",
            "getAttachedMethods",
            "stringify",
        ];
        if (globalThis.Metaclass?.prototype)
            mToRemove.forEach((m) => delete globalThis.Metaclass.prototype[m]);
        if (globalThis.GenericFunction?.prototype) {
            delete globalThis.GenericFunction.prototype.getName;
            delete globalThis.GenericFunction.prototype.getMethods;
            globalThis.GenericFunction._registry
                ?.get("getName")
                ?.removeMethod("primary", globalThis.GenericFunction);
            globalThis.GenericFunction._registry
                ?.get("getMethods")
                ?.removeMethod("primary", globalThis.GenericFunction);
        }
        if (globalThis.Method?.prototype) {
            delete globalThis.Method.prototype.getSpecializers;
            delete globalThis.Method.prototype.getBody;
            delete globalThis.Method.prototype.getQualifier;
            globalThis.GenericFunction?._registry
                ?.get("getSpecializers")
                ?.removeMethod("primary", globalThis.Method);
            globalThis.GenericFunction?._registry
                ?.get("getBody")
                ?.removeMethod("primary", globalThis.Method);
            globalThis.GenericFunction?._registry
                ?.get("getQualifier")
                ?.removeMethod("primary", globalThis.Method);
        }
        delete Ouro.stringify;
        delete Ouro.audit;
    },
);

// 4. Trait System Extension
Ouro.traitSystemExtension = new Ouro.Extension(
    "Trait System",
    "First-class Trait Metaobjects with compile-time weaving and dynamic runtime adoption for both classes and instances.",
    function () {
        if (Ouro.extendVocabulary) {
            Ouro.extendVocabulary("traits", "traits");
        }

        const collectNativePrototypeKeys = function (nativeConstructor) {
            const keys = new Set();
            let curr = nativeConstructor?.prototype;
            while (curr && curr !== Object.prototype) {
                Object.getOwnPropertyNames(curr).forEach((k) => {
                    if (k !== "constructor") keys.add(k);
                });
                curr = Object.getPrototypeOf(curr);
            }
            if (
                typeof HTMLElement !== "undefined" &&
                (nativeConstructor === HTMLElement ||
                    nativeConstructor?.prototype instanceof HTMLElement ||
                    nativeConstructor?.name === "HTMLElement")
            ) {
                Object.getOwnPropertyNames(globalThis).forEach((className) => {
                    if (
                        (className.startsWith("HTML") &&
                            className.endsWith("Element")) ||
                        className === "Element" ||
                        className === "Node" ||
                        className === "EventTarget"
                    ) {
                        const proto = globalThis[className]?.prototype;
                        if (proto) {
                            Object.getOwnPropertyNames(proto).forEach((k) => {
                                if (k !== "constructor") keys.add(k);
                            });
                        }
                    }
                });
            }
            return Array.from(keys);
        };

        const flattenTraits = function (traitArray) {
            let result = [];
            traitArray.forEach(function (tConfig) {
                const traitInstance =
                    tConfig instanceof globalThis.Trait
                        ? tConfig
                        : new globalThis.Trait(tConfig);

                const matrix = traitInstance.getMatrix();
                result.push(traitInstance);

                if (matrix.traits && Array.isArray(matrix.traits)) {
                    result = result.concat(flattenTraits(matrix.traits));
                }
            });
            return result;
        };

        globalThis.Class({
            name: "Trait",
            publish: true,
            description:
                "A first-class Metaobject representing a reusable behavioral blueprint.",
            properties: {
                public: {
                    instance: {
                        name: "AnonymousTrait",
                        matrix: {},
                        isNativeDelegation: false,
                    },
                },
            },
            methods: {
                public: {
                    instance: {
                        initialize: function (definition) {
                            if (!definition)
                                throw new Error(
                                    "Trait requires a definition matrix.",
                                );
                            if (typeof Ouro.normalizeMatrix === "function") {
                                Ouro.normalizeMatrix(definition, [
                                    "native",
                                    "delegateTo",
                                    "only",
                                    "alias",
                                ]);
                            }
                            this.name = definition.name || this.name;
                            this.matrix = definition;

                            if (
                                !definition.native &&
                                (definition.publish === true ||
                                    (definition.publish !== false &&
                                        this.name &&
                                        this.name !== "AnonymousTrait" &&
                                        globalThis[this.name] === undefined)) &&
                                typeof Ouro.publish === "function"
                            ) {
                                Ouro.publish(this.name, this);
                            }

                            if (definition.native) {
                                this.isNativeDelegation = true;
                                this.matrix.properties =
                                    this.matrix.properties || {};
                                this.matrix.properties.public =
                                    this.matrix.properties.public || {};
                                this.matrix.properties.public.instance =
                                    this.matrix.properties.public.instance ||
                                    {};
                                var props =
                                    this.matrix.properties.public.instance;

                                this.matrix.methods = this.matrix.methods || {};
                                this.matrix.methods.public =
                                    this.matrix.methods.public || {};
                                this.matrix.methods.public.instance =
                                    this.matrix.methods.public.instance || {};
                                var meths = this.matrix.methods.public.instance;

                                var proto = definition.native.prototype;
                                var keys =
                                    definition.only ||
                                    collectNativePrototypeKeys(
                                        definition.native,
                                    );
                                var aliasMap = definition.alias || {};

                                var delStr =
                                    definition.delegateTo ||
                                    "this.nativeObject";
                                var isMethod = delStr.indexOf("()") > -1;
                                var targetName = delStr
                                    .replace("()", "")
                                    .replace("this.", "");

                                var getTarget = function (ctx) {
                                    return isMethod
                                        ? ctx[targetName]()
                                        : ctx[targetName];
                                };

                                keys.forEach(function (key) {
                                    if (key === "constructor") return;
                                    var finalKey = aliasMap[key] || key;
                                    var desc;
                                    var currentProto = proto;

                                    while (currentProto && !desc) {
                                        desc = Object.getOwnPropertyDescriptor(
                                            currentProto,
                                            key,
                                        );
                                        currentProto =
                                            Object.getPrototypeOf(currentProto);
                                    }

                                    if (
                                        desc &&
                                        typeof desc.value === "function"
                                    ) {
                                        meths[finalKey] = function () {
                                            var target = getTarget(this);
                                            if (!target) return undefined;
                                            return target[key].apply(
                                                target,
                                                arguments,
                                            );
                                        };
                                    } else {
                                        Object.defineProperty(props, finalKey, {
                                            get: function () {
                                                var target = getTarget(this);
                                                return target
                                                    ? target[key]
                                                    : undefined;
                                            },
                                            set: function (val) {
                                                var target = getTarget(this);
                                                if (target) target[key] = val;
                                            },
                                            enumerable: true,
                                            configurable: true,
                                        });
                                    }
                                });
                            }
                        },
                        getMatrix: function () {
                            return this.matrix;
                        },
                    },
                    class: {
                        native: function (nativeConstructor, config) {
                            config = config || {};
                            var prefix =
                                config.state ||
                                "native" + (nativeConstructor.name || "Object");
                            var privateKey = "_" + prefix + "Object";
                            var publicAccessor = prefix;

                            var traitDef = {
                                name:
                                    "InlineNative" +
                                    (nativeConstructor.name || "Object") +
                                    "_" +
                                    prefix,
                                native: nativeConstructor,
                                delegateTo: "this." + publicAccessor + "()",
                                only:
                                    config.only ||
                                    collectNativePrototypeKeys(
                                        nativeConstructor,
                                    ),
                                alias: config.alias || {},
                                properties: { private: { instance: {} } },
                                methods: { public: { instance: {} } },
                            };

                            traitDef.properties.private.instance[privateKey] =
                                null;
                            traitDef.methods.public.instance[publicAccessor] =
                                function () {
                                    return this[privateKey];
                                };

                            return new globalThis.Trait(traitDef);
                        },
                    },
                },
            },
        });

        const instanceAddTrait = function (traitConfig) {
            const targetInstance = this;
            const allTraits = flattenTraits([traitConfig]);

            allTraits.forEach(function (traitInstance) {
                const matrix = traitInstance.getMatrix();

                if (matrix.properties) {
                    if (
                        matrix.properties.public &&
                        matrix.properties.public.instance
                    ) {
                        const descriptors = Object.getOwnPropertyDescriptors(
                            matrix.properties.public.instance,
                        );
                        for (const [k, desc] of Object.entries(descriptors)) {
                            if (
                                !Object.prototype.hasOwnProperty.call(
                                    targetInstance,
                                    k,
                                ) &&
                                !(k in targetInstance)
                            ) {
                                if ("value" in desc) {
                                    targetInstance[k] = Array.isArray(
                                        desc.value,
                                    )
                                        ? [...desc.value]
                                        : desc.value &&
                                            typeof desc.value === "object" &&
                                            Object.getPrototypeOf(
                                                desc.value,
                                            ) === Object.prototype
                                          ? { ...desc.value }
                                          : desc.value;
                                } else {
                                    Object.defineProperty(
                                        targetInstance,
                                        k,
                                        desc,
                                    );
                                }
                            }
                        }
                    }
                    if (
                        matrix.properties.private &&
                        matrix.properties.private.instance &&
                        globalThis.Metaclass &&
                        globalThis.Metaclass.Private
                    ) {
                        const vault =
                            targetInstance[globalThis.Metaclass.Private];
                        if (vault) {
                            Object.entries(
                                matrix.properties.private.instance,
                            ).forEach(([k, v]) => {
                                if (vault[k] === undefined) {
                                    vault[k] = Array.isArray(v)
                                        ? [...v]
                                        : v &&
                                            typeof v === "object" &&
                                            Object.getPrototypeOf(v) ===
                                                Object.prototype
                                          ? { ...v }
                                          : v;
                                }
                            });
                        }
                    }
                }

                if (matrix.methods) {
                    if (
                        matrix.methods.public &&
                        matrix.methods.public.instance
                    ) {
                        Object.entries(matrix.methods.public.instance).forEach(
                            ([mName, fn]) => {
                                globalThis.GenericFunction.defmethod(
                                    mName,
                                    [targetInstance],
                                    function (recv, ...args) {
                                        return fn.apply(recv, args);
                                    },
                                    "primary",
                                );
                                if (
                                    typeof targetInstance[mName] !== "function"
                                ) {
                                    Object.defineProperty(
                                        targetInstance,
                                        mName,
                                        {
                                            value: function (...args) {
                                                return globalThis.GenericFunction.defgeneric(
                                                    mName,
                                                ).dispatch(this, ...args);
                                            },
                                            writable: true,
                                            configurable: true,
                                            enumerable: false,
                                        },
                                    );
                                }
                            },
                        );
                    }
                    ["before", "after", "around"].forEach((qual) => {
                        const block =
                            matrix.methods[qual]?.instance ||
                            matrix[qual]?.instance;
                        if (block) {
                            Object.entries(block).forEach(([mName, fn]) => {
                                globalThis.GenericFunction.defmethod(
                                    mName,
                                    [targetInstance],
                                    function (recv, ...args) {
                                        return fn.apply(recv, args);
                                    },
                                    qual,
                                );
                            });
                        }
                    });
                }
            });
            return this;
        };

        globalThis.Metaclass.addMethods({
            public: {
                instance: {
                    addTrait: function (traitConfig) {
                        const targetClass = this;
                        const allTraits = flattenTraits([traitConfig]);

                        allTraits.forEach(function (traitInstance) {
                            const matrix = traitInstance.getMatrix();

                            if (
                                matrix.properties &&
                                typeof targetClass.addProperties === "function"
                            ) {
                                targetClass.addProperties(
                                    matrix.properties,
                                    false,
                                );
                            }

                            if (typeof targetClass.addMethods === "function") {
                                targetClass.addMethods({
                                    public: matrix.methods
                                        ? matrix.methods.public
                                        : undefined,
                                    private: matrix.methods
                                        ? matrix.methods.private
                                        : undefined,
                                    before:
                                        matrix.methods?.before || matrix.before,
                                    after:
                                        matrix.methods?.after || matrix.after,
                                    around:
                                        matrix.methods?.around || matrix.around,
                                });
                            }
                        });
                        return targetClass;
                    },
                },
            },
            before: {
                class: {
                    forge: function (definition) {
                        definition.methods = definition.methods || {};
                        definition.methods.public =
                            definition.methods.public || {};
                        definition.methods.public.instance =
                            definition.methods.public.instance || {};

                        if (!definition.methods.public.instance.addTrait) {
                            definition.methods.public.instance.addTrait =
                                instanceAddTrait;
                        }

                        var rawTraits = definition.traits || [];
                        if (!rawTraits.length) return;

                        var allTraits = flattenTraits(rawTraits);

                        allTraits.forEach(function (traitInstance) {
                            var matrix = traitInstance.getMatrix();

                            var mergeMatrix = function (target, source) {
                                if (!source) return;
                                var keys = Object.getOwnPropertyNames(source);

                                keys.forEach(function (key) {
                                    if (key === "traits") return;

                                    var desc = Object.getOwnPropertyDescriptor(
                                        source,
                                        key,
                                    );

                                    if (
                                        desc.value &&
                                        typeof desc.value === "object" &&
                                        !Array.isArray(desc.value) &&
                                        Object.getPrototypeOf(desc.value) ===
                                            Object.prototype
                                    ) {
                                        target[key] = target[key] || {};
                                        mergeMatrix(target[key], desc.value);
                                    } else {
                                        if (
                                            !Object.getOwnPropertyDescriptor(
                                                target,
                                                key,
                                            )
                                        ) {
                                            Object.defineProperty(
                                                target,
                                                key,
                                                desc,
                                            );
                                        }
                                    }
                                });
                            };

                            if (matrix.properties) {
                                definition.properties =
                                    definition.properties || {};
                                mergeMatrix(
                                    definition.properties,
                                    matrix.properties,
                                );
                            }
                            ["methods", "before", "after", "around"].forEach(
                                function (block) {
                                    if (matrix[block]) {
                                        definition[block] =
                                            definition[block] || {};
                                        mergeMatrix(
                                            definition[block],
                                            matrix[block],
                                        );
                                    }
                                },
                            );
                        });

                        delete definition.traits;
                    },
                },
            },
        });
    },
);

// 5. Caching System Extension
Ouro.cachingSystemExtension = new Ouro.Extension(
    "Caching System",
    "Modular, trait-based caching framework supporting Session, Domain, and Global persistence scopes.",
    function () {
        const LocalDriver = {
            name: "localCache",
            read(key) {
                return localStorage.getItem(key);
            },
            write(key, val) {
                localStorage.setItem(key, val);
            },
            delete(key) {
                localStorage.removeItem(key);
            },
            keys() {
                const k = [];
                for (let i = 0; i < localStorage.length; i++)
                    k.push(localStorage.key(i));
                return k;
            },
        };

        const SessionDriver = {
            name: "sessionCache",
            read(key) {
                return sessionStorage.getItem(key);
            },
            write(key, val) {
                sessionStorage.setItem(key, val);
            },
            delete(key) {
                sessionStorage.removeItem(key);
            },
            keys() {
                const k = [];
                for (let i = 0; i < sessionStorage.length; i++)
                    k.push(sessionStorage.key(i));
                return k;
            },
        };

        const GlobalDriver = {
            name: "globalCache",
            verify() {
                if (
                    typeof GM_getValue !== "function" ||
                    typeof GM_setValue !== "function" ||
                    typeof GM_deleteValue !== "function" ||
                    typeof GM_listValues !== "function"
                ) {
                    throw new Error(
                        `[GlobalCache] Missing @grant headers: GM_getValue, GM_setValue, GM_deleteValue, GM_listValues.`,
                    );
                }
            },
            read(key) {
                this.verify();
                return GM_getValue(key, undefined);
            },
            write(key, val) {
                this.verify();
                GM_setValue(key, val);
            },
            delete(key) {
                this.verify();
                GM_deleteValue(key);
            },
            keys() {
                this.verify();
                return GM_listValues();
            },
        };

        const createStorageTrait = (driver, aliases = []) => {
            const trait = new globalThis.Trait({
                name: driver.name,
                publish: true,
                properties: {
                    public: {
                        shared: {
                            cacheTTL: 86400000,
                            purged: undefined,
                        },
                    },
                },
                methods: {
                    public: {
                        shared: {
                            _cacheKey(cacheId) {
                                const target = this.__meta
                                    ? this
                                    : this.constructor;
                                const prefix = `Ouro_${target.__meta?.name || target.name || "Anonymous"}`;
                                return cacheId !== undefined
                                    ? `${prefix}_${JSON.stringify(cacheId)}`
                                    : prefix;
                            },
                            listCached() {
                                const prefix = this._cacheKey(undefined);
                                return driver
                                    .keys()
                                    .filter(
                                        (k) =>
                                            k.startsWith(prefix) &&
                                            !k.includes("_meta_"),
                                    );
                            },
                            clearCache(cacheId) {
                                driver.delete(this._cacheKey(cacheId));
                                console.info(
                                    `[Ouro — Cache] Cleared ${this.className || this.name || this.constructor?.name} (${cacheId})`,
                                );
                            },
                            clearAll() {
                                const keys = this.listCached();
                                for (const k of keys) driver.delete(k);
                                driver.delete(
                                    `${this._cacheKey(undefined)}_meta_lastPurge`,
                                );
                                const hostClass = this.__meta
                                    ? this
                                    : this.constructor;
                                if (hostClass) hostClass.purged = false;
                                this.purged = false;
                                console.info(
                                    `[Ouro — Cache] Cleared all ${this.className || this.name || this.constructor?.name}`,
                                );
                            },
                            fromCache(cacheId) {
                                const hostClass = this.__meta
                                    ? this
                                    : this.constructor;
                                if (!this.purged && !hostClass?.purged) {
                                    this._cachePurgeIfNeeded();
                                }
                                const raw = driver.read(
                                    this._cacheKey(cacheId),
                                );
                                return raw ? this._unpack(raw) : undefined;
                            },
                            toCache(cacheId, dataPayload) {
                                if (dataPayload === undefined) return;
                                const hostClass = this.__meta
                                    ? this
                                    : this.constructor;
                                if (!this.purged && !hostClass?.purged) {
                                    this._cachePurgeIfNeeded();
                                }
                                driver.write(
                                    this._cacheKey(cacheId),
                                    this._pack(dataPayload),
                                );
                            },
                        },
                    },
                    private: {
                        shared: {
                            _pack(data) {
                                const key = { data: "d", timestamp: "t" };
                                const payload = {};
                                payload[key.data] = data;
                                payload[key.timestamp] = Date.now();
                                return JSON.stringify(payload);
                            },
                            _unpack(raw, field = "data") {
                                const key = { data: "d", timestamp: "t" };
                                let payload = undefined;
                                try {
                                    payload = JSON.parse(raw);
                                    if (!payload) return undefined;
                                } catch (e) {
                                    return undefined;
                                }
                                return key[field]
                                    ? payload[key[field]]
                                    : payload;
                            },
                            _cacheLastPurge() {
                                return `${this._cacheKey(undefined)}_meta_lastPurge`;
                            },
                            _cachePurgeIfNeeded() {
                                const hostClass = this.__meta
                                    ? this
                                    : this.constructor;
                                const ttl =
                                    this.cacheTTL ??
                                    hostClass?.cacheTTL ??
                                    86400000;
                                const lastPurge = parseInt(
                                    driver.read(this._cacheLastPurge()) || "0",
                                    10,
                                );
                                if (Date.now() - lastPurge > ttl) {
                                    this._cachePurge();
                                }
                                this.purged = true;
                                if (hostClass) hostClass.purged = true;
                            },
                            _cachePurge() {
                                const now = Date.now();
                                const hostClass = this.__meta
                                    ? this
                                    : this.constructor;
                                const ttl =
                                    this.cacheTTL ??
                                    hostClass?.cacheTTL ??
                                    86400000;
                                const keys = this.listCached();
                                for (const k of keys) {
                                    const raw = driver.read(k);
                                    if (raw) {
                                        const t = this._unpack(
                                            raw,
                                            "timestamp",
                                        );
                                        if (t === undefined || now - t > ttl) {
                                            driver.delete(k);
                                        }
                                    }
                                }
                                driver.write(
                                    this._cacheLastPurge(),
                                    now.toString(),
                                );
                            },
                        },
                    },
                },
            });
            for (const alias of aliases) {
                Ouro.publish(alias, trait);
            }
            return trait;
        };

        createStorageTrait(LocalDriver, ["LocalCacheable", "domainCache"]);
        createStorageTrait(SessionDriver, ["SessionCacheable"]);
        createStorageTrait(GlobalDriver, ["GlobalCacheable"]);

        const WithKey = (keyExtractor) => {
            const safeKeyName =
                typeof keyExtractor === "string"
                    ? keyExtractor.replace(/[^a-zA-Z0-9]/g, "_")
                    : "Dynamic";
            return new globalThis.Trait({
                name: `WithKey_${safeKeyName}`,
                publish: false,
                methods: {
                    private: {
                        instance: {
                            _getCacheId(...args) {
                                if (typeof keyExtractor === "function") {
                                    return keyExtractor.apply(this, args);
                                }
                                if (typeof keyExtractor === "string") {
                                    if (
                                        typeof this[keyExtractor] === "function"
                                    ) {
                                        return this[keyExtractor].apply(
                                            this,
                                            args,
                                        );
                                    }
                                    return keyExtractor
                                        .split(".")
                                        .reduce(
                                            (obj, prop) => obj?.[prop],
                                            this,
                                        );
                                }
                                return keyExtractor;
                            },
                        },
                    },
                },
            });
        };

        const inFlightRequests = new Map();

        const Cacheable = (
            StorageTrait,
            methodName,
            keyExtractor,
            stateField = "data",
        ) =>
            new globalThis.Trait({
                name: `Cacheable_${methodName}`,
                publish: false,
                traits: [StorageTrait, WithKey(keyExtractor)],
                around: {
                    async [methodName](...args) {
                        if (typeof this._getCacheId !== "function") {
                            throw new Error(
                                `[Cacheable] Missing identity provider.`,
                            );
                        }

                        const cacheId = this._getCacheId(...args);
                        const hydrateFromPayload = (payload) => {
                            if (
                                stateField &&
                                typeof payload === "object" &&
                                payload !== null &&
                                "__state" in payload
                            ) {
                                this[stateField] = payload.__state;
                                return payload.__return === "__this__"
                                    ? this
                                    : payload.__return;
                            }
                            if (stateField && this[stateField] !== undefined) {
                                this[stateField] = payload;
                            }
                            return payload;
                        };

                        const cached = this.fromCache(cacheId);
                        if (cached !== undefined) {
                            const className =
                                this.constructor?.__meta?.name ||
                                this.constructor?.name ||
                                "Anonymous";
                            console.info(
                                `[Ouro — Cache] ${className} (${cacheId}): ${methodName}`,
                            );
                            return hydrateFromPayload(cached);
                        }

                        const inFlightKey = `${this._cacheKey(cacheId)}:${methodName}`;
                        if (inFlightRequests.has(inFlightKey)) {
                            const sharedPayload =
                                await inFlightRequests.get(inFlightKey);
                            if (sharedPayload !== undefined) {
                                return hydrateFromPayload(sharedPayload);
                            }
                        }

                        const executionPromise = (async () => {
                            const result = await this.inner(...args);
                            let payload = result;
                            if (stateField && this[stateField] !== undefined) {
                                payload = {
                                    __state: this[stateField],
                                    __return:
                                        result === this ? "__this__" : result,
                                };
                            }
                            if (payload !== undefined) {
                                this.toCache(cacheId, payload);
                            }
                            return { result, payload };
                        })();

                        inFlightRequests.set(
                            inFlightKey,
                            executionPromise.then((r) => r.payload),
                        );

                        try {
                            const { result } = await executionPromise;
                            return result;
                        } finally {
                            inFlightRequests.delete(inFlightKey);
                        }
                    },
                },
            });

        Cacheable.nuke = function () {
            const prefix = "Ouro_";
            LocalDriver.keys().forEach((k) => {
                if (k.startsWith(prefix)) LocalDriver.delete(k);
            });
            SessionDriver.keys().forEach((k) => {
                if (k.startsWith(prefix)) SessionDriver.delete(k);
            });
            GlobalDriver.keys().forEach((k) => {
                if (k.startsWith(prefix)) GlobalDriver.delete(k);
            });
            console.log(
                `[Cacheable] ☢️ Nuked all Ouro caches across Local, Session, and Global storage engines.`,
            );
        };

        Ouro.publish("Cacheable", Cacheable);
    },
);

// 6. DevTools Display Sugar Extension (#9, #22, #23)
Ouro.devtoolsExtension = new Ouro.Extension(
    "DevTools Display Sugar",
    "Custom formatting, clean slot snapshot inspection, toString sugar, and browser DevTools formatter registration for Ouro classes and instances.",
    function () {
        const snapshotInstance = function (inst) {
            if (!inst || typeof inst !== "object") return inst;
            const out = {};
            let curr = inst.constructor;
            while (curr && curr.__meta) {
                const slots = curr.__meta.slotSymbols || {};
                for (const [propName, slotObj] of Object.entries(slots)) {
                    if (slotObj?.isStatic) continue;
                    if (!(propName in out)) {
                        try {
                            out[propName] = inst[propName];
                        } catch (_) {}
                    }
                }
                curr = curr.__meta.parent;
            }
            for (const k of Object.keys(inst)) {
                if (k === "inner" || k === "__mop_dispatch_stack") continue;
                out[k] = inst[k];
            }
            return out;
        };

        // #23: Mount toSnapshot and inspect on prototypes outside core allocate
        const mountPrototypeHelpers = (rawClass) => {
            if (!rawClass || !rawClass.prototype) return;
            if (!("toSnapshot" in rawClass.prototype)) {
                Object.defineProperty(rawClass.prototype, "toSnapshot", {
                    value: function () {
                        return typeof Ouro.snapshot === "function"
                            ? Ouro.snapshot(this)
                            : { ...this };
                    },
                    writable: true,
                    configurable: true,
                    enumerable: false,
                });
            }
            if (!("inspect" in rawClass.prototype)) {
                Object.defineProperty(rawClass.prototype, "inspect", {
                    value: function (options) {
                        return typeof Ouro.inspect === "function"
                            ? Ouro.inspect(this, options)
                            : this.toSnapshot();
                    },
                    writable: true,
                    configurable: true,
                    enumerable: false,
                });
            }
        };
        Ouro.devtoolsExtension._mountPrototypeHelpers = mountPrototypeHelpers;
        globalThis.Metaclass?.bootstrap?.allocateHooks?.add(
            mountPrototypeHelpers,
        );
        for (const sym of Ouro.Lexicon || []) {
            const cls = globalThis[sym];
            if (typeof cls === "function" && cls.__meta) {
                mountPrototypeHelpers(cls);
            }
        }

        if (globalThis.Metaclass && globalThis.GenericFunction) {
            const inspectGF = globalThis.GenericFunction.defgeneric("inspect");

            globalThis.Metaclass.addMethods({
                public: {
                    instance: {
                        toString: function () {
                            const isCore = [
                                "Metaclass",
                                "Method",
                                "GenericFunction",
                                "Extension",
                                "ExtensionPackage",
                            ].includes(this.__meta.name);
                            return `ƒ <${this.__meta.name}> Class() { [${isCore ? "Standard Library" : "Domain Logic"}] }`;
                        },
                        inspect: function (options = {}) {
                            const cls = this;
                            const subclassNames = [
                                ...(cls.__meta?.subclasses || []),
                            ];
                            const subclassRefs = {};
                            for (const subName of subclassNames) {
                                if (globalThis[subName]) {
                                    subclassRefs[subName] = globalThis[subName];
                                }
                            }
                            const slots = {};
                            let curr = cls;
                            while (curr && curr.__meta) {
                                const ownSlots = curr.__meta.slotSymbols || {};
                                for (const [sName, sMeta] of Object.entries(
                                    ownSlots,
                                )) {
                                    if (!(sName in slots)) {
                                        slots[sName] = sMeta;
                                    }
                                }
                                curr = curr.__meta.parent;
                            }
                            const pubInstMethodsDict = cls.getMethods
                                ? cls.getMethods("public", "instance")
                                : {};
                            const pubClassMethodsDict = cls.getMethods
                                ? cls.getMethods("public", "class")
                                : {};
                            const privInstMethodsDict = cls.getMethods
                                ? cls.getMethods("private", "instance")
                                : {};
                            const advices = cls.getAdvices
                                ? cls.getAdvices()
                                : {};

                            const report = {
                                class: cls.__meta?.name,
                                superclass: cls.__meta?.parent || Object,
                                kindOf:
                                    cls.__meta?.parent?.__meta?.name ||
                                    cls.__meta?.parent?.name ||
                                    "Object",
                                subclasses: subclassNames,
                                subclassRefs,
                                slots,
                                properties: cls.getProperties
                                    ? cls.getProperties("public", "instance")
                                    : {},
                                classProperties: cls.getProperties
                                    ? cls.getProperties("public", "class")
                                    : {},
                                privateProperties: cls.getProperties
                                    ? cls.getProperties("private", "instance")
                                    : {},
                                methods: Object.keys(pubInstMethodsDict),
                                methodsDictionary: pubInstMethodsDict,
                                classMethods: Object.keys(pubClassMethodsDict),
                                classMethodsDictionary: pubClassMethodsDict,
                                privateMethods:
                                    Object.keys(privInstMethodsDict),
                                privateMethodsDictionary: privInstMethodsDict,
                                advices,
                                requires: cls.getForwardDeclarations
                                    ? cls.getForwardDeclarations()
                                    : [],
                                isComplete: cls.isComplete
                                    ? cls.isComplete()
                                    : true,
                                meta: cls.__meta,
                                rawClass: cls,
                            };
                            if (options?.log) {
                                console.group(
                                    `%c[Ouro Unit Frame Inspector] Class: ${report.class} (kindOf ${report.kindOf})`,
                                    "color: #00ffcc; font-weight: bold; font-size: 13px;",
                                );
                                console.group("📂 Public Instance Slots:");
                                console.table(report.properties);
                                console.groupEnd();
                                if (
                                    Object.keys(report.classProperties).length >
                                    0
                                ) {
                                    console.group("🏛️ Class (Static) Slots:");
                                    console.table(report.classProperties);
                                    console.groupEnd();
                                }
                                if (
                                    Object.keys(report.privateProperties)
                                        .length > 0
                                ) {
                                    console.group("🔒 Private Slots:");
                                    console.table(report.privateProperties);
                                    console.groupEnd();
                                }
                                console.group("🎰 Slot Metaobjects & Facets:");
                                console.log(report.slots);
                                console.groupEnd();
                                console.group("⚙️ Methods & Advices:");
                                console.log({
                                    instance: report.methodsDictionary,
                                    class: report.classMethodsDictionary,
                                    private: report.privateMethodsDictionary,
                                    advices: report.advices,
                                });
                                console.groupEnd();
                                console.group("🧬 Metaobject (__meta):");
                                console.log(report.meta);
                                console.groupEnd();
                                console.groupEnd();
                            }
                            return report;
                        },
                    },
                },
            });

            globalThis.GenericFunction.defmethod(
                "inspect",
                [Object],
                function (instance, options = {}) {
                    if (
                        instance &&
                        typeof instance === "function" &&
                        instance.__meta
                    ) {
                        return instance.inspect(options);
                    }
                    const ctor = instance?.constructor;
                    const meta = ctor?.__meta;
                    if (!meta) return snapshotInstance(instance);

                    const lineage = [];
                    const lineageClasses = [];
                    let currClass = ctor;
                    while (currClass && currClass.__meta) {
                        lineage.push(currClass.__meta.name);
                        lineageClasses.push(currClass);
                        currClass = currClass.__meta.parent;
                    }
                    lineage.push("Object");
                    lineageClasses.push(Object);

                    const publicProperties = snapshotInstance(instance);
                    const privateVault = {};
                    const privSym = globalThis.Metaclass?.Private;
                    const vault = privSym ? instance[privSym] : null;
                    if (vault && typeof vault === "object") {
                        for (const k of Object.keys(vault)) {
                            if (typeof vault[k] !== "function") {
                                privateVault[k] = vault[k];
                            }
                        }
                    }
                    for (const k of Object.getOwnPropertyNames(instance)) {
                        if (
                            k.startsWith("_") &&
                            k !== "__mop_dispatch_stack" &&
                            !(k in privateVault)
                        ) {
                            privateVault[k] = instance[k];
                        }
                    }

                    const slots = {};
                    let slotCursor = ctor;
                    while (slotCursor && slotCursor.__meta) {
                        const ownSlots = slotCursor.__meta.slotSymbols || {};
                        for (const [sName, sMeta] of Object.entries(ownSlots)) {
                            if (!sMeta?.isStatic && !(sName in slots)) {
                                slots[sName] = sMeta;
                            }
                        }
                        slotCursor = slotCursor.__meta.parent;
                    }

                    const methods = [];
                    const methodsDictionary = {};
                    let proto = Object.getPrototypeOf(instance);
                    const seenMethods = new Set([
                        "constructor",
                        "initialize",
                        "isA",
                        "className",
                        "addTrait",
                        "toSnapshot",
                        "inspect",
                    ]);
                    while (proto && proto !== Object.prototype) {
                        const origin =
                            proto.constructor?.__meta?.name ||
                            proto.constructor?.name ||
                            "Unknown";
                        for (const k of Object.getOwnPropertyNames(proto)) {
                            if (seenMethods.has(k)) continue;
                            const desc = Object.getOwnPropertyDescriptor(
                                proto,
                                k,
                            );
                            if (!desc) continue;
                            if (typeof desc.value === "function") {
                                seenMethods.add(k);
                                methods.push({ method: k, definedIn: origin });
                                methodsDictionary[k] = {
                                    fn: desc.value,
                                    genericFunction:
                                        globalThis.GenericFunction?._registry?.get(
                                            k,
                                        ) || null,
                                    definedIn: proto.constructor || origin,
                                };
                            } else if (
                                (desc.get || desc.set) &&
                                !(k in slots)
                            ) {
                                seenMethods.add(k);
                                methodsDictionary[k] = {
                                    getter: desc.get,
                                    setter: desc.set,
                                    type: "Accessor (Getter/Setter)",
                                    definedIn: proto.constructor || origin,
                                };
                            }
                        }
                        proto = Object.getPrototypeOf(proto);
                    }

                    const report = {
                        className: meta.name,
                        class: ctor,
                        lineage,
                        lineageClasses,
                        publicProperties,
                        publicState: publicProperties,
                        privateVault,
                        privateState: privateVault,
                        slots,
                        methods,
                        methodsDictionary,
                        meta,
                        rawInstance: instance,
                    };

                    if (options?.log) {
                        console.group(
                            `%c[Ouro Reflection Inspector] Instance of ${meta.name}`,
                            "color: #4285F4; font-weight: bold; font-size: 13px;",
                        );
                        console.log("🧬 Lineage:", lineage.join(" -> "), lineageClasses);
                        console.group("📂 Public State / Slots:");
                        console.table(publicProperties);
                        console.groupEnd();
                        if (Object.keys(privateVault).length > 0) {
                            console.group("🔒 Private State (Vault & Internal Slots):");
                            console.table(privateVault);
                            console.groupEnd();
                        }
                        console.group("🎰 Slot Metaobjects & Facets:");
                        console.log(slots);
                        console.groupEnd();
                        console.group("⚙️ Methods & Accessors Dictionary:");
                        console.log(methodsDictionary);
                        console.groupEnd();
                        console.group("🧬 Metaobject Info (__meta):");
                        console.log(meta);
                        console.groupEnd();
                        console.groupEnd();
                    }

                    return report;
                },
                "primary",
                false,
            );

            const inspectDispatcher = function (target, options) {
                if (target && typeof target === "function" && target.__meta) {
                    return target.inspect(options);
                }
                return inspectGF.dispatch(target, options);
            };
            Ouro.inspect = inspectDispatcher;
            Ouro.publish("inspect", inspectDispatcher);

            // #22: Consolidate toString sugar on GenericFunction and Method in DevTools Extension
            globalThis.GenericFunction.addMethods({
                public: {
                    instance: {
                        toString: function () {
                            return `[GenericFunction: ${this.name}() routing ${this.methods.length} methods]`;
                        },
                    },
                },
            });

            if (globalThis.Method) {
                globalThis.Method.addMethods({
                    public: {
                        instance: {
                            toString: function () {
                                const specs = this.specializers
                                    .map((s) =>
                                        s && s.getName
                                            ? s.getName()
                                            : s?.__meta?.name ||
                                              s?.name ||
                                              "Any",
                                    )
                                    .join(", ");
                                return `[Method: :${this.qualifier} (${specs})]`;
                            },
                        },
                    },
                });
            }
        }

        Ouro.snapshot = snapshotInstance;

        if (typeof globalThis.window !== "undefined") {
            globalThis.window.devtoolsFormatters =
                globalThis.window.devtoolsFormatters || [];

            const style = {
                unit: "color: #00ffcc; font-weight: bold;",
                instance: "color: #85ffc7; font-weight: bold;",
                slot: "color: #ffaa00; font-weight: bold;",
                gf: "color: #bb86fc; font-weight: bold;",
                method: "color: #64b5f6; font-weight: bold;",
                trait: "color: #f48fb1; font-weight: bold;",
                muted: "color: #888; font-weight: normal;",
                key: "color: #a5d6ff; font-weight: bold;",
                section: "margin-left: 14px; line-height: 1.45;",
            };

            const row = (label, valueObj, labelStyle = style.key) => [
                "div",
                { style: style.section },
                ["span", { style: labelStyle }, `${label}: `],
                valueObj !== null &&
                (typeof valueObj === "object" || typeof valueObj === "function")
                    ? ["object", { object: valueObj }]
                    : ["span", { style: style.muted }, String(valueObj)],
            ];

            const ouroFormatter = {
                __ouroFormatter: true,
                header: function (obj) {
                    if (!obj) return null;

                    // 1. Ouro Class / Unit Frame
                    if (typeof obj === "function" && obj.__meta) {
                        const parentName =
                            obj.__meta.parent?.__meta?.name ||
                            obj.__meta.parent?.name ||
                            "Object";
                        const subCount = (obj.__meta.subclasses || []).length;
                        return [
                            "span",
                            {},
                            [
                                "span",
                                { style: style.unit },
                                `ƒ <${obj.__meta.name}>`,
                            ],
                            [
                                "span",
                                { style: style.muted },
                                ` [Unit :kindOf ${parentName}${subCount ? ` | ${subCount} subclasses` : ""}]`,
                            ],
                        ];
                    }

                    // 2. Slot Metaobject
                    if (
                        globalThis.Slot &&
                        obj instanceof globalThis.Slot &&
                        obj !== globalThis.Slot.prototype
                    ) {
                        const facets = [];
                        if (obj.type)
                            facets.push(
                                `type:${obj.type?.__meta?.name || obj.type?.name || obj.type}`,
                            );
                        if (obj.ifNeeded) facets.push(":ifNeeded");
                        if (obj.onChange) facets.push(":onChange");
                        if (obj.transform) facets.push(":transform");
                        if (obj.validate) facets.push(":validate");
                        return [
                            "span",
                            {},
                            [
                                "span",
                                { style: style.slot },
                                `[Slot ${obj.name}]`,
                            ],
                            [
                                "span",
                                { style: style.muted },
                                ` (${obj.visibility || "public"} ${obj.allocation || "instance"}${facets.length ? " | " + facets.join(" ") : ""})`,
                            ],
                        ];
                    }

                    // 3. GenericFunction
                    if (
                        globalThis.GenericFunction &&
                        obj instanceof globalThis.GenericFunction &&
                        obj !== globalThis.GenericFunction.prototype
                    ) {
                        return [
                            "span",
                            {},
                            [
                                "span",
                                { style: style.gf },
                                `[GenericFunction ${obj.name}()]`,
                            ],
                            [
                                "span",
                                { style: style.muted },
                                ` (${(obj.methods || []).length} methods)`,
                            ],
                        ];
                    }

                    // 4. Method Metaobject
                    if (
                        globalThis.Method &&
                        obj instanceof globalThis.Method &&
                        obj !== globalThis.Method.prototype
                    ) {
                        const specs = (obj.specializers || [])
                            .map(
                                (s) =>
                                    s?.__meta?.name || s?.name || "Any",
                            )
                            .join(", ");
                        return [
                            "span",
                            {},
                            [
                                "span",
                                { style: style.method },
                                `[Method :${obj.qualifier}]`,
                            ],
                            [
                                "span",
                                { style: style.muted },
                                ` (${specs})${obj.isStatic ? " [static]" : ""}`,
                            ],
                        ];
                    }

                    // 5. Trait Metaobject
                    if (
                        globalThis.Trait &&
                        obj instanceof globalThis.Trait &&
                        obj !== globalThis.Trait.prototype
                    ) {
                        return [
                            "span",
                            {},
                            [
                                "span",
                                { style: style.trait },
                                `[Trait ${obj.name || "Anonymous"}]`,
                            ],
                            [
                                "span",
                                { style: style.muted },
                                obj.requires?.length
                                    ? ` requires: [${obj.requires.join(", ")}]`
                                    : "",
                            ],
                        ];
                    }

                    // 6. General Ouro Instance Frame
                    if (
                        typeof obj === "object" &&
                        obj.constructor?.__meta &&
                        obj !== obj.constructor.prototype
                    ) {
                        return [
                            "span",
                            {},
                            [
                                "span",
                                { style: style.instance },
                                `<${obj.constructor.__meta.name}> `,
                            ],
                            [
                                "span",
                                { style: style.muted },
                                JSON.stringify(snapshotInstance(obj)),
                            ],
                        ];
                    }
                    return null;
                },
                hasBody: function (obj) {
                    return Boolean(
                        (typeof obj === "function" && obj.__meta) ||
                            (obj &&
                                typeof obj === "object" &&
                                obj.constructor?.__meta &&
                                obj !== obj.constructor.prototype),
                    );
                },
                body: function (obj) {
                    // 1. Class / Unit Frame Tree
                    if (typeof obj === "function" && obj.__meta) {
                        const rep = obj.inspect ? obj.inspect() : obj.__meta;
                        return [
                            "div",
                            {},
                            row("🧬 Superclass (kindOf)", rep.superclass),
                            row("🌿 Subclasses", rep.subclassRefs || rep.subclasses),
                            row("📂 Public Instance Slots", rep.properties),
                            row("🏛️ Class (Static) Slots", rep.classProperties),
                            row("🔒 Private Slots", rep.privateProperties),
                            row("🎰 Slot Metaobjects & Facets", rep.slots),
                            row("⚙️ Instance Methods", rep.methodsDictionary),
                            row("🏛️ Class Methods", rep.classMethodsDictionary),
                            row("🔒 Private Methods", rep.privateMethodsDictionary),
                            row("🌀 AOP Advices", rep.advices),
                            row("📋 Forward Requirements", rep.requires),
                            row("🧬 Raw __meta", obj.__meta),
                        ];
                    }

                    // 2. Slot Metaobject Tree
                    if (
                        globalThis.Slot &&
                        obj instanceof globalThis.Slot &&
                        obj !== globalThis.Slot.prototype
                    ) {
                        return [
                            "div",
                            {},
                            row("name", obj.name),
                            row("init", obj.init),
                            row("type", obj.type),
                            row("allocation", obj.allocation),
                            row("visibility", obj.visibility),
                            row("ifNeeded", obj.ifNeeded),
                            row("onChange", obj.onChange),
                            row("transform", obj.transform),
                            row("validate", obj.validate),
                            row("symbol", obj.symbol),
                        ];
                    }

                    // 3. GenericFunction Tree
                    if (
                        globalThis.GenericFunction &&
                        obj instanceof globalThis.GenericFunction &&
                        obj !== globalThis.GenericFunction.prototype
                    ) {
                        return [
                            "div",
                            {},
                            row("name", obj.name),
                            row("methods", obj.methods),
                        ];
                    }

                    // 4. Method Metaobject Tree
                    if (
                        globalThis.Method &&
                        obj instanceof globalThis.Method &&
                        obj !== globalThis.Method.prototype
                    ) {
                        return [
                            "div",
                            {},
                            row("qualifier", obj.qualifier),
                            row("isStatic", Boolean(obj.isStatic)),
                            row("specializers", obj.specializers),
                            row("body", obj.body?.__originalFn || obj.body),
                        ];
                    }

                    // 5. General Ouro Instance Frame Tree
                    const rep =
                        typeof Ouro.inspect === "function"
                            ? Ouro.inspect(obj)
                            : { publicProperties: snapshotInstance(obj) };
                    return [
                        "div",
                        {},
                        row("🧬 Class (Unit)", rep.class || obj.constructor),
                        row("⛓️ Lineage", rep.lineageClasses || rep.lineage),
                        row("📂 Public Slots", rep.publicProperties),
                        row("🔒 Private Vault", rep.privateVault),
                        row("🎰 Slot Definitions", rep.slots),
                        row("⚙️ Methods & Accessors", rep.methodsDictionary),
                    ];
                },
            };
            const existingIdx = globalThis.window.devtoolsFormatters.findIndex(
                (f) => f.__ouroFormatter,
            );
            if (existingIdx !== -1) {
                globalThis.window.devtoolsFormatters[existingIdx] =
                    ouroFormatter;
            } else {
                globalThis.window.devtoolsFormatters.push(ouroFormatter);
            }
        }
    },
    function () {
        if (Ouro.devtoolsExtension._mountPrototypeHelpers) {
            globalThis.Metaclass?.bootstrap?.allocateHooks?.delete(
                Ouro.devtoolsExtension._mountPrototypeHelpers,
            );
        }
        if (globalThis.Metaclass?.prototype) {
            delete globalThis.Metaclass.prototype.inspect;
            delete globalThis.Metaclass.prototype.toString;
            globalThis.GenericFunction?._registry
                ?.get("toString")
                ?.removeMethod("primary", globalThis.Metaclass);
        }
        if (globalThis.GenericFunction?.prototype) {
            delete globalThis.GenericFunction.prototype.toString;
            globalThis.GenericFunction._registry
                ?.get("toString")
                ?.removeMethod("primary", globalThis.GenericFunction);
        }
        if (globalThis.Method?.prototype) {
            delete globalThis.Method.prototype.toString;
            globalThis.GenericFunction?._registry
                ?.get("toString")
                ?.removeMethod("primary", globalThis.Method);
        }
        delete Ouro.snapshot;
        delete Ouro.inspect;
    },
);

// END COMMON EXTENSIONS
