import { DB, encode, Hash } from "../deps.ts";
import { Datatype } from "./Datatype.ts";
import { PreparedInsert } from "./PreparedMutation.ts";
import { SchemaAny, TableData, TablesNames } from "./Schema.ts";
// import { sqlQuote } from "./Utils.ts";
// import { Builder } from "./internal/builder.ts";
// import {
//   PreparedInsert,
//   PreparedInsertVariables,
//   PreparedMutation,
// } from "./PreparedMutation.ts";
// import { CreateNode, MutationStmt, QueryStmt } from "./internal/ast.ts";
// import {
//   createValue,
//   DataFromValues,
//   ValueAny,
//   ValuesAny,
// } from "./internal/values.ts";
// import { PreparedQuery } from "./PreparedQuery.ts";
// import { ITER, MakeNilOptional } from "./internal/utils.ts";

export class Database<Schema extends SchemaAny> {
  #db: DB | null = null;
  readonly #schemaQueries: Array<string>;
  readonly schema: Schema;
  readonly fingerpring: number;

  constructor(schema: Schema, id: number) {
    this.#schemaQueries = schemaToQueries(schema);
    this.schema = schema;
    this.fingerpring = fingerprintString(
      // add id to allow same schema
      id + "_" + this.#schemaQueries.join("\n"),
      Math.pow(2, 30)
    );
  }

  #ensureConnected(): DB {
    if (this.#db === null) {
      throw new Error("Not Connected");
    }
    return this.#db;
  }

  connect(path: string) {
    if (this.#db) {
      throw new Error("Database already connected");
    }
    this.#db = new DB(path);
  }

  getUserVersion(): number {
    return this.#ensureConnected().query<[number]>(
      `PRAGMA user_version;`
    )[0][0];
  }

  setUserVersion() {
    this.#ensureConnected().query(`PRAGMA user_version = ${this.fingerpring};`);
  }

  close() {
    if (this.#db) {
      this.#db.close();
      this.#db = null;
    }
  }

  initSchema() {
    const db = this.#ensureConnected();
    const currentTables = db.query(
      `SELECT name, sql FROM sqlite_master WHERE type = 'table'`
    );
    if (currentTables.length) {
      throw new Error(`Cannot init schema on non-empty database`);
    }
    this.#schemaQueries.forEach((query) => {
      console.log("-> " + query);
      db.query(query);
    });
  }

  insert<Name extends TablesNames<Schema>>(
    table: Name,
    data: TableData<Schema, Name>
  ): void {
    const query = this.prepareInsert(table);
    query.execute(data);
    query.finalize();
  }

  prepareInsert<Name extends TablesNames<Schema>>(
    tableName: Name
  ): PreparedInsert<Schema, Name> {
    console.log(tableName);
    throw new Error("Not implemented");
    // const { tables } = this.schema[ITER];
    // const tableSchema = tables.find((t) => t.name === tableName)!;
    // const { columns } = tableSchema[ITER];
    // const variables = Object.fromEntries(
    //   columns.map((col) => {
    //     const iter = col[ITER];
    //     let val: ValueAny = createValue(iter.datatype);
    //     if (iter.nullable) {
    //       val = val.nullable();
    //     }
    //     if (iter.defaultValue) {
    //       val = val.setDefaultValue(iter.defaultValue);
    //     }
    //     return [col.name, val];
    //   })
    // );
    // return this.prepareMutation(variables, () => {
    //   return CreateNode.InsertStmt({
    //     table: CreateNode.TableRef(tableName),
    //     columns: columns.map((col) => CreateNode.ColumnName(col.name)),
    //     values: columns.map((col) => CreateNode.VariableRef(col.name)),
    //   });
    // }) as PreparedInsert<Schema, Name>;
  }

  // prepareMutation(
  //   builder: Builder<Schema, {}, MutationStmt>
  // ): PreparedMutation<Schema, {}>;
  // prepareMutation<Variables extends ValuesAny>(
  //   variables: Variables,
  //   builder: Builder<Schema, Variables, MutationStmt>
  // ): PreparedMutation<Schema, Variables>;
  // prepareMutation<Variables extends ValuesAny>(
  //   arg1: Variables | Builder<Schema, Variables, MutationStmt>,
  //   arg2?: Builder<Schema, Variables, MutationStmt>
  // ): PreparedMutation<Schema, Variables> {
  //   const [variables, builder]: [
  //     Variables,
  //     Builder<Schema, Variables, MutationStmt>
  //   ] = (arg2 === undefined ? [{}, arg1] : [arg1, arg2]) as any;
  //   return new PreparedMutation(
  //     this.#ensureConnected(),
  //     this.schema,
  //     variables,
  //     builder
  //   );
  // }

  // prepareQuery<Row extends ValuesAny>(
  //   builder: Builder<Schema, {}, QueryStmt>,
  //   row: Row
  // ): PreparedQuery<Schema, {}, Row>;
  // prepareQuery<Variables extends ValuesAny, Row extends ValuesAny>(
  //   variables: Variables,
  //   builder: Builder<Schema, Variables, QueryStmt>,
  //   row: Row
  // ): PreparedQuery<Schema, Variables, Row>;
  // prepareQuery<Variables extends ValuesAny, Row extends ValuesAny>(
  //   arg1: Variables | Builder<Schema, Variables, QueryStmt>,
  //   arg2: Builder<Schema, Variables, QueryStmt> | Row,
  //   arg3?: Row
  // ): PreparedQuery<Schema, Variables, Row> {
  //   const [variables, builder, row]: [
  //     Variables,
  //     Builder<Schema, Variables, QueryStmt>,
  //     Row
  //   ] = (arg3 === undefined ? [{}, arg1, arg2] : [arg1, arg2, arg3]) as any;
  //   return new PreparedQuery(
  //     this.#ensureConnected(),
  //     this.schema,
  //     variables,
  //     builder,
  //     row
  //   );
  // }
}

