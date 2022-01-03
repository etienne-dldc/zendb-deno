// deno-lint-ignore-file no-explicit-any
import { Database } from "./Database.ts";
import { DB } from "../deps.ts";
import { SchemaAny } from "./Schema.ts";

type Options = {
  databasePath: string;
  migrationDatabasePath: string;
};

type Migrate<
  PrevSchema extends SchemaAny | null,
  NextSchema extends SchemaAny
> = (
  prev: PrevSchema extends SchemaAny ? Database<PrevSchema> : null,
  next: Database<NextSchema>
) => void | Promise<void>;

type MigrationItem = {
  name: string;
  database: Database<SchemaAny>;
  migrate?: Migrate<SchemaAny | null, SchemaAny>;
};

export class Migrations<Schema extends SchemaAny> {
  static create<Schema extends SchemaAny>(
    name: string,
    schema: Schema,
    migrate: Migrate<null, Schema>,
    options: Options
  ): Migrations<Schema> {
    return new Migrations([], options).addMigration(
      name,
      schema,
      migrate as any
    );
  }

  readonly #migrations: Array<MigrationItem>;
  readonly #options: Options;

  private constructor(migrations: Array<MigrationItem>, options: Options) {
    this.#migrations = migrations;
    this.#options = options;
  }

  addMigration<NextSchema extends SchemaAny>(
    name: string,
    schema: NextSchema,
    migrate?: Migrate<Schema, NextSchema>
  ): Migrations<NextSchema> {
    const item: MigrationItem = {
      name,
      database: new Database(schema, this.#migrations.length),
      migrate: migrate as any,
    };
    return new Migrations([...this.#migrations, item], this.#options);
  }

  async apply(): Promise<Database<Schema>> {
    const db = new DB(this.#options.databasePath);
    const currentVersion = db.query<[number]>(`PRAGMA user_version;`)[0][0];
    db.close();
    console.info(`Database current version: ${currentVersion}`);
    const stepIndex = this.#migrations.findIndex(
      (mig) => mig.database.fingerpring === currentVersion
    );
    if (currentVersion !== 0 && stepIndex === -1) {
      throw new Error(`Cannot find current db version in migration list`);
    }
    const queue = this.#migrations.slice(stepIndex + 1);
    if (queue.length === 0) {
      console.log(`Database schema is up to date`);
    } else {
      console.log(`${queue.length} migrations to apply`);
    }
    for await (const mig of queue) {
      const index = this.#migrations.indexOf(mig);
      const prevItem = index === 0 ? null : this.#migrations[index - 1];
      const prevDb = prevItem ? prevItem.database : null;
      const nextDb = mig.database;
      console.log(
        `Running migration ${mig.name} (${
          prevDb ? prevDb.fingerpring : "INIT"
        } -> ${nextDb.fingerpring})`
      );
      if (prevDb) {
        prevDb.connect(this.#options.databasePath);
      }
      removeSyncIfExist(this.#options.migrationDatabasePath);
      nextDb.connect(this.#options.migrationDatabasePath);
      nextDb.initSchema();
      if (mig.migrate) {
        await mig.migrate(prevDb, nextDb);
      }
      nextDb.setUserVersion();
      if (prevDb) {
        prevDb.close();
      }
      nextDb.close();
      removeSyncIfExist(this.#options.databasePath);
      Deno.renameSync(
        this.#options.migrationDatabasePath,
        this.#options.databasePath
      );
    }
    const lastDb = this.#migrations[this.#migrations.length - 1].database;
    lastDb.connect(this.#options.databasePath);
    return lastDb as any;
  }
}

function removeSyncIfExist(path: string) {
  try {
    Deno.removeSync(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return;
    }
    throw error;
  }
}
