// deno-lint-ignore-file no-explicit-any
import { Node, NodeKind, Stmt } from "./Ast.ts";
import { expectNever } from "./Utils.ts";

export function printStmt(stmt: Stmt): string {
  return printNode(stmt, []);
}

type PrintFn<N extends Node> = (
  node: N,
  printChild: (node: Node) => string,
  path: PrintPath
) => string;

const NodePrinter: { [K in NodeKind]: PrintFn<Node<K>> } = {
  SelectStmt: ({ select, fromClause, where, orderBy, limit }, print) => {
    return (
      merge(
        print(select),
        print(fromClause),
        where && ["WHERE", print(where)],
        orderBy && print(orderBy),
        limit && print(limit)
      ) + ";"
    );
  },
  InsertStmt: ({ table, columns, values }, print) => {
    return (
      merge(
        "INSERT",
        "INTO",
        print(table),
        `(${columns.map(print).join(", ")})`,
        "VALUES",
        `(${values.map(print).join(", ")})`
      ) + ";"
    );
  },
  DeleteStmt: ({ table, where, orderBy, limit }, print) => {
    return merge(
      "DELETE",
      "FROM",
      print(table),
      where && ["WHERE", print(where)],
      orderBy && print(orderBy),
      limit && print(limit)
    );
  },
  BinaryOp: ({ left, op, right }, print) => {
    return `(${merge(print(left), op, print(right))})`;
  },
  SelectClause: ({ columns }, print) => {
    return merge(
      "SELECT",
      Array.isArray(columns) ? columns.map(print).join(", ") : print(columns)
    );
  },
  ColumnAlias: ({ column, alias }, print, path) => {
    if (path.includes("SelectClause")) {
      return merge(print(column), "AS", quote(alias));
    }
    return quote(alias);
  },
  ColumnRef: ({ table, column }) => {
    return `${quote(table)}.${quote(column)}`;
  },
  FromClause: ({ baseTable, joins }, print) => {
    return merge("FROM", print(baseTable), ...joins.map(print));
  },
  LeftJoin: ({ table, on }, print) => {
    return merge("LEFT", "JOIN", print(table), "ON", print(on));
  },
  Literal: ({ value }) => {
    if (typeof value === "number") {
      return value.toString();
    }
    if (typeof value === "string") {
      // TODO: Escape
      return `"${value}"`;
    }
    if (typeof value === "boolean") {
      return value ? "TRUE" : "FALSE";
    }
    return expectNever(value);
  },
  TableAlias: ({ table, alias }, print, path) => {
    if (path.includes("FromClause")) {
      return merge(print(table), "AS", quote(alias));
    }
    return quote(alias);
  },
  TableRef: ({ name }) => {
    return quote(name);
  },
  VariableRef: ({ variable }) => {
    return `:${variable}`;
  },
  OrderBy: ({ items }, print) => {
    return merge("ORDER", "BY", items.map(print).join(", "));
  },
  OrderingTerm: ({ expr, direction }, print) => {
    return merge(print(expr), direction);
  },
  Limit: ({ expr, offset }, print) => {
    return merge("LIMIT", print(expr), offset && ["OFFSET", print(offset)]);
  },
  Star: () => `*`,
  AggregateFn: ({ name, args }, print) =>
    `${name}(${
      "kind" in args
        ? print(args)
        : (args.distinct ? "DISTINCT " : "") + args.exprs.map(print).join(", ")
    })`,
  ColumnName: ({ name }) => quote(name),
  DistinctColumn: ({ column }, print) => `DISTINCT ${print(column)}`,
};

export const ALL_NODE_KIND: Array<NodeKind> = Object.keys(NodePrinter) as any;

type PrintPathItem = Node["kind"];

type PrintPath = Array<PrintPathItem>;

function printNode(node: Node, path: PrintPath): string {
  return NodePrinter[node.kind](
    node as any,
    (child) => printNode(child, [...path, node.kind]),
    path
  );
}

type Parts = Array<string | null | undefined | Parts>;

function merge(...parts: Parts): string {
  return parts
    .flat(Infinity)
    .filter((v) => Boolean(v))
    .join(" ");
}

function quote(val: string): string {
  return "`" + val + "`";
}
