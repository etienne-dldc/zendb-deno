// deno-lint-ignore-file no-explicit-any
import { Datatype, DatatypeParsed } from "./datatype.ts";
import { ITER } from "./utils.ts";

type DefaultValueAny = (() => any) | null;

type TableBuilderInternal<
  Dt extends Datatype,
  IsPrimary extends boolean,
  Nullable extends boolean,
  DefaultValue extends DefaultValueAny
> = {
  datatype: Dt;
  primaryKey: IsPrimary;
  nullable: Nullable;
  defaultValue: DefaultValue;
};

export function column<Name extends string, Dt extends Datatype>(
  name: Name,
  datatype: Dt
) {
  return ColumnBuilder.create(name, datatype);
}

export type ColumnBuilderAny = ColumnBuilder<
  string,
  Datatype,
  boolean,
  boolean,
  DefaultValueAny
>;

export type ColumnValue<Column extends ColumnBuilderAny> =
  | DatatypeParsed<Column[ITER]["datatype"]>
  | (Column[ITER]["nullable"] extends true ? null : never);

export class ColumnBuilder<
  Name extends string,
  Dt extends Datatype,
  IsPrimary extends boolean,
  Nullable extends boolean,
  DefaultValue extends DefaultValueAny
> {
  public static create<Name extends string, Dt extends Datatype>(
    name: Name,
    datatype: Dt
  ): ColumnBuilder<Name, Dt, false, false, null> {
    return new ColumnBuilder(name, {
      datatype,
      primaryKey: false,
      nullable: false,
      defaultValue: null,
    });
  }

  readonly [ITER]: TableBuilderInternal<Dt, IsPrimary, Nullable, DefaultValue>;

  readonly name: Name;

  private constructor(
    name: Name,
    internal: TableBuilderInternal<Dt, IsPrimary, Nullable, DefaultValue>
  ) {
    this.name = name;
    this[ITER] = internal;
  }

  public primaryKey(): ColumnBuilder<Name, Dt, true, Nullable, DefaultValue> {
    return new ColumnBuilder(this.name, {
      ...this[ITER],
      primaryKey: true,
    });
  }

  public nullable(): ColumnBuilder<Name, Dt, IsPrimary, true, DefaultValue> {
    return new ColumnBuilder(this.name, {
      ...this[ITER],
      nullable: true,
    });
  }

  public defaultValue<Value extends DatatypeParsed<Dt>>(
    val: () => Value
  ): ColumnBuilder<Name, Dt, IsPrimary, Nullable, () => Value> {
    return new ColumnBuilder(this.name, {
      ...this[ITER],
      defaultValue: val,
    });
  }
}
