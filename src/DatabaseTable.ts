// deno-lint-ignore-file no-explicit-any
import { DB, PreparedQuery } from "../deps.ts";
import { serializeDatatype } from "./Datatype.ts";
import { PipeCollection, PipeParent, PipeSingle } from "./Pipe.ts";
import { IndexesAny, SchemaAny, TableResolved } from "./Schema.ts";
import { Select } from "./Select.ts";
import {
  join,
  notNil,
  PRIV,
  sqlQuote,
  traverserFromRowIterator,
} from "./Utils.ts";
import { DataFromValues, serializeValues, ValuesAny } from "./Values.ts";

type QueriesCache = {
  insert: PreparedQuery | null;
  deleteByKey: PreparedQuery | null;
  updateByKey: PreparedQuery | null;
  selectAll: PreparedQuery | null;
};

export class DatabaseTable<
  Name extends string | number | symbol,
  Key,
  Data,
  Indexes extends IndexesAny<Data>
> {
  readonly name: Name;
  readonly schema: SchemaAny;

  private readonly getDb: () => DB;
  private readonly tableConfig: TableResolved;
  private readonly pipeParent: PipeParent<Key>;

  private readonly cache: QueriesCache = {
    insert: null,
    deleteByKey: null,
    updateByKey: null,
    selectAll: null,
  };

  constructor(name: Name, schema: SchemaAny, getDb: () => DB) {
    this.name = name;
    this.schema = schema;
    this.getDb = getDb;
    this.tableConfig = notNil(
      schema.tables.find((table) => table.name === name)
    );
    this.pipeParent = {
      deleteByKey: this.deleteByKey.bind(this),
      insert: this.insertInternal.bind(this),
      updateByKey: this.updateByKey.bind(this),
    };
  }

  private getQuery<Name extends keyof QueriesCache>(
    name: Name,
    create: () => QueriesCache[Name]
  ): NonNullable<QueriesCache[Name]> {
    if (this.cache[name] === null) {
      this.cache[name] = create();
    }
    return this.cache[name] as any;
  }

  private getDeleteByKeyQuery(): PreparedQuery {
    return this.getQuery("deleteByKey", (): PreparedQuery => {
      const db = this.getDb();
      const query = join.space(
        `DELETE FROM ${sqlQuote(this.name)}`,
        `WHERE`,
        `key = $1`
      );
      return db.prepareQuery(query);
    });
  }

  private getUpdateByKeyQuery(): PreparedQuery {
    return this.getQuery("updateByKey", (): PreparedQuery => {
      const db = this.getDb();
      const query = join.space(
        `UPDATE ${sqlQuote(this.name)}`,
        `SET`,
        join.comma(
          `key = :key`, // key
          `data = :data`,
          // rest is indexes
          ...this.tableConfig.indexes.map(
            (index) => `${sqlQuote(index.name)} = :${index.name}`
          )
        ),
        `WHERE`,
        `key = :internal_current_key`
      );
      return db.prepareQuery(query);
    });
  }

  private getInsertQuery(): PreparedQuery {
    return this.getQuery("insert", (): PreparedQuery => {
      const db = this.getDb();
      const query = join.space(
        `INSERT INTO ${sqlQuote(this.name)}`,
        `(`,
        join.comma(
          "key",
          "data",
          ...this.tableConfig.indexes.map((index) => sqlQuote(index.name))
        ),
        `)`,
        `VALUES`,
        `(`,
        join.comma(
          `$1`, // key
          `$2`, // data
          // rest is indexes
          ...this.tableConfig.indexes.map((_index, i) => `$${3 + i}`) // indexes
        ),
        `)`
      );
      return db.prepareQuery(query);
    });
  }

  private getSelectAllQuery(): PreparedQuery {
    return this.getQuery("selectAll", (): PreparedQuery => {
      const db = this.getDb();
      const query = join.space(
        `SELECT key, data FROM ${sqlQuote(this.name)}`,
        `ORDER BY key ASC`
      );
      return db.prepareQuery(query);
    });
  }

  private prepareData(data: unknown): {
    key: Key;
    serailizedKey: any;
    data: string;
    indexes: Array<unknown>;
  } {
    const key = this.tableConfig.key.fn(data);
    const serailizedKey = serializeDatatype(this.tableConfig.key.datatype, key);
    const indexes = this.tableConfig.indexes.map((index) => {
      const val = index.column.fn(data);
      return serializeDatatype(index.column.datatype, val);
    });
    const dataSer = JSON.stringify(this.schema.sanitize(data));
    return { key: key, serailizedKey, data: dataSer, indexes };
  }

  private deleteByKey(key: Key) {
    const serializedKey = serializeDatatype(this.tableConfig.key.datatype, key);
    this.getDeleteByKeyQuery().execute([serializedKey] as any);
  }

  private insertInternal(data: unknown): { newKey: Key } {
    const params = this.prepareData(data);
    this.getInsertQuery().execute([
      params.serailizedKey,
      params.data,
      ...params.indexes,
    ]);
    return { newKey: params.key };
  }

  private updateByKey(key: Key, data: unknown): { updatedKey: Key } {
    const prepared = this.prepareData(data);
    const serializedKey = serializeDatatype(this.tableConfig.key.datatype, key);
    const query = this.getUpdateByKeyQuery();
    const params: Record<string, unknown> = {
      // deno-lint-ignore camelcase
      internal_current_key: serializedKey,
      key: prepared.serailizedKey,
      data: prepared.data,
    };
    this.tableConfig.indexes.forEach((index, i) => {
      params[index.name] = prepared.indexes[i];
    });
    query.execute(params as any);
    return { updatedKey: prepared.key };
  }

  insert(data: Data): PipeSingle<Key, Data, false> {
    const { newKey } = this.insertInternal(data);
    return new PipeSingle({ key: newKey, data }, this.pipeParent);
  }

  prepare(): Select<Name, Key, Data, Indexes, null>;
  prepare<Params extends ValuesAny>(
    params: Params
  ): Select<Name, Key, Data, Indexes, Params>;
  prepare<Params extends ValuesAny>(
    params?: Params
  ): Select<Name, Key, Data, Indexes, Params | null> {
    return new Select({
      table: this.name,
      schema: this.schema,
      params: params ?? null,
      where: null,
      limit: null,
      offset: null,
      sort: null,
    });
  }

  select(
    query: Select<Name, Key, Data, Indexes, null>
  ): PipeCollection<Key, Data>;
  select<Params extends ValuesAny>(
    query: Select<Name, Key, Data, Indexes, Params>,
    params: DataFromValues<Params>
  ): PipeCollection<Key, Data>;
  select<Params extends ValuesAny | null>(
    query: Select<Name, Key, Data, Indexes, Params>,
    params?: Params extends ValuesAny ? DataFromValues<Params> : null
  ): PipeCollection<Key, Data> {
    const db = this.getDb();
    const preparedQuery = query[PRIV].getQuery(db);
    const paramsValues = query[PRIV].params;
    const paramsSerialized =
      paramsValues === null ? {} : serializeValues(paramsValues, params as any);
    const iter = preparedQuery.iter(paramsSerialized as any);
    return new PipeCollection(
      traverserFromRowIterator<Key, string, Data>(
        iter,
        (data) => this.schema.restore(JSON.parse(data)) as any
      ),
      this.pipeParent
    );
  }

  all(): PipeCollection<Key, Data> {
    const iter = this.getSelectAllQuery().iter();
    return new PipeCollection(
      traverserFromRowIterator<Key, string, Data>(
        iter as any,
        (data) => this.schema.restore(JSON.parse(data)) as any
      ),
      this.pipeParent
    );
  }

  findByKey(_value: Key): PipeSingle<Key, Data, true> {
    throw new Error("Not Implemented");
  }

  findBy<IndexName extends keyof Indexes>(
    _indexName: IndexName,
    _value: Indexes[IndexName][PRIV]
  ): PipeCollection<Key, Data> {
    throw new Error("Not Implemented");
  }

  count(): number {
    throw new Error("Not Implemented");
  }
}
