// deno-lint-ignore-file ban-types no-explicit-any

import { DB, PreparedQuery } from "../deps.ts";
import { Expr, IndexRef, ParamRef, printExpression } from "./Expression.ts";
import { SchemaAny, IndexesAny, TableResolved } from "./Schema.ts";
import { PRIV, join, mapObject, notNil, sqlQuote } from "./Utils.ts";
import { ValuesAny } from "./Values.ts";

type SelectInternal<
  Name extends string | number | symbol,
  Key,
  Data,
  Params extends ValuesAny | null
> = {
  table: Name;
  schema: SchemaAny;
  params: Params;
  where: Expr | null;
  limit: Expr | null;
  offset: Expr | null;
  sort: Expr | null;
  getQuery(db: DB): PreparedQuery<[Key, string], { key: Key; data: string }>;
};

export type IndexesRefs<Indexes extends IndexesAny<any>> = {
  [K in keyof Indexes]: IndexRef;
};

export type ParamsRef<Params extends ValuesAny> = {
  [K in keyof Params]: ParamRef;
};

export type ExprOrExprFn<
  Indexes extends IndexesAny<any>,
  Params extends ValuesAny | null
> = Expr | ((tools: SelectTools<Indexes, Params>) => Expr);

export type SelectTools<
  Indexes extends IndexesAny<any>,
  Params extends ValuesAny | null
> = {
  indexes: IndexesRefs<Indexes>;
  params: Params extends ValuesAny ? ParamsRef<Params> : {};
};

export class Select<
  Name extends string | number | symbol,
  Key,
  Data,
  Indexes extends IndexesAny<any>,
  Params extends ValuesAny | null
> {
  readonly [PRIV]: SelectInternal<Name, Key, Data, Params>;
  #tableConfig: TableResolved;
  #cachedQuery: PreparedQuery<
    [Key, string],
    { key: Key; data: string }
  > | null = null;

  constructor(
    internal: Omit<SelectInternal<Name, Key, Data, Params>, "getQuery">
  ) {
    this[PRIV] = {
      ...internal,
      getQuery: this.#getQuery.bind(this),
    };
    this.#tableConfig = notNil(
      internal.schema.tables.find((table) => table.name === internal.table)
    );
  }

  #getQuery(db: DB): PreparedQuery<[Key, string], { key: Key; data: string }> {
    if (this.#cachedQuery) {
      return this.#cachedQuery;
    }
    const { where, limit, offset, sort } = this[PRIV];
    if (limit || offset || sort) {
      throw new Error("Limit, offset and sort not supported yet");
    }
    const query = join.space(
      `SELECT key, data FROM`,
      sqlQuote(this.#tableConfig.name),
      where ? join.space(`WHERE`, printExpression(where)) : null
    );
    this.#cachedQuery = db.prepareQuery(query);
    return this.#cachedQuery;
  }

  finalize() {
    if (this.#cachedQuery) {
      this.#cachedQuery.finalize();
      this.#cachedQuery = null;
    }
  }

  where(
    expr: ExprOrExprFn<Indexes, Params>
  ): Select<Name, Key, Data, Indexes, Params> {
    return new Select({
      ...this[PRIV],
      where: this.#resolveExprOrExprFn(expr, this[PRIV].params),
    });
  }

  limit(
    expr: ExprOrExprFn<Indexes, Params>
  ): Select<Name, Key, Data, Indexes, Params> {
    return new Select({
      ...this[PRIV],
      limit: this.#resolveExprOrExprFn(expr, this[PRIV].params),
    });
  }

  offset(
    expr: ExprOrExprFn<Indexes, Params>
  ): Select<Name, Key, Data, Indexes, Params> {
    return new Select({
      ...this[PRIV],
      offset: this.#resolveExprOrExprFn(expr, this[PRIV].params),
    });
  }

  sort(
    expr: ExprOrExprFn<Indexes, Params>
  ): Select<Name, Key, Data, Indexes, Params> {
    return new Select({
      ...this[PRIV],
      sort: this.#resolveExprOrExprFn(expr, this[PRIV].params),
    });
  }

  #resolveExprOrExprFn(
    expr: ExprOrExprFn<Indexes, Params>,
    params: Params
  ): Expr {
    if (typeof expr === "function") {
      const paramsRefs = mapObject(params ?? {}, ((
        paramName: string
      ): ParamRef => {
        return { kind: "ParamRef", [PRIV]: paramName };
      }) as any);
      const indexesRefs = Object.fromEntries(
        this.#tableConfig.indexes.map((index) => {
          return [
            index.name,
            {
              kind: "IndexRef",
              [PRIV]: index.name,
            },
          ];
        })
      );
      const tools: SelectTools<Indexes, Params> = {
        indexes: indexesRefs as any,
        params: paramsRefs as any,
      };
      return expr(tools);
    }
    return expr;
  }
}
