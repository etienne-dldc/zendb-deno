import * as sql from "../../mod.ts";

export type User = { id: string; name: string; age: number };

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

export type Schema = sql.Tables<{
  users: sql.Table<User, { id: string }>;
  bankReccords: sql.Table<BankRecord, { date: Date }>;
  transformation: sql.Table<Transformation, { id: string }>;
}>;

export const v001 = sql.schema<Schema>({
  tables: {
    users: {
      indexes: { id: { primary: true, fn: (data) => data.id } },
    },
    bankReccords: {
      indexes: { date: (data) => data.date },
    },
    transformation: {
      indexes: { id: { primary: true, fn: (data) => data.id } },
    },
  },
});
