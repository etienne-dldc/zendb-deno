// deno-lint-ignore-file no-explicit-any

import { Datatype } from "./Datatype.ts";

export type IndexesAny = Record<string, any>;

export type Table<Data, Indexes extends IndexesAny> = {
  data: Data;
  indexes: Indexes;
};

export type TableAny = Table<any, IndexesAny>;

export type TablesRecord = Record<string, TableAny>;

export type Tables<Tabs extends TablesRecord> = Tabs;

export type TablesAny = Tables<TablesRecord>;

export type IndexFn<Data, T> = (data: Data) => T;

export type IndexConfig<Data, T> =
  | IndexFn<Data, T>
  | {
      datatype?: Datatype;
      unique?: boolean;
      primary?: boolean;
      nullable?: boolean;
      fn: IndexFn<Data, T>;
    };

export type TableConfig<Table extends TableAny> = {
  indexes: {
    [K in keyof Table["indexes"]]: IndexConfig<
      Table["data"],
      Table["indexes"][K]
    >;
  };
};

export type SchemaConfig<Schema extends TablesAny> = {
  tables: { [K in keyof Schema]: TableConfig<Schema[K]> };
};

export type Schema<Sch extends TablesAny> = {
  __schema: Sch;
  config: SchemaConfig<Sch>;
};

export type SchemaAny = Schema<TablesAny>;

export function schema<Sch extends TablesAny>(
  config: SchemaConfig<Sch>
): Schema<Sch> {
  return { config, __schema: null as any };
}

export type TablesNames<Sch extends SchemaAny> = keyof Sch["__schema"];

export type TableData<
  Sch extends SchemaAny,
  Name extends TablesNames<Sch>
> = Sch["__schema"][Name]["data"];
