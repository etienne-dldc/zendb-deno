// deno-lint-ignore-file no-explicit-any
import { Datatype, DatatypeParsed } from "./datatype.ts";

export interface Index<
  Name extends string,
  Dt extends Datatype,
  IsPrimary extends boolean,
  Nullable extends boolean,
  DefaultValue extends (() => any) | null
> {
  name: Name;
  datatype: Dt;
  primaryKey: IsPrimary;
  nullable: Nullable;
  defaultValue: DefaultValue;
  setNullable(): Index<Name, Dt, IsPrimary, true, DefaultValue>;
  setPrimaryKey(): Index<Name, Dt, true, Nullable, DefaultValue>;
  setDefaultValue<Value extends DatatypeParsed<Dt>>(
    val: () => Value
  ): Index<Name, Dt, IsPrimary, Nullable, () => Value>;
}

export type IndexAny = Index<
  string,
  Datatype,
  boolean,
  boolean,
  (() => any) | null
>;

export type IndexesByName<Indexes extends ReadonlyArray<IndexAny>> = {
  [K in Indexes[number]["name"]]: Extract<Indexes[number], { name: K }>;
};

export function index<Name extends string, Dt extends Datatype>(
  name: Name,
  datatype: Dt
): Index<Name, Dt, false, false, null> {
  return create(name, datatype, false, false, null);
  function create<
    Name extends string,
    Dt extends Datatype,
    IsPrimary extends boolean,
    Nullable extends boolean,
    DefaultValue extends (() => any) | null
  >(
    name: Name,
    datatype: Dt,
    primaryKey: IsPrimary,
    nullable: Nullable,
    defaultValue: DefaultValue
  ): Index<Name, Dt, IsPrimary, Nullable, DefaultValue> {
    return {
      name,
      datatype,
      primaryKey,
      nullable,
      defaultValue,
      setPrimaryKey() {
        return create(name, datatype, true, nullable, defaultValue);
      },
      setNullable() {
        return create(name, datatype, primaryKey, true, defaultValue);
      },
      setDefaultValue(value) {
        return create(name, datatype, primaryKey, nullable, value);
      },
    };
  }
}