function schemaToQueries(schema: SchemaAny): Array<string> {
  const { config } = schema;
  throw new Error("Not implemented");
  // const parsedRef = foreignKeys.map(
  //   ({ column, references, onDelete, onUpdate }) => {
  //     const [fromTable, fromCol] = column.split(".");
  //     const [refTable, refCol] = references.split(".");
  //     return {
  //       fromTable,
  //       fromCol,
  //       refTable,
  //       refCol,
  //       onDelete,
  //       onUpdate,
  //     };
  //   }
  // );
  // return tables.map((table) => {
  //   const { columns } = table[ITER];
  //   return `CREATE TABLE ${sqlQuote(table.name)} (${columns
  //     .map((col) => {
  //       const { datatype, nullable, primaryKey } = col[ITER];
  //       const colRefs = parsedRef.filter(
  //         (ref) => ref.fromTable === table.name && ref.fromCol === col.name
  //       );
  //       const isPrimary = primaryKey;
  //       const isNotNull = primaryKey || nullable === false;
  //       return [
  //         sqlQuote(col.name),
  //         printDatatype(datatype),
  //         isNotNull && "NOT NULL",
  //         isPrimary && "PRIMARY KEY",
  //         ...colRefs.map((ref) => {
  //           return [
  //             "REFERENCES",
  //             `${sqlQuote(ref.refTable)}(${sqlQuote(ref.refCol)})`,
  //             ref.onUpdate && `ON UPDATE ${ref.onUpdate}`,
  //             ref.onDelete && `ON DELETE ${ref.onDelete}`,
  //           ]
  //             .filter(Boolean)
  //             .join(" ");
  //         }),
  //       ]
  //         .filter(Boolean)
  //         .join(" ");
  //     })
  //     .join(", ")});`;
  // });
}

function printDatatype(datatype: Datatype): string {
  return {
    json: "TEXT",
    text: "TEXT",
    number: "FLOAT",
    integer: "INTEGER",
    date: "FLOAT",
    boolean: "INTEGER",
  }[datatype.kind];
}

function fingerprintString(str: string, max: number): number {
  const hashBuffer = new Hash("md5").digest(encode(str)).data;
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  let result = 0;
  hashArray.forEach((num) => {
    result = (result + num) % max;
  });
  // never return 0
  if (result === 0) {
    return max;
  }
  return result;
}
