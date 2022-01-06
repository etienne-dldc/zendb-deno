import * as sql from "../../mod.ts";
import { sanitize, restore } from "https://deno.land/x/zenjson/mod.ts";

export type User = { id: string; name: string; age: number; date: Date };

export type BankRecord = {
  id: string;
  labelle: string;
  description: string;
  amount: number;
  date: Date;
};

export type SplitItem = { amount: number; description: string };

export type Transformation =
  | { id: string; kind: "merge"; items: Array<string>; description: string }
  | { id: string; kind: "split"; items: Array<SplitItem> };

export const v001 = sql.schema({
  sanitize,
  restore,
  tables: {
    users: sql
      .table<User>()
      .key(sql.column.text(), (data) => data.id)
      .index("age", sql.column.number(), (data) => data.age)
      .index("date", sql.column.date(), (data) => data.date),
    bankRecords: sql
      .table<BankRecord>()
      .key(sql.column.text(), (data) => data.id)
      .index("date", sql.column.date(), (data) => data.date),
    transformations: sql
      .table<Transformation>()
      .key(sql.column.text(), (data) => data.id),
  },
});
