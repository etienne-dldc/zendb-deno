// deno-lint-ignore-file no-explicit-any ban-types
import { ALL_NODE_KIND } from "./AstPrinter.ts";

type NodeData = {
  SelectStmt: {
    select: Node<"SelectClause">;
    fromClause: Node<"FromClause">;
    where?: Expr;
    orderBy?: Node<"OrderBy">;
    limit?: Node<"Limit">;
  };
  InsertStmt: {
    table: Node<"TableAlias" | "TableRef">;
    columns: Array<Node<"ColumnName">>;
    values: Array<Expr>;
  };
  DeleteStmt: {
    table: Node<"TableAlias" | "TableRef">;
    where?: Expr;
    orderBy?: Node<"OrderBy">;
    limit?: Node<"Limit">;
  };
  Star: {};
  Limit: {
    expr: Expr;
    offset?: Expr;
  };
  OrderBy: {
    items: Array<Node<"OrderingTerm">>;
  };
  OrderingTerm: {
    expr: Expr;
    direction?: "ASC" | "DESC";
  };
  SelectClause: {
    columns:
      | Node<"Star">
      | Array<Node<"ColumnRef" | "ColumnAlias" | "DistinctColumn">>;
  };
  FromClause: {
    baseTable: Node<"TableAlias" | "TableRef">;
    joins: Array<Node<"LeftJoin">>;
  };
  LeftJoin: {
    table: Node<"TableAlias" | "TableRef">;
    on: Expr;
  };
  VariableRef: { variable: string };
  ColumnRef: { column: string; table: string };
  ColumnName: { name: string };
  ColumnAlias: { column: Node<"ColumnRef" | "AggregateFn">; alias: string };
  Literal: { value: string | number | boolean };
  BinaryOp: {
    left: Expr;
    op: BinaryOperator;
    right: Expr;
  };
  AggregateFn: {
    name: "avg" | "count" | "group_concat" | "max" | "min" | "sum" | "total";
    args:
      | Node<"Star">
      | {
          distinct?: boolean;
          exprs: Array<Expr>;
        };
  };
  DistinctColumn: {
    column: Node<"ColumnRef" | "AggregateFn">;
  };
  TableRef: {
    name: string;
  };
  TableAlias: {
    table: Node<"TableRef">;
    alias: string;
  };
};

export type NodeBase<K extends NodeKind = NodeKind> = { kind: K };

export type NodeDataFull = { [K in keyof NodeData]: NodeData[K] & NodeBase<K> };

export type NodeKind = keyof NodeDataFull;

export type Node<K extends NodeKind = NodeKind> = NodeDataFull[K];

export type BinaryOperator =
  | ">"
  | "<"
  | "="
  | "=="
  | "!="
  | "<>"
  | "+"
  | "-"
  | "*"
  | "/"
  | "IS"
  | "IS NOT"
  | "AND"
  | "OR";

export type Expr = Node<
  "Literal" | "ColumnRef" | "ColumnAlias" | "BinaryOp" | "VariableRef"
>;

export type MutationStmt = Node<"InsertStmt" | "DeleteStmt">;
export type QueryStmt = Node<"SelectStmt">;
export type Stmt = MutationStmt | QueryStmt;

export function createNode<K extends NodeKind>(
  kind: K,
  data: Omit<NodeDataFull[K], "kind">
): Node<K> {
  return {
    kind,
    ...data,
  } as any;
}

const CreateNodeBase: {
  [K in NodeKind]: (data: Omit<NodeDataFull[K], "kind">) => Node<K>;
} = Object.fromEntries(
  ALL_NODE_KIND.map((kind) => [kind, (data: any) => createNode(kind, data)])
) as any;

export const CreateNode = {
  ...CreateNodeBase,
  VariableRef: (variable: string) => createNode("VariableRef", { variable }),
  BinaryOp: (left: Expr, op: BinaryOperator, right: Expr) =>
    createNode("BinaryOp", { left, op, right }),
  SelectClause: (columns: Node<"SelectClause">["columns"]) =>
    createNode("SelectClause", { columns }),
  FromClause: (
    baseTable: Node<"TableAlias" | "TableRef">,
    joins: Array<Node<"LeftJoin">> = []
  ) => createNode("FromClause", { baseTable, joins }),
  Limit: (expr: Expr, offset?: Expr) => createNode("Limit", { expr, offset }),
  OrderBy: (...items: Array<Node<"OrderingTerm">>) =>
    createNode("OrderBy", { items }),
  OrderingTerm: (expr: Expr, direction?: "ASC" | "DESC") =>
    createNode("OrderingTerm", { expr, direction }),
  Literal: (value: string | number | boolean) =>
    createNode("Literal", { value }),
  LimitOne: () =>
    createNode("Limit", { expr: createNode("Literal", { value: 1 }) }),
  TableRef: (name: string) => createNode("TableRef", { name }),
  Star: () => createNode("Star", {}),
  ColumnAlias: (column: Node<"ColumnRef" | "AggregateFn">, alias: string) =>
    createNode("ColumnAlias", { column, alias }),
  CountAll: () =>
    CreateNode.AggregateFn({ name: "count", args: CreateNode.Star() }),
  ColumnName: (name: string) => createNode("ColumnName", { name }),
  DistinctColumn: (column: Node<"ColumnRef" | "AggregateFn">) =>
    createNode("DistinctColumn", { column }),
};
