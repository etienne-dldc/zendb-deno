import { ColumnBuilderAny } from "./ColumnBuilder.ts";
import { DatatypeParsed } from "./datatype.ts";
import { SchemaBuilderAny, SchemaTablesNames } from "./SchemaBuilder.ts";
import { TableBuilderAny } from "./TableBuilder.ts";
import { ITER, MakeUndefinedOptional } from "./utils.ts";

export type InsertData<
  Schema extends SchemaBuilderAny,
  Name extends SchemaTablesNames<Schema>
> = InsertDataFromTable<
  Extract<Schema[ITER]["tables"][number], { name: Name }>
>;

export type InsertDataFromTable<Table extends TableBuilderAny> =
  MakeUndefinedOptional<{
    [K in Table[ITER]["columns"][number]["name"]]: InsertValueFromColumn<
      Extract<Table[ITER]["columns"][number], { name: K }>
    >;
  }>;

export type InsertValueFromColumn<Column extends ColumnBuilderAny> =
  Column["defaultValue"] extends null
    ? DatatypeParsed<Column[ITER]["datatype"]>
    : DatatypeParsed<Column[ITER]["datatype"]> | undefined;
