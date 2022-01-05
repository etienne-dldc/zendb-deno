// deno-lint-ignore-file no-explicit-any
import { zod } from "../deps.ts";
import { mapObject } from "./Utils.ts";
// import { ColumnBuilder, ColumnBuilderAny } from "./ColumnBuilder.ts";
import {
  Datatype,
  datatype,
  DatatypeBoolean,
  DatatypeDate,
  DatatypeInteger,
  DatatypeJson,
  DatatypeNumber,
  DatatypeParsed,
  DatatypeText,
  parseDatatype,
  serializeDatatype,
} from "./Datatype.ts";

type DefaultValueBase = (() => any) | null;

export interface Value<
  Dt extends Datatype,
  Nullable extends boolean,
  DefaultValue extends DefaultValueBase
> {
  datatype: Dt;
  isNullable: Nullable;
  defaultValue: DefaultValue;
  nullable(): Value<Dt, true, DefaultValue>;
  setDefaultValue<DefaultValue extends DatatypeParsed<Dt>>(
    val: () => DefaultValue
  ): Value<Dt, Nullable, () => DefaultValue>;
}

export type ValueAny = Value<Datatype, boolean, DefaultValueBase>;

export type ValuesAny = Record<string, ValueAny>;

export type DataFromValue<Value extends ValueAny> =
  | DatatypeParsed<Value["datatype"]>
  | (Value["isNullable"] extends true ? null : never)
  | (Value["defaultValue"] extends null ? never : null);

export type DataFromValues<Values extends ValuesAny> = {
  [K in keyof Values]: DataFromValue<Values[K]>;
};

export const value = {
  json<Inner>(
    schema: zod.Schema<Inner>
  ): Value<DatatypeJson<Inner>, false, null> {
    return createValue(datatype.json(schema));
  },
  text(
    schema: zod.Schema<string> | null = null
  ): Value<DatatypeText, false, null> {
    return createValue(datatype.text(schema));
  },
  number(
    schema: zod.Schema<number> | null = null
  ): Value<DatatypeNumber, false, null> {
    return createValue(datatype.number(schema));
  },
  integer(
    schema: zod.Schema<number> | null = null
  ): Value<DatatypeInteger, false, null> {
    return createValue(datatype.integer(schema));
  },
  boolean(
    schema: zod.Schema<boolean> | null = null
  ): Value<DatatypeBoolean, false, null> {
    return createValue(datatype.boolean(schema));
  },
  date(): Value<DatatypeDate, false, null> {
    return createValue(datatype.date());
  },
};

export function createValue<Dt extends Datatype>(
  datatype: Dt
): Value<Dt, false, null> {
  return create(datatype, false, null);
  function create<
    Dt extends Datatype,
    Nullable extends boolean,
    DefaultValue extends DefaultValueBase
  >(
    datatype: Dt,
    isNullable: Nullable,
    defaultValue: DefaultValue
  ): Value<Dt, Nullable, DefaultValue> {
    return {
      datatype,
      isNullable,
      defaultValue,
      nullable() {
        return create(datatype, true, defaultValue);
      },
      setDefaultValue(defaultValue) {
        return create(datatype, isNullable, defaultValue);
      },
    };
  }
}

export function serializeValues<Values extends ValuesAny>(
  values: Values,
  data: Record<string, any>
): Record<string, unknown> {
  return mapObject(values, (valueName, value) => {
    const dataItem = data[valueName];
    if (dataItem === undefined || dataItem === null) {
      if (value.defaultValue) {
        return serializeDatatype(value.datatype, value.defaultValue());
      }
      if (value.isNullable) {
        return null;
      }
      throw new Error(`Missing value ${valueName}.`);
    }
    return serializeDatatype(value.datatype, dataItem);
  });
}

export function parseValues<Values extends ValuesAny>(
  values: Values,
  data: Record<string, unknown>
): DataFromValues<Values> {
  return mapObject(values, (valueName, value) => {
    const dataItem = data[valueName];
    if (dataItem === undefined || dataItem === null) {
      if (value.defaultValue) {
        return value.defaultValue();
      }
      if (value.isNullable) {
        return null;
      }
      throw new Error(`Value ${valueName} cannot be null/undefined.`);
    }
    return parseDatatype(value.datatype, dataItem as any);
  }) as any;
}
