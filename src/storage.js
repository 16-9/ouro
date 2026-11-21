/* global Ouro Extension Class GM_getValue GM_setValue GM_deleteValue */
Ouro.storageExtension = new Extension(
  "Storage System",
  "Ouro-native database and table management, bridging legacy BTK storage syntax to Ouro's instance-based architecture.",
  function () {
    // ------------------------------------------------------------------------
    // 1. TABLE METAOBJECT
    // ------------------------------------------------------------------------
    const StorageTable = Class({
      name: "StorageTable",
      properties: {
        public: {
          instance: {
            name: "default",
            key: ["id"],
            rows: {},
          },
        },
      },
      methods: {
        public: {
          instance: {
            initialize: function (name, keyDefinition) {
              this.name = name;
              this.key = Array.isArray(keyDefinition)
                ? keyDefinition
                : typeof keyDefinition === "string" &&
                    keyDefinition.includes("|")
                  ? keyDefinition.split("|")
                  : [keyDefinition];
              this.rows = {};
            },
            calculateKey: function (record) {
              if (typeof record === "string") return record;
              const missing = this.key.filter((k) => !(k in record));
              if (missing.length)
                throw new Error(`Missing key(s): ${missing.join(", ")}`);
              return this.key.map((k) => record[k]).join("|");
            },
            insert: function (record) {
              const k = this.calculateKey(record);
              if (this.rows[k])
                throw new Error(`Duplicate key on insert: ${k}`);
              const now = Date.now();
              this.rows[k] = Object.assign({}, record, {
                created: now,
                modified: now,
              });
            },
            update: function (record) {
              const k = this.calculateKey(record);
              if (!this.rows[k])
                throw new Error(`Missing record on update: ${k}`);
              const c = this.rows[k].created || Date.now();
              this.rows[k] = Object.assign({}, this.rows[k], record, {
                created: c,
                modified: Date.now(),
              });
            },
            upsert: function (record) {
              const k = this.calculateKey(record);
              const existing = this.rows[k] || {};
              const c = existing.created || Date.now();
              this.rows[k] = Object.assign({}, existing, record, {
                created: c,
                modified: Date.now(),
              });
            },
            destroy: function (record) {
              const k = this.calculateKey(record);
              delete this.rows[k];
            },
            select: function (query) {
              const results = { key: this.key, rows: {} };
              for (const [k, row] of Object.entries(this.rows)) {
                if (Object.entries(query).every(([qk, qv]) => row[qk] === qv)) {
                  results.rows[k] = row;
                }
              }
              return results;
            },
          },
        },
      },
    });

    // ------------------------------------------------------------------------
    // 2. DATABASE METAOBJECT
    // ------------------------------------------------------------------------
    const StorageDB = Class({
      name: "StorageDB",
      properties: {
        public: {
          instance: {
            name: "",
            scope: "site",
            autocommit: true,
            tables: {},
          },
        },
      },
      methods: {
        public: {
          instance: {
            initialize: function (name, options = {}, scope = "site") {
              this.name = name;
              this.scope = scope;
              this.autocommit = options.autocommit !== false;
              this.tables = { default: new StorageTable("default", ["id"]) };
              this.load();
            },
            _getDriver: function () {
              // Ties into Ouro's existing GM/Local validation logic
              if (this.scope === "script") {
                if (
                  typeof GM_getValue !== "function" ||
                  typeof GM_setValue !== "function" ||
                  typeof GM_deleteValue !== "function"
                ) {
                  throw new Error(
                    "[StorageDB] Missing @grant headers for GM_getValue / GM_setValue.",
                  );
                }
                return {
                  get: GM_getValue,
                  set: GM_setValue,
                  remove: GM_deleteValue,
                };
              }
              return {
                get: (k) => {
                  try {
                    return JSON.parse(localStorage.getItem(k));
                  } catch (e) {
                    return null;
                  }
                },
                set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
                remove: (k) => localStorage.removeItem(k),
              };
            },
            load: function () {
              const data = this._getDriver().get(this.name);
              if (data && data.tables) {
                for (const [tName, tData] of Object.entries(data.tables)) {
                  const t = new StorageTable(tName, tData.key);
                  t.rows = tData.rows || {};
                  this.tables[tName] = t;
                }
              }
            },
            commit: function () {
              const payload = {
                name: this.name,
                scope: this.scope,
                autocommit: this.autocommit,
                tables: {},
              };
              for (const [tName, table] of Object.entries(this.tables)) {
                payload.tables[tName] = { key: table.key, rows: table.rows };
              }
              this._getDriver().set(this.name, payload);
            },
            commitIfNeeded: function () {
              if (this.autocommit) this.commit();
            },
            getTable: function (name = "default") {
              if (!this.tables[name])
                throw new Error(`Table "${name}" not found`);
              return this.tables[name];
            },
            createTable: function (name, key) {
              if (this.tables[name])
                throw new Error(`Table ${name} already exists`);
              this.tables[name] = new StorageTable(name, key);
              this.commitIfNeeded();
              return this.tables[name];
            },
          },
        },
      },
    });

    // ------------------------------------------------------------------------
    // 3. LEGACY FACADE (For BTK Porting)
    // ------------------------------------------------------------------------
    const BTKStorageFacade = {
      createDB: (name, options, scope) => new StorageDB(name, options, scope),
      createTable: (tableName, key, db) => db.createTable(tableName, key),
      getTable: (tableName, db) => db.getTable(tableName),
      insert: (record, tableName, db) => {
        db.getTable(tableName).insert(record);
        db.commitIfNeeded();
      },
      update: (record, tableName, db) => {
        db.getTable(tableName).update(record);
        db.commitIfNeeded();
      },
      upsert: (record, tableName, db) => {
        db.getTable(tableName).upsert(record);
        db.commitIfNeeded();
      },
      destroy: (record, tableName, db) => {
        db.getTable(tableName).destroy(record);
        db.commitIfNeeded();
      },
      select: (query, tableName, db) => db.getTable(tableName).select(query),
    };

    Ouro.publish("StorageTable", StorageTable);
    Ouro.publish("StorageDB", StorageDB);
    Ouro.publish("BTKStorage", BTKStorageFacade);
  },
);
