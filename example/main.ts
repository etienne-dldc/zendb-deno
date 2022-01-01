import { ZenDB } from "../mod.ts";
import { resolve } from "https://deno.land/std@0.116.0/path/mod.ts";
import { customAlphabet } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";

const basePath = resolve(Deno.cwd(), "example");
const path = resolve(basePath, "demo.db");
const indexesPath = resolve(basePath, "demo.indexes.db");

type Item = {
  id: string;
  email: string;
  name: string;
  age: number;
};

type Indexes = {
  id: string;
  email: string;
  age: number;
};

Deno.removeSync(path);
Deno.removeSync(indexesPath);

const createId = customAlphabet("abcdefgh", 4);

const db = new ZenDB<Item, Indexes>(
  path,
  {
    id: ZenDB.unique((item: Item) => item.id),
    email: ZenDB.unique((item: Item) => item.email),
    age: (item: Item) => item.age,
  },
  { pageSize: 256 }
);

const insert = (age: number, name: string) => {
  const id = createId();
  db.insert({
    id: id,
    email: `${id}@example.com`,
    age,
    name,
  });
};

insert(4, "Etienne");
insert(21, "Paul");
insert(45, "Pierre");
insert(9, "Agathe");
insert(10, "Test");
insert(100, "Yolo");
// insert(54, "Over");
// insert(19, "Youpi");

db.save();

db.debug();

const items = db.query().selectBy("email").limit(2).values();

console.log(items);

// const item = db
//   .query()
//   .select("id", (iq) => iq.filter(filters.eq("hello")))
//   .limit(20)
//   .one()
//   .delete()
//   .transform((v) => v.age)
//   // .update()
//   .value();

// const item = db.query((pipe) =>
//   pipe
//     .filter("id", ops.equal("yolo"))
//     .updateAll((v) => ({ ...v, age: v.age + 1 }))
//     .dynamicTransform((v) => v.id)
//     .selectAll()
// );

// const res = db.query((pipe) =>
//   pipe.filterEqual("id", "yolo").sortBy("age").limit(20).offset(10).selectAll()
// );

db.close();
