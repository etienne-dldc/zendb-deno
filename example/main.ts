import { resolve } from "https://deno.land/std@0.113.0/path/mod.ts";
import { ensureDirSync } from "https://deno.land/std@0.113.0/fs/mod.ts";
import { v001 } from "./migrations/v001.ts";
import { Migrations } from "../mod.ts";

const dbFolderPath = resolve(Deno.cwd(), "example");
const databasePath = resolve(dbFolderPath, "database.db");
const migrationDatabasePath = resolve(dbFolderPath, "migration-database.db");

ensureDirSync(dbFolderPath);

export const database = await Migrations.create("Init", v001, () => {}, {
  databasePath,
  migrationDatabasePath,
}).apply();

database.insert("users", { id: "1", name: "John", age: 30 });

// const insertUserQuery = database.prepareInsert("Users");

// export function insertUser(): void {
//   insertUserQuery.execute({ age: 26, username: "etienne" });
//   return;
// }

// export const selectUsers = database.prepareQuery(({ tables }) =>
//   node.SelectStmt({
//     fromClause: node.FromClause(tables.Users.ref),
//     select: node.SelectClause([
//       tables.Users.columns.id,
//       tables.Users.columns.username,
//     ]),
//   })
// );

// const res = selectUsers.allEntries({});
// console.log(res);

// export const selectTypes = database.prepareQuery(
//   ({ tables }) =>
//     node.SelectStmt({
//       fromClause: node.FromClause(tables.Data.ref),
//       select: node.SelectClause([
//         node.DistinctColumn(tables.Data.columns.type),
//       ]),
//     }),
//   { type: value.text() }
// );
