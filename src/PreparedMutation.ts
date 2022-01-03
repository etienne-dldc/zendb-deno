// deno-lint-ignore-file no-explicit-any
import { DB, SqlitePreparedQuery } from "../deps.ts";
import { MutationStmt } from "./Ast.ts";
import { printStmt } from "./AstPrinter.ts";
import { SchemaAny, TablesNames } from "./Schema.ts";
// import { Builder, createBuilderTools } from "./internal/builder.ts";
// import {
//   SchemaBuilderAny,
//   SchemaTablesNames,
// } from "./internal/SchemaBuilder.ts";
// import {
//   DataFromValues,
//   serializeValues,
//   ValueFromColumn,
//   ValuesAny,
// } from "./internal/values.ts";
// import { ITER, MakeNilOptional } from "./internal/utils.ts";
// import { TableBuilderAny } from "./internal/TableBuilder.ts";

export type PreparedInsert<
  Schema extends SchemaAny,
  Name extends TablesNames<Schema>
> = PreparedMutation<Schema, PreparedInsertVariables<Schema, Name>>;

export type PreparedInsertVariables<
  Schema extends SchemaBuilderAny,
  Name extends SchemaTablesNames<Schema>
> = PreparedInsertVariablesFromTable<
  Extract<Schema[ITER]["tables"][number], { name: Name }>
>;

export type PreparedInsertVariablesFromTable<Table extends TableBuilderAny> = {
  [K in Table[ITER]["columns"][number]["name"]]: ValueFromColumn<
    Extract<Table[ITER]["columns"][number], { name: K }>
  >;
};

export class PreparedMutation<
  Schema extends SchemaAny,
  Variables extends ValuesAny
> {
  readonly #schema: Schema;
  readonly #query: SqlitePreparedQuery;
  readonly #variables: Variables;

  constructor(
    db: DB,
    schema: Schema,
    variables: Variables,
    builder: Builder<Schema, Variables, MutationStmt>
  ) {
    this.#schema = schema;
    this.#variables = variables;
    const tools = createBuilderTools(schema, variables);
    const stmt = builder(tools);
    const query = printStmt(stmt);
    this.#query = db.prepareQuery(query);
  }

  execute(params: MakeNilOptional<DataFromValues<Variables>>): void {
    this.#query.execute(serializeValues(this.#variables, params) as any);
  }

  finalize() {
    return this.#query.finalize();
  }
}
