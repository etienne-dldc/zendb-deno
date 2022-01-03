// deno-lint-ignore-file no-explicit-any
export function sqlQuote(str: string): string {
  return "`" + str + "`";
}

export function mapObject<
  In extends Record<string, any>,
  Out extends Record<keyof In, any>
>(obj: In, mapper: (key: string, value: In[keyof In]) => Out[keyof In]): Out {
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [key, mapper(key, val)])
  ) as any;
}

export function expectNever(val: never): never {
  throw new Error(`Unexpected never ${val}`);
}
