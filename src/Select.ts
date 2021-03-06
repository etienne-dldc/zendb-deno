// deno-lint-ignore-file ban-types no-explicit-any

import { DB, PreparedQuery } from "../deps.ts";
import { Expr, IndexRef, ParamRef, printExpression } from "./Expression.ts";
import { SchemaAny, IndexesAny, TableResolved } from "./Schema.ts";
import { PRIV, join, mapObject, notNil, sqlQuote } from "./Utils.ts";
import { ValuesAny } from "./Values.ts";

export type SelectInternalData<
  Name extends string | number | symbol,
  Params extends ValuesAny | null
> = {
  table: Name;
  schema: SchemaAny;
  params: Params;
  where: Expr | null;
  orderBy: Array<Expr> | null;
  limit: { limit: Expr; offset: Expr | null } | null;
};

export type SelectInternalFunctions<Key> = {
  getSelectQuery(
    db: DB
  ): PreparedQuery<[Key, string], { key: Key; data: string }>;
  getCountQuery(db: DB): PreparedQuery<[number], { count: number }>;
};

export type SelectInternal<
  Name extends string | number | symbol,
  Key,
  Params extends ValuesAny | null
> = SelectInternalData<Name, Params> & SelectInternalFunctions<Key>;

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

type QueriesCache<Key> = {
  select: PreparedQuery<[Key, string], { key: Key; data: string }> | null;
  count: PreparedQuery<[number], { count: number }> | null;
};

export class Select<
  Name extends string | number | symbol,
  Key,
  Data,
  Indexes extends IndexesAny<any>,
  Params extends ValuesAny | null
> {
  private readonly tableConfig: TableResolved;
  private readonly cache: QueriesCache<Key> = {
    select: null,
    count: null,
  };

  readonly [PRIV]: SelectInternal<Name, Key, Params>;

  constructor(internal: SelectInternalData<Name, Params>) {
    this[PRIV] = {
      ...internal,
      getSelectQuery: this.getSelectQuery.bind(this),
      getCountQuery: this.getCountQuery.bind(this),
    };
    this.tableConfig = notNil(
      internal.schema.tables.find((table) => table.name === internal.table)
    );
  }

  private getQuery<Name extends keyof QueriesCache<Key>>(
    name: Name,
    create: () => QueriesCache<Key>[Name]
  ): NonNullable<QueriesCache<Key>[Name]> {
    if (this.cache[name] === null) {
      this.cache[name] = create();
    }
    return this.cache[name] as any;
  }

  private getSelectQuery(
    db: DB
  ): PreparedQuery<[Key, string], { key: Key; data: string }> {
    return this.getQuery("select", () => {
      const query = join.space(`SELECT key, data`, this.getQueryFromClause());
      return db.prepareQuery(query);
    });
  }

  private getCountQuery(db: DB) {
    return this.getQuery("count", () => {
      const query = join.space(
        `SELECT COUNT(*) AS count`,
        this.getQueryFromClause()
      );
      return db.prepareQuery(query);
    });
  }

  private getQueryFromClause(): string {
    const { where, limit, orderBy } = this[PRIV];
    return join.space(
      `FROM`,
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
  }

  finalize() {
    Object.entries(this.cache).forEach(([name, query]) => {
      if (query) {
        query.finalize();
        (this.cache as any)[name] = null;
      }
    });
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
