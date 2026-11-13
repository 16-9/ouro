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
    const VERSION = "2.0.0";

    // --- INTERNAL NAMESPACE & STATE ---
    let isLoaded = false;
    let Class,
        Metaclass,
        Method,
        GenericFunction,
        Extension,
        ExtensionPackage,
        Ouro_API;

    const Vocabulary = {
        name: "name",
        description: "description",
        kindOf: "kindOf",
        properties: "properties",
        methods: "methods",
    };
    const v = Vocabulary;

    const banner ="
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
";

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

        function matchesLineage(startClass, target) {
            if (!target) return false;
            const isName = typeof target === "string";
            let curr = startClass;
            while (curr && curr.__meta) {
                if (
                    isName
                        ? curr.__meta.name === target
                        : curr === target || curr.__meta.name === target.name
                ) {
                    return true;
                }
                curr = curr.__meta.parent;
            }
            return false;
        }

        function allocate(definition, parentClass = Object) {
            const className = definition[v.name] || "AnonymousClass";

            const fns = {
                [className]: function (...args) {
                    this.constructor.__meta?.instances.add(this);

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

            const meta = {
                name: className,
                description: definition[v.description] || "",
                parent: parentClass,
                subclasses: [],
                instances: new WeakSet(),
            };

            Object.defineProperty(rawClass, "__meta", {
                get: function () {
                    return this !== rawClass ? undefined : meta;
                },
                enumerable: false,
                configurable: false,
            });

            if (Array.isArray(parentClass.__meta?.subclasses)) {
                parentClass.__meta.subclasses.push(className);
            }

            return rawClass;
        }
        return {
            allocate,
            isCloneable,
            cloneValue,
            ensurePrivateVault,
            matchesLineage,
            PrivateStateRegistry,
            PrivateSymbol,
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
        Object.defineProperty(newClass, "__private", {
            value: {
                instance: {
                    ...(parentClass.__private?.instance || {}),
                    ...(definition[v.properties]?.private?.instance || {}),
                },
                class: {
                    ...(parentClass.__private?.class || {}),
                    definition: definition,
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

                                const backingSymbol =
                                    existingSlot?.symbol ||
                                    existingSlot ||
                                    Symbol(`Ouro.slot.${propName}`);
                                const defaultVal = descriptor.value;
                                const needsClone =
                                    !isStatic &&
                                    Bootstrap.isCloneable(defaultVal);
                                const slotMetaobject = {
                                    symbol: backingSymbol,
                                    get: (recv) => {
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
                                        return recv[backingSymbol];
                                    },
                                    set: (recv, val) => {
                                        recv[backingSymbol] = val;
                                    },
                                };
                                classConstructor.__meta.slotSymbols[propName] =
                                    slotMetaobject;

                                const hasAccessor =
                                    descriptor.get !== undefined ||
                                    descriptor.set !== undefined;

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
                                    target[backingSymbol] = descriptor.value;
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
                    addMethods: function (matrixObj) {
                        if (!matrixObj) return;
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
                                const slotObj =
                                    classConstructor.__meta.slotSymbols[
                                        propName
                                    ];
                                const backingSymbol =
                                    slotObj?.symbol ||
                                    slotObj ||
                                    Symbol(`Ouro.slot.${propName}`);
                                classConstructor.__meta.slotSymbols[propName] =
                                    backingSymbol;

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
                                        return recv[backingSymbol];
                                    }
                                    if (hasAccessor) {
                                        if (originalSet)
                                            originalSet.call(recv, val);
                                    } else {
                                        recv[backingSymbol] = val;
                                    }
                                    return val;
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
    Metaclass.bootstrap = { allocate: Bootstrap.allocate, forgeConstructor };

    Class = function (definition) {
        const className = definition?.[v.name];
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
                    getSpecializers: function () {
                        return this.specializers;
                    },
                    getBody: function () {
                        return this.body;
                    },
                    getQualifier: function () {
                        return this.qualifier;
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
                    getMethods: function () {
                        return this.methods;
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
    Ouro_API.publish("Class", Class);
    Ouro_API.publish("Metaclass", Metaclass);
    Ouro_API.publish("GenericFunction", GenericFunction);
    Ouro_API.publish("Method", Method);
    Ouro_API.publish("Extension", Extension);
    Ouro_API.publish("ExtensionPackage", ExtensionPackage);

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
        Ouro.extendVocabulary = function (semanticKey, stringLiteral) {
            Ouro.Vocabulary[semanticKey] = stringLiteral;
            Ouro.ReservedKeys.add(stringLiteral);
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

            const extraKeys = Object.keys(overrides).filter(
                (k) =>
                    ![
                        v.name,
                        "name",
                        v.description,
                        "description",
                        v.kindOf,
                        "kindOf",
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

        Ouro.normalizeMatrix = function (
            d,
            additionalSkips = [],
            defaultSection = null,
        ) {
            if (!d || typeof d !== "object") return d;

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

                for (const key of Object.getOwnPropertyNames(node)) {
                    if (
                        defaultSection === null &&
                        context === rootContext &&
                        topLevelSkips.includes(key)
                    )
                        continue;

                    const descriptor = Object.getOwnPropertyDescriptor(
                        node,
                        key,
                    );
                    const isAccessor =
                        descriptor &&
                        (descriptor.get !== undefined ||
                            descriptor.set !== undefined);
                    const val = isAccessor ? null : node[key];

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
                            Object.defineProperty(targetProps, key, descriptor);
                        } else if (isMethod) {
                            const targetContainer =
                                context.qualifier !== "primary"
                                    ? strict[v.methods][context.qualifier][
                                          alloc
                                      ]
                                    : strict[v.methods][context.visibility][
                                          alloc
                                      ];
                            targetContainer[key] = val;
                        } else {
                            const targetProps =
                                strict[v.properties][context.visibility][alloc];
                            targetProps[key] = val;
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
                                for (const m of gf.getMethods()) {
                                    const spec = m.getSpecializers()[0];
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
    "Provides runtime reflection (#7, #10, #13) and GenericFunction-powered blueprint serialization (#8, #17).",
    function () {
        if (
            typeof globalThis.Metaclass === "undefined" ||
            !globalThis.Metaclass
        )
            return;

        const v = Ouro.Vocabulary;
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
                    getSlots: function () {
                        return { ...(this.__meta.slotSymbols || {}) };
                    },
                    getForwardDeclarations: function () {
                        const reqKey = v.requires || "requires";
                        const rawDef = this.__private?.class?.definition;
                        const set = new Set(
                            this.__meta.forwardDeclarations || [],
                        );
                        if (Array.isArray(rawDef?.[reqKey])) {
                            for (const req of rawDef[reqKey]) {
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
                                    out[gf.name] = m.getBody();
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
                const rawDef = cls.__private?.class?.definition || {};
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

                for (const [k, desc] of Object.entries(
                    Object.getOwnPropertyDescriptors(pubInstProps),
                )) {
                    if ("value" in desc) {
                        lines.push(`    ${k}: ${serializeValue(desc.value)},`);
                    }
                }

                if (Object.keys(pubClassProps).length > 0) {
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
                    lines.push("    },");
                }

                if (
                    Object.keys(privInstProps).length > 0 ||
                    Object.keys(privClassProps).length > 0
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
                    if (Object.keys(privClassProps).length > 0) {
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
                        lines.push("        },");
                    }
                    lines.push("    },");
                }

                const rawMethods = rawDef[v.methods]?.public?.instance || {};
                for (const [mName, fn] of Object.entries(rawMethods)) {
                    if (mName === "addTrait") continue;
                    lines.push(`    ${mName}: ${serializeValue(fn)},`);
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

        if (globalThis.GenericFunction) {
            globalThis.GenericFunction.addMethods({
                public: {
                    instance: {
                        toString: function () {
                            return `[GenericFunction: ${this.name}() routing ${this.methods.length} methods]`;
                        },
                    },
                },
            });
        }

        if (globalThis.Method) {
            globalThis.Method.addMethods({
                public: {
                    instance: {
                        toString: function () {
                            const specs = this.specializers
                                .map((s) =>
                                    s && s.getName
                                        ? s.getName()
                                        : s?.name || "Any",
                                )
                                .join(", ");
                            return `[Method: :${this.qualifier} (${specs})]`;
                        },
                    },
                },
            });
        }
    },
    function () {
        const mToRemove = [
            "getName",
            "getKindOf",
            "getSubclasses",
            "superclass",
            "subclasses",
            "getInstances",
            "getBlueprint",
            "getSlots",
            "getForwardDeclarations",
            "isComplete",
            "getProperties",
            "getMethods",
            "getAdvices",
            "getAttachedMethods",
            "stringify",
            "toString",
        ];
        if (globalThis.Metaclass?.prototype)
            mToRemove.forEach((m) => delete globalThis.Metaclass.prototype[m]);
        if (globalThis.GenericFunction?.prototype)
            delete globalThis.GenericFunction.prototype.toString;
        if (globalThis.Method?.prototype)
            delete globalThis.Method.prototype.toString;
        delete Ouro.stringify;
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

        Ouro.publish(
            "Trait",
            globalThis.Class({
                name: "Trait",
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
                                if (
                                    typeof Ouro.normalizeMatrix === "function"
                                ) {
                                    Ouro.normalizeMatrix(definition, [
                                        "native",
                                        "delegateTo",
                                        "only",
                                        "alias",
                                    ]);
                                }
                                this.name = definition.name || this.name;
                                this.matrix = definition;

                                if (definition.native) {
                                    this.isNativeDelegation = true;
                                    this.matrix.properties =
                                        this.matrix.properties || {};
                                    this.matrix.properties.public =
                                        this.matrix.properties.public || {};
                                    this.matrix.properties.public.instance =
                                        this.matrix.properties.public
                                            .instance || {};
                                    var props =
                                        this.matrix.properties.public.instance;

                                    this.matrix.methods =
                                        this.matrix.methods || {};
                                    this.matrix.methods.public =
                                        this.matrix.methods.public || {};
                                    this.matrix.methods.public.instance =
                                        this.matrix.methods.public.instance ||
                                        {};
                                    var meths =
                                        this.matrix.methods.public.instance;

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
                                            desc =
                                                Object.getOwnPropertyDescriptor(
                                                    currentProto,
                                                    key,
                                                );
                                            currentProto =
                                                Object.getPrototypeOf(
                                                    currentProto,
                                                );
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
                                            Object.defineProperty(
                                                props,
                                                finalKey,
                                                {
                                                    get: function () {
                                                        var target =
                                                            getTarget(this);
                                                        return target
                                                            ? target[key]
                                                            : undefined;
                                                    },
                                                    set: function (val) {
                                                        var target =
                                                            getTarget(this);
                                                        if (target)
                                                            target[key] = val;
                                                    },
                                                    enumerable: true,
                                                    configurable: true,
                                                },
                                            );
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
                                    "native" +
                                        (nativeConstructor.name || "Object");
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

                                traitDef.properties.private.instance[
                                    privateKey
                                ] = null;
                                traitDef.methods.public.instance[
                                    publicAccessor
                                ] = function () {
                                    return this[privateKey];
                                };

                                return new globalThis.Trait(traitDef);
                            },
                        },
                    },
                },
            }),
        );

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

        const createStorageTrait = (driver) => {
            return new globalThis.Trait({
                name: `StorageTrait_${driver.name}`,
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
        };

        const LocalCacheable = createStorageTrait(LocalDriver);
        Ouro.publish("LocalCacheable", LocalCacheable);
        Ouro.publish("localCache", LocalCacheable);
        Ouro.publish("domainCache", LocalCacheable);

        const SessionCacheable = createStorageTrait(SessionDriver);
        Ouro.publish("SessionCacheable", SessionCacheable);
        Ouro.publish("sessionCache", SessionCacheable);

        const GlobalCacheable = createStorageTrait(GlobalDriver);
        Ouro.publish("GlobalCacheable", GlobalCacheable);
        Ouro.publish("globalCache", GlobalCacheable);

        const WithKey = (keyExtractor) => {
            const safeKeyName =
                typeof keyExtractor === "string"
                    ? keyExtractor.replace(/[^a-zA-Z0-9]/g, "_")
                    : "Dynamic";
            return new globalThis.Trait({
                name: `WithKey_${safeKeyName}`,
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

// 6. DevTools Display Sugar Extension (#9)
Ouro.devtoolsExtension = new Ouro.Extension(
    "DevTools Display Sugar",
    "Custom formatting, clean slot snapshot inspection, and browser DevTools formatter registration for Ouro classes and instances.",
    function () {
        const snapshotInstance = function (inst) {
            if (!inst || typeof inst !== "object") return inst;
            const out = {};
            let curr = inst.constructor;
            while (curr && curr.__meta) {
                const slots = curr.__meta.slotSymbols || {};
                for (const propName of Object.keys(slots)) {
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

        if (globalThis.Metaclass) {
            globalThis.Metaclass.addMethods({
                public: {
                    instance: {
                        inspect: function () {
                            return {
                                class: this.__meta?.name,
                                kindOf:
                                    this.__meta?.parent?.__meta?.name ||
                                    this.__meta?.parent?.name ||
                                    "Object",
                                subclasses: [
                                    ...(this.__meta?.subclasses || []),
                                ],
                                properties: this.getProperties
                                    ? this.getProperties("public", "instance")
                                    : {},
                                classProperties: this.getProperties
                                    ? this.getProperties("public", "class")
                                    : {},
                                methods: this.getMethods
                                    ? Object.keys(
                                          this.getMethods("public", "instance"),
                                      )
                                    : [],
                                requires: this.getForwardDeclarations
                                    ? this.getForwardDeclarations()
                                    : [],
                            };
                        },
                    },
                },
                after: {
                    class: {
                        forge: function (definition) {
                            const v = Ouro.Vocabulary;
                            const className = definition?.[v.name];
                            if (!className) return;
                            const cls = globalThis[className];
                            if (
                                cls &&
                                cls.prototype &&
                                !("toSnapshot" in cls.prototype)
                            ) {
                                Object.defineProperty(
                                    cls.prototype,
                                    "toSnapshot",
                                    {
                                        value: function () {
                                            return snapshotInstance(this);
                                        },
                                        writable: true,
                                        configurable: true,
                                        enumerable: false,
                                    },
                                );
                            }
                        },
                    },
                },
            });
        }

        Ouro.snapshot = snapshotInstance;

        if (typeof globalThis.window !== "undefined") {
            globalThis.window.devtoolsFormatters =
                globalThis.window.devtoolsFormatters || [];
            const ouroFormatter = {
                __ouroFormatter: true,
                header: function (obj) {
                    if (!obj) return null;
                    if (typeof obj === "function" && obj.__meta) {
                        return [
                            "span",
                            { style: "color: #00ffcc; font-weight: bold;" },
                            `ƒ <${obj.__meta.name}> Class`,
                        ];
                    }
                    if (
                        typeof obj === "object" &&
                        obj.constructor?.__meta &&
                        obj !== obj.constructor.prototype
                    ) {
                        return [
                            "span",
                            { style: "color: #85ffc7;" },
                            `${obj.constructor.__meta.name} `,
                            [
                                "span",
                                { style: "color: #aaa; font-weight: normal;" },
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
                    const data =
                        typeof obj === "function" && obj.__meta
                            ? obj.inspect?.() || obj.__meta
                            : snapshotInstance(obj);
                    return ["div", {}, ["object", { object: data }]];
                },
            };
            if (
                !globalThis.window.devtoolsFormatters.some(
                    (f) => f.__ouroFormatter,
                )
            ) {
                globalThis.window.devtoolsFormatters.push(ouroFormatter);
            }
        }
    },
    function () {
        if (globalThis.Metaclass?.prototype) {
            delete globalThis.Metaclass.prototype.inspect;
        }
        delete Ouro.snapshot;
    },
);

// END COMMON EXTENSIONS
