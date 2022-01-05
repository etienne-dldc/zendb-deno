// deno-lint-ignore-file no-explicit-any
import { DB, PreparedQuery } from "../deps.ts";
import { serializeDatatype } from "./Datatype.ts";
import { PipeCollection, PipeSingle } from "./Pipe.ts";
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

export class DatabaseTable<
  Name extends string | number | symbol,
  Key,
  Data,
  Indexes extends IndexesAny<Data>
> {
  readonly #name: Name;
  readonly #schema: SchemaAny;
  readonly #getDb: () => DB;
  readonly #tableConfig: TableResolved;
  #insertPreparedQuery: PreparedQuery | null = null;

  constructor(name: Name, schema: SchemaAny, getDb: () => DB) {
    this.#name = name;
    this.#schema = schema;
    this.#getDb = getDb;
    this.#tableConfig = notNil(
      schema.tables.find((table) => table.name === name)
    );
  }

  #getPreparedInsert(): PreparedQuery {
    if (this.#insertPreparedQuery) {
      return this.#insertPreparedQuery;
    }
    const db = this.#getDb();
    const query = join.space(
      `INSERT INTO ${sqlQuote(this.#name)}`,
      `(`,
      join.comma(
        "key",
        "data",
        ...this.#tableConfig.indexes.map((index) => sqlQuote(index.name))
      ),
      `)`,
      `VALUES`,
      `(`,
      join.comma(
        `$1`, // key
        `$2`, // data
        // rest is indexes
        ...this.#tableConfig.indexes.map((_index, i) => `$${3 + i}`) // indexes
      ),
      `)`
    );
    const insert = db.prepareQuery(query);
    this.#insertPreparedQuery = insert;
    return insert;
  }

  #prepareInsert(data: Data): {
    key: any;
    data: string;
    indexes: Array<unknown>;
  } {
    const keyVal = this.#tableConfig.key.fn(data);
    const keySer = serializeDatatype(this.#tableConfig.key.datatype, keyVal);
    const indexes = this.#tableConfig.indexes.map((index) => {
      const val = index.column.fn(data);
      return serializeDatatype(index.column.datatype, val);
    });
    const dataSer = JSON.stringify(this.#schema.sanitize(data));
    return { key: keySer, data: dataSer, indexes };
  }

  insert(data: Data): void {
    const params = this.#prepareInsert(data);
    this.#getPreparedInsert().execute([
      params.key,
      params.data,
      ...params.indexes,
    ]);
  }

  prepare(): Select<Name, Key, Data, Indexes, null>;
  prepare<Params extends ValuesAny>(
    params: Params
  ): Select<Name, Key, Data, Indexes, Params>;
  prepare<Params extends ValuesAny>(
    params?: Params
  ): Select<Name, Key, Data, Indexes, Params | null> {
    return new Select({
      table: this.#name,
      schema: this.#schema,
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
    const db = this.#getDb();
    const preparedQuery = query[PRIV].getQuery(db);
    const paramsValues = query[PRIV].params;
    const paramsSerialized =
      paramsValues === null ? {} : serializeValues(paramsValues, params as any);
    const iter = preparedQuery.iter(paramsSerialized as any);
    return new PipeCollection(
      traverserFromRowIterator<Key, string, Data>(
        iter,
        (data) => this.#schema.restore(JSON.parse(data)) as any
      )
    );
  }

  all(): PipeCollection<Key, Data> {
    throw new Error("Not Implemented");
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
