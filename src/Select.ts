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
  orderBy: Array<Expr> | null;
  limit: { limit: Expr; offset: Expr | null } | null;
  getQuery(db: DB): PreparedQuery<[Key, string], { key: Key; data: string }>;
};

export type IndexesRefs<Indexes extends IndexesAny<any>> = {
  [K in Indexes[number]["name"]]: IndexRef;
};

export type ParamsRef<Params extends ValuesAny> = {
  [K in keyof Params]: ParamRef;
};

export type ToolsFn<
  Indexes extends IndexesAny<any>,
  Params extends ValuesAny | null,
  Res
> = (tools: SelectTools<Indexes, Params>) => Res;

export type ValOrToolsFn<
  Indexes extends IndexesAny<any>,
  Params extends ValuesAny | null,
  Res
> = Res | ToolsFn<Indexes, Params, Res>;

export type ExprOrExprFn<
  Indexes extends IndexesAny<any>,
  Params extends ValuesAny | null
> = ValOrToolsFn<Indexes, Params, Expr>;

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
  private readonly tableConfig: TableResolved;
  private cachedQuery: PreparedQuery<
    [Key, string],
    { key: Key; data: string }
  > | null = null;

  readonly [PRIV]: SelectInternal<Name, Key, Data, Params>;

  constructor(
    internal: Omit<SelectInternal<Name, Key, Data, Params>, "getQuery">
  ) {
    this[PRIV] = {
      ...internal,
      getQuery: this.getQuery.bind(this),
    };
    this.tableConfig = notNil(
      internal.schema.tables.find((table) => table.name === internal.table)
    );
  }

  private getQuery(
    db: DB
  ): PreparedQuery<[Key, string], { key: Key; data: string }> {
    if (this.cachedQuery) {
      return this.cachedQuery;
    }
    const { where, limit, orderBy } = this[PRIV];
    const query = join.space(
      `SELECT key, data FROM`,
      sqlQuote(this.tableConfig.name),
      where ? join.space(`WHERE`, printExpression(where)) : null,
      orderBy
        ? join.space(
            `ORDER BY`,
            join.comma(...orderBy.map((expr) => printExpression(expr)))
          )
        : null,
      limit
        ? join.space(
            `LIMIT`,
            printExpression(limit.limit),
            limit.offset
              ? join.space(`OFFSET`, printExpression(limit.offset))
              : null
          )
        : null
    );
    this.cachedQuery = db.prepareQuery(query);
    return this.cachedQuery;
  }

  finalize() {
    if (this.cachedQuery) {
      this.cachedQuery.finalize();
      this.cachedQuery = null;
    }
  }

  where(
    expr: ExprOrExprFn<Indexes, Params>
  ): Select<Name, Key, Data, Indexes, Params> {
    return new Select({
      ...this[PRIV],
      where: this.resolveValOrToolsFn(expr, this[PRIV].params),
    });
  }

  limit(
    limit: ExprOrExprFn<Indexes, Params>,
    offset: ExprOrExprFn<Indexes, Params> | null = null
  ): Select<Name, Key, Data, Indexes, Params> {
    return new Select({
      ...this[PRIV],
      limit: {
        limit: this.resolveValOrToolsFn(limit, this[PRIV].params),
        offset:
          offset === null
            ? null
            : this.resolveValOrToolsFn(offset, this[PRIV].params),
      },
    });
  }

  orderBy(
    expr: ValOrToolsFn<Indexes, Params, Array<Expr>>
  ): Select<Name, Key, Data, Indexes, Params> {
    return new Select({
      ...this[PRIV],
      orderBy: this.resolveValOrToolsFn(expr, this[PRIV].params),
    });
  }

  private resolveValOrToolsFn<Res>(
    value: ValOrToolsFn<Indexes, Params, Res>,
    params: Params
  ): Res {
    if (typeof value === "function") {
      const paramsRefs = mapObject(params ?? {}, ((
        paramName: string
      ): ParamRef => {
        return { kind: "ParamRef", [PRIV]: paramName };
      }) as any);
      const indexesRefs = Object.fromEntries(
        this.tableConfig.indexes.map((index) => {
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
      return (value as any)(tools);
    }
    return value;
  }
}
