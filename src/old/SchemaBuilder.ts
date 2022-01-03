import { TableBuilderAny } from "./TableBuilder.ts";
import { ITER } from "./utils.ts";

export type ReferenceAction =
  | "SET NULL"
  | "SET DEFAULT"
  | "CASCADE"
  | "RESTRICT"
  | "NO ACTION";

export type ForeignKey = {
  column: string;
  references: string;
  onUpdate?: ReferenceAction;
  onDelete?: ReferenceAction;
};

export type TableInternalByName<
  Tables extends TableBuilderAny,
  Name extends Tables["name"]
> = Extract<Tables, { name: Name }>[ITER];

export type SchemaColumnPath<Tables extends TableBuilderAny> = {
  [K in Tables["name"]]: `${K}.${TableInternalByName<
    Tables,
    K
  >["columns"][number]["name"]}`;
}[Tables["name"]];

export type TablesAny = ReadonlyArray<TableBuilderAny>;

export type ForeignKeysAny = ReadonlyArray<ForeignKey>;

type SchemaBuilderInternal<
  Tables extends TablesAny,
  ForeignKeys extends ForeignKeysAny
> = {
  tables: Tables;
  foreignKeys: ForeignKeys;
};

export function schema(): SchemaBuilder<[], []> {
  return SchemaBuilder.create();
}

export type SchemaBuilderAny = SchemaBuilder<TablesAny, ForeignKeysAny>;

export type SchemaTablesNames<Schema extends SchemaBuilderAny> =
  Schema[ITER]["tables"][number]["name"];

export class SchemaBuilder<
  Tables extends TablesAny,
  ForeignKeys extends ForeignKeysAny
> {
  public static create(): SchemaBuilder<[], []> {
    return new SchemaBuilder({ tables: [], foreignKeys: [] });
  }

  readonly [ITER]: SchemaBuilderInternal<Tables, ForeignKeys>;

  private constructor(internal: SchemaBuilderInternal<Tables, ForeignKeys>) {
    this[ITER] = internal;
  }

  addTable<Table extends TableBuilderAny>(
    table: Table
  ): SchemaBuilder<[...Tables, Table], ForeignKeys> {
    return new SchemaBuilder({
      ...this[ITER],
      tables: [...this[ITER].tables, table],
    });
  }

  addForeignKey<
    Column extends SchemaColumnPath<Tables[number]>,
    References extends SchemaColumnPath<Tables[number]>
  >(
    column: Column,
    references: References,
    options?: {
      onUpdate?: ReferenceAction;
      onDelete?: ReferenceAction;
    }
  ): SchemaBuilder<
    Tables,
    [...ForeignKeys, { column: Column; references: References }]
  > {
    return new SchemaBuilder({
      ...this[ITER],
      foreignKeys: [
        ...this[ITER].foreignKeys,
        { column, references, ...options },
      ],
    });
  }
}
