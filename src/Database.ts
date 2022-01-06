// deno-lint-ignore-file no-explicit-any
import { DB } from "../deps.ts";
import { DatabaseTable } from "./DatabaseTable.ts";
import { printDatatype } from "./Datatype.ts";
import { SchemaAny } from "./Schema.ts";
import { PRIV, join, sqlQuote, fingerprintString } from "./Utils.ts";

export class Database<Schema extends SchemaAny> {
  private db: DB | null = null;
  private readonly schemaQueries: Array<string>;

  readonly schema: Schema;
  readonly fingerpring: number;
  readonly tables: {
    [K in keyof Schema[PRIV]]: DatabaseTable<
      K,
      Schema[PRIV][K][PRIV]["key"],
      Schema[PRIV][K][PRIV]["data"],
      Schema[PRIV][K][PRIV]["indexes"]
    >;
  };

  constructor(schema: Schema, id: number) {
    this.schemaQueries = this.schemaToQueries(schema);
    this.schema = schema;
    this.fingerpring = fingerprintString(
      // add id to allow same schema in multiple mutations (different hash)
      id + "_" + this.schemaQueries.join("\n"),
      Math.pow(2, 30)
    );
    const getDb = this.ensureConnected.bind(this);
    this.tables = Object.fromEntries(
      schema.tables.map(
        (table): [string, DatabaseTable<string, any, any, any>] => {
          return [table.name, new DatabaseTable(table.name, schema, getDb)];
        }
      )
    ) as any;
  }

  connect(path: string) {
    if (this.db) {
      throw new Error("Database already connected");
    }
    this.db = new DB(path);
  }

  getUserVersion(): number {
    return this.ensureConnected().query<[number]>(`PRAGMA user_version;`)[0][0];
  }

  setUserVersion() {
    this.ensureConnected().query(`PRAGMA user_version = ${this.fingerpring};`);
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  initSchema() {
    const db = this.ensureConnected();
    const currentTables = db.query(
      `SELECT name, sql FROM sqlite_master WHERE type = 'table'`
    );
    if (currentTables.length) {
      throw new Error(`Cannot init schema on non-empty database`);
    }
    this.schemaQueries.forEach((query) => {
      console.log("-> " + query);
      db.query(query);
    });
  }

  private ensureConnected(): DB {
    if (this.db === null) {
      throw new Error("Not Connected");
    }
    return this.db;
  }

  private schemaToQueries(schema: SchemaAny): Array<string> {
    const { tables } = schema;
    return tables.map((table) => {
      return join.all(
        `CREATE TABLE ${sqlQuote(table.name)}`,
        `(`,
        join.comma(
          `key ${printDatatype(
            table.key.column.datatype
          )} PRIMARY KEY NOT NULL`,
          `data JSON`,
          ...table.indexes.map(
            ({ name, column: { datatype, nullable, primary, unique } }) => {
              const notNull = nullable === false;
              return join.space(
                sqlQuote(name),
                printDatatype(datatype),
                primary ? "PRIMARY KEY" : null,
                notNull ? "NOT NULL" : null,
                unique ? "UNIQUE" : null
              );
            }
          )
        ),
        ");"
      );
    });
  }
}
