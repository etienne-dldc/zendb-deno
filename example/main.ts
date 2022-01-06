import { resolve } from "https://deno.land/std@0.113.0/path/mod.ts";
import { ensureDirSync } from "https://deno.land/std@0.113.0/fs/mod.ts";
import { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";
import * as v001 from "./migrations/v001.ts";
import * as v002 from "./migrations/v002.ts";
import * as sql from "../mod.ts";

const e = sql.expr;

const dbFolderPath = resolve(Deno.cwd(), "example");
const databasePath = resolve(dbFolderPath, "database.db");
const migrationDatabasePath = resolve(dbFolderPath, "migration-database.db");

ensureDirSync(dbFolderPath);

const migration = sql.Migrations.create({
  id: "init",
  description: "Initialize database",
  schema: v001.schema,
  migrate: (_, db) => {
    const createPeople = (): v001.People => ({
      id: nanoid(10),
      name: "John",
      age: Math.floor(Math.random() * 100),
      date: new Date(),
    });
    for (let i = 0; i < 10; i++) {
      db.tables.peoples.insert(createPeople());
    }
  },
}).addMigration({
  id: "rename-people-to-user",
  description: "Rename people table to user",
  schema: v002.schema,
  migrate: (prev, next) => {
    const allPeoples = prev.tables.peoples.all().values();
    for (const people of allPeoples) {
      next.tables.users.insert(people);
    }

    const allBankRecords = prev.tables.bankRecords.all().values();
    for (const bankRecords of allBankRecords) {
      next.tables.bankRecords.insert(bankRecords);
    }
  },
});

export const database = await migration.apply({
  databasePath,
  migrationDatabasePath,
});

const tables = database.tables;

const queryUser = tables.users
  .prepare({ maxAge: sql.value.number() })
  .where(({ params, indexes }) => e.lte(indexes.age, params.maxAge));

tables.users
  .select(queryUser, { maxAge: 30 })
  .update((prev) => ({ ...prev, name: "Lucas" }))
  .apply();

const users = tables.users.select(queryUser, { maxAge: 30 }).valuesArray();

console.log(users);

const usersCount = tables.users.count(queryUser, { maxAge: 30 });

console.log({ usersCount });
