function inspectOuroInstance(instance) {
  if (!instance) {
    console.warn("Inspect received null or undefined.");
    return null;
  }

  const constructor = instance.constructor;
  const meta = constructor && constructor.__meta ? constructor.__meta : null;
  const className = meta ? meta.name : constructor.name || "AnonymousObject";

  // 1. Harvest Public State / Slots (Enumerable properties on the instance)
  const publicState = {};
  for (const key in instance) {
    if (Object.prototype.hasOwnProperty.call(instance, key)) {
      publicState[key] = instance[key];
    }
  }

  // 2. Harvest Private State (Unwrapping hidden/underscore fields securely)
  const privateState = {};
  Object.getOwnPropertyNames(instance).forEach((key) => {
    if (key.startsWith("_")) {
      privateState[key] = instance[key];
    }
  });

  // 3. Harvest Methods as a Clean Dictionary Hash (Traversing the prototype chain)
  const methods = {};
  let proto = Object.getPrototypeOf(instance);

  while (proto && proto !== Object.prototype) {
    Object.getOwnPropertyNames(proto).forEach((key) => {
      if (key === "constructor") return;
      if (!methods[key]) {
        try {
          const descriptor = Object.getOwnPropertyDescriptor(proto, key);
          if (descriptor) {
            if (typeof descriptor.value === "function") {
              methods[key] = descriptor.value; // Store the actual function reference!
            } else if (descriptor.get || descriptor.set) {
              methods[key] = {
                getter: descriptor.get,
                setter: descriptor.set,
                type: "Accessor (Getter/Setter)",
              };
            }
          }
        } catch (e) {
          methods[key] = "[Inaccessible Descriptor]";
        }
      }
    });
    proto = Object.getPrototypeOf(proto);
  }

  // 4. Print a Beautiful, Structured Console Report
  console.group(
    `%c[Ouro Reflection Inspector] Class: ${className}`,
    "color: #4285F4; font-weight: bold; font-size: 14px;",
  );

  console.group("📂 Public State / Slots:");
  console.table(publicState);
  console.groupEnd();

  console.group("🔒 Private State (Encapsulated C++ / Hidden State):");
  console.table(privateState);
  console.groupEnd();

  console.group("⚙️ Methods & Accessors Dictionary:");
  console.log(methods); // Fully expanded hash map of name -> function
  console.groupEnd();

  if (meta) {
    console.group("🧬 Metaobject Info (__meta):");
    console.log("Class Meta:", meta);
    console.groupEnd();
  }

  console.groupEnd();

  // Return an organized object so you can also query it programmatically
  return {
    className,
    publicState,
    privateState,
    methods,
    meta,
    rawInstance: instance,
  };
}

/**
 * ============================================================================
 * JMOP CORE AUDIT UTILITY (JSON Return Version)
 * ============================================================================
 * Gathers an inventory of all static (constructor) and instance (prototype) keys
 * across the primary foundational components of JMOP into a structured object.
 * ============================================================================
 */
function auditJMOPCoreToJSON() {
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
  };

  const report = {};

  for (const [name, targets] of Object.entries(auditTargets)) {
    report[name] = {
      constructorKeys: targets.constructor
        ? Reflect.ownKeys(targets.constructor)
        : ["[NOT LOADED]"],
      prototypeKeys: targets.prototype
        ? Reflect.ownKeys(targets.prototype)
        : ["[NOT LOADED]"],
    };
  }

  return report;
}

const gist = {
  env: {
    dev: "https://gist.githubusercontent.com/16-9/a97e506f89fdf1a7e5d19bd2c88f89f4/raw/Ouro_dev.js",
    test: "https://gist.githubusercontent.com/16-9/d8c61face62b91d37547651667431887/raw/Ouro_test.js",
    stable:
      "https://gist.githubusercontent.com/16-9/08d096d4cc443e75ec2dd339fbf25e9f/raw/Ouro_stable.js",
  },
  loaded: undefined,
  loader: async (env) => {
    const res = await fetch(gist.env[env]);
    const code = await res.text();
    (0, eval)(code);
    console.info(`Ouro ${env} fetched`);
  },
  load: async (env) => {
    // Added 'async' keyword here
    if (["dev", "stable"].includes(env)) {
      await gist.loader(env);
      Ouro.load();
      gist.loaded = env;
    } else if (env === "test") {
      await gist.loader("dev");
      await gist.loader("test");
      gist.loaded = env;
    }
  },
  freeze: () =>
    JSON.stringify(
      gist,
      (key, value) => {
        if (typeof value === "function") {
          return value.toString();
        }
        return value;
      },
      2,
    ),
  copy: (after) => {
    after = after ? "\n" + after : "";
    const frozen = JSON.stringify(gist.freeze());
    const copyString = `
const frozen = ${frozen};
const gist = JSON.parse(frozen, (key, value) => {if (key !== '' && typeof value === 'string' && (value.includes('=>') || value.startsWith('function'))) {return (0, eval)(\`(\${value})\`); } return value; });${after};
console.info('Gist recreated');
`;
    copy(copyString);
    return copyString;
  },
  reload: () => {
    if (gist.loaded) {
      gist.copy(`gist.load('${gist.loaded}')`);
    } else {
      gist.copy();
    }
    window.location.reload();
  },
  reset: () => {
    gist.loaded = undefined;
    gist.reload();
  },
};
