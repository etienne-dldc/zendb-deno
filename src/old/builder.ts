// deno-lint-ignore-file no-explicit-any
import { CreateNode, Node, Stmt } from "./ast.ts";
import { SchemaBuilderAny, SchemaTablesNames } from "./SchemaBuilder.ts";
import { TableBuilderAny } from "./TableBuilder.ts";
import { mapObject } from "../utils.ts";
import { ValuesAny } from "./values.ts";
import { ITER } from "./utils.ts";

export type Builder<
  Schema extends SchemaBuilderAny,
  Variables extends ValuesAny,
  Res extends Stmt
> = (tools: BuilderTools<Schema, Variables>) => Res;

export type BuilderToolsTables<Schema extends SchemaBuilderAny> = {
  [K in SchemaTablesNames<Schema>]: BuilderToolsTable<Schema, K>;
};

type BuilderToolsTable<
  Schema extends SchemaBuilderAny,
  Name extends SchemaTablesNames<Schema>
> = {
  ref: Node<"TableRef">;
  columns: TableColumnsRefFromName<Schema, Name>;
};

export type BuilderToolsVariables<Variables extends ValuesAny> = {
  [K in keyof Variables]: Node<"VariableRef">;
};

export interface BuilderTools<
  Schema extends SchemaBuilderAny,
  Variables extends ValuesAny
> {
  variables: BuilderToolsVariables<Variables>;
  tables: BuilderToolsTables<Schema>;
}

type ColumnsRefFromTable<Table extends TableBuilderAny> = {
  [K in Table[ITER]["columns"][number]["name"]]: Node<"ColumnRef">;
};

type TableColumnsRefFromName<
  Schema extends SchemaBuilderAny,
  Name extends SchemaTablesNames<Schema>
> = ColumnsRefFromTable<
  Extract<Schema[ITER]["tables"][number], { name: Name }>
>;

export function createBuilderTools<
  Schema extends SchemaBuilderAny,
  Variables extends ValuesAny
>(schema: Schema, variables: Variables): BuilderTools<Schema, Variables> {
  return {
    tables: createBuilderToolsTables(schema),
    variables: createBuilderToolsVariables(variables),
  };
}

function createBuilderToolsVariables<Variables extends ValuesAny>(
  variables: Variables
): BuilderToolsVariables<Variables> {
  return mapObject(variables, (name) => CreateNode.VariableRef(name as string));
}

function createBuilderToolsTables<Schema extends SchemaBuilderAny>(
  schema: Schema
): BuilderToolsTables<Schema> {
  const { tables } = schema[ITER];
  return Object.fromEntries(
    tables.map((table): [string, BuilderToolsTable<Schema, string>] => {
      const { columns } = table[ITER];
      return [
        table.name,
        {
          ref: CreateNode.TableRef(table.name),
          columns: Object.fromEntries(
            columns.map((column) => {
              return [
                column.name,
                CreateNode.ColumnRef({
                  table: table.name,
                  column: column.name,
                }),
              ];
            })
          ) as any,
        },
      ];
    })
  ) as any;
}
