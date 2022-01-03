// deno-lint-ignore-file no-explicit-any
import { ColumnBuilderAny } from "./ColumnBuilder.ts";
import { ITER } from "./utils.ts";

export type ColumnsAny = ReadonlyArray<ColumnBuilderAny>;

type TableBuilderInternal<
  Columns extends ColumnsAny,
  PrimaryKey extends ReadonlyArray<string> | null
> = {
  columns: Columns;
  primaryKey: PrimaryKey;
};

export type TableBuilderAny = TableBuilder<string, ColumnsAny, any>;

export function table<Name extends string>(name: Name) {
  return TableBuilder.create(name);
}

export class TableBuilder<
  Name extends string,
  Columns extends ColumnsAny,
  PrimaryKey extends ReadonlyArray<string> | null
> {
  public static create<Name extends string>(
    name: Name
  ): TableBuilder<Name, [], null> {
    return new TableBuilder(name, { columns: [], primaryKey: null });
  }

  readonly name: Name;
  readonly [ITER]: TableBuilderInternal<Columns, PrimaryKey>;

  private constructor(
    name: Name,
    internal: TableBuilderInternal<Columns, PrimaryKey>
  ) {
    this.name = name;
    this[ITER] = internal;
  }

  public addColumn<Column extends ColumnBuilderAny>(
    column: Column
  ): TableBuilder<Name, [...Columns, Column], PrimaryKey> {
    return new TableBuilder(this.name, {
      ...this[ITER],
      columns: [...this[ITER].columns, column],
    });
  }

  public primaryKey<Keys extends ReadonlyArray<Columns[number]["name"]>>(
    keys: Keys
  ): TableBuilder<Name, Columns, Keys> {
    return new TableBuilder(this.name, {
      ...this[ITER],
      primaryKey: keys,
    });
  }
}
