// deno-lint-ignore-file no-explicit-any
import { zod } from "../deps.ts";
import {
  datatype,
  Datatype,
  DatatypeBoolean,
  DatatypeParsed,
  DatatypeText,
  DatatypeDate,
  DatatypeInteger,
  DatatypeJson,
  DatatypeNumber,
} from "./Datatype.ts";
import { PRIV } from "./Utils.ts";

export type ColumnFn<Data, T> = (data: Data) => T;

export type Column<Data, T> = {
  [PRIV]: T;
  datatype: Datatype;
  fn: ColumnFn<Data, T>;
  unique: boolean;
  primary: boolean;
  nullable: boolean;
};

export type ColumnAny = Column<any, any>;

export type ColumnOptions =
  | { primary: true; unique?: boolean }
  | { unique?: boolean; nullable?: boolean };

function createColumn<Data, Dt extends Datatype>(
  datatype: Datatype,
  fn: ColumnFn<Data, DatatypeParsed<Dt>>,
  options: ColumnOptions = {}
): Column<Data, DatatypeParsed<Dt>> {
  return {
    [PRIV]: null as any,
    datatype,
    fn,
    unique: false,
    primary: false,
    nullable: false,
    ...options,
  };
}

export const column = {
  create: createColumn,
  text<Data>(fn: ColumnFn<Data, string>, options: ColumnOptions = {}) {
    return createColumn<Data, DatatypeText>(datatype.text(), fn, options);
  },
  boolean<Data>(fn: ColumnFn<Data, boolean>, options: ColumnOptions = {}) {
    return createColumn<Data, DatatypeBoolean>(datatype.boolean(), fn, options);
  },
  date<Data>(fn: ColumnFn<Data, Date>, options: ColumnOptions = {}) {
    return createColumn<Data, DatatypeDate>(datatype.date(), fn, options);
  },
  integer<Data>(fn: ColumnFn<Data, number>, options: ColumnOptions = {}) {
    return createColumn<Data, DatatypeInteger>(datatype.integer(), fn, options);
  },
  number<Data>(fn: ColumnFn<Data, number>, options: ColumnOptions = {}) {
    return createColumn<Data, DatatypeNumber>(datatype.number(), fn, options);
  },
  json<Data, Value>(
    schema: zod.Schema<Value>,
    fn: ColumnFn<Data, Value>,
    options: ColumnOptions = {}
  ) {
    return createColumn<Data, DatatypeJson<Value>>(
      datatype.json(schema),
      fn,
      options
    );
  },
};

export type IndexesAny<Data> = Record<string, Column<Data, any>>;

export type Table<Data, Key, Indexes extends IndexesAny<Data>> = {
  [PRIV]: { data: Data; key: Key };
  key: Column<Data, Key>;
  indexes: Indexes;
};

export type TableAny = Table<any, any, IndexesAny<any>>;

export type TypedTable<Data> = <Key, Indexes extends IndexesAny<Data>>(
  key: Column<Data, Key>,
  indexes: Indexes
) => Table<Data, Key, Indexes>;

export function table<Data>(): TypedTable<Data> {
  return (key, indexes) => {
    return { [PRIV]: null as any, key, indexes };
  };
}

export type TablesAny = Record<string, TableAny>;

export type IndexResolved = {
  name: string;
  column: ColumnAny;
};

export type TableResolved = {
  name: string;
  key: ColumnAny;
  indexes: Array<IndexResolved>;
};

export type Schema<Tables extends TablesAny> = {
  [PRIV]: Tables;
  tables: Array<TableResolved>;
  sanitize: (data: unknown) => unknown;
  restore: (data: unknown) => unknown;
};

export type SchemaAny = Schema<TablesAny>;

export type SchemaOptions<Tables extends TablesAny> = {
  tables: Tables;
  sanitize?: (data: unknown) => unknown;
  restore?: (data: unknown) => unknown;
};

export function schema<Tables extends TablesAny>({
  tables,
  restore = (d) => d,
  sanitize = (d) => d,
}: SchemaOptions<Tables>): Schema<Tables> {
  return {
    [PRIV]: tables,
    sanitize,
    restore,
    tables: Object.entries(tables).map(([name, table]): TableResolved => {
      return {
        name,
        key: table.key,
        indexes: Object.entries(table.indexes).map(
          ([name, column]): IndexResolved => {
            return { name, column };
          }
        ),
      };
    }),
  };
}
