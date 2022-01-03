// deno-lint-ignore-file no-explicit-any
import { DB, SqlitePreparedQuery } from "../deps.ts";
import { QueryStmt } from "./internal/ast.ts";
import { printStmt } from "./internal/ast-printer.ts";
import { Builder, createBuilderTools } from "./internal/builder.ts";
import { SchemaBuilderAny } from "./internal/SchemaBuilder.ts";
import {
  DataFromValues,
  parseValues,
  serializeValues,
  ValuesAny,
} from "./internal/values.ts";
import { MakeNilOptional } from "./internal/utils.ts";

export class PreparedQuery<
  Schema extends SchemaBuilderAny,
  Variables extends ValuesAny,
  Row extends ValuesAny
> {
  readonly #schema: Schema;
  readonly #query: SqlitePreparedQuery;
  readonly #variables: Variables;
  readonly #row: Row;

  constructor(
    db: DB,
    schema: Schema,
    variables: Variables,
    builder: Builder<Schema, Variables, QueryStmt>,
    row: Row
  ) {
    this.#schema = schema;
    this.#row = row;
    this.#variables = variables;
    const tools = createBuilderTools(schema, variables);
    const stmt = builder(tools);
    const query = printStmt(stmt);
    this.#query = db.prepareQuery(query);
  }

  allEntries(
    params: MakeNilOptional<DataFromValues<Variables>>
  ): Array<DataFromValues<Row>> {
    const entries = this.#query.allEntries(
      serializeValues(this.#variables, params) as any
    );
    return entries.map((entry) => parseValues(this.#row, entry));
  }

  oneEntry(
    ...args: Variables extends Record<string, never>
      ? []
      : [params: MakeNilOptional<DataFromValues<Variables>>]
  ): DataFromValues<Row> {
    const params = args[0] ?? {};
    const entry = this.#query.oneEntry(
      serializeValues(this.#variables, params) as any
    );
    return parseValues(this.#row, entry);
  }

  maybeOneEntry(
    ...args: Variables extends Record<string, never>
      ? []
      : [params: MakeNilOptional<DataFromValues<Variables>>]
  ): DataFromValues<Row> | null {
    const params = args[0] ?? {};
    const all = this.#query.allEntries(
      serializeValues(this.#variables, params) as any
    );
    if (all.length === 0) {
      return null;
    }
    return parseValues(this.#row, all[0]);
  }

  finalize() {
    return this.#query.finalize();
  }
}
