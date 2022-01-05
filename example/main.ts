import { resolve } from "https://deno.land/std@0.113.0/path/mod.ts";
import { ensureDirSync } from "https://deno.land/std@0.113.0/fs/mod.ts";
import { nanoid } from "https://deno.land/x/nanoid/mod.ts";
import { User, v001 } from "./migrations/v001.ts";
import * as sql from "../mod.ts";

const e = sql.expr;

const dbFolderPath = resolve(Deno.cwd(), "example");
const databasePath = resolve(dbFolderPath, "database.db");
const migrationDatabasePath = resolve(dbFolderPath, "migration-database.db");

ensureDirSync(dbFolderPath);

const migration = sql.Migrations.create({
  name: "Init",
  schema: v001,
}).addMigration({ name: "Update", schema: v001 });

export const database = await migration.apply({
  databasePath,
  migrationDatabasePath,
});

const tables = database.tables;

const queryUserById = tables.users
  .prepare({ maxAge: sql.value.number() })
  .where(({ params, indexes }) => e.lte(indexes.age, params.maxAge));

// const createUser = (): User => ({
//   id: nanoid(10),
//   name: "John",
//   age: Math.floor(Math.random() * 100),
//   date: new Date(),
// });

// tables.users.insert(createUser());
// tables.users.insert(createUser());
// tables.users.insert(createUser());

tables.users
  .select(queryUserById, { maxAge: 30 })
  .update((prev) => ({ ...prev, name: "Lucas" }))
  .apply();

const users = tables.users.select(queryUserById, { maxAge: 30 }).valuesArray();

console.log(users);

// const record = tables.bankRecords.findBy("date", new Date()).one().value();

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
