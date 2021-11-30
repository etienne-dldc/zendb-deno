import { Filter, filters } from "../Filters.ts";
import { QUERY_BUILDER_INTERNAL, Direction } from "./utils.ts";
import { PageAddr } from "../PageAddr.ts";

export type QueryBuilderIndexData<V> = {
  direction?: Direction;
  offset?: { kind: "count"; count: number } | { kind: "addr"; addr: PageAddr };
  filter?: Filter<V>;
};

export class QueryBuilderIndex<V> {
  [QUERY_BUILDER_INTERNAL]: QueryBuilderIndexData<V>;

  constructor(data: QueryBuilderIndexData<V>) {
    this[QUERY_BUILDER_INTERNAL] = data;
  }

  sort(direction: Direction): QueryBuilderIndex<V> {
    return new QueryBuilderIndex<V>({
      ...this[QUERY_BUILDER_INTERNAL],
      direction,
    });
  }

  offsetByCount(offset: number): QueryBuilderIndex<V> {
    return new QueryBuilderIndex<V>({
      ...this[QUERY_BUILDER_INTERNAL],
      offset: { kind: "count", count: offset },
    });
  }

  offsetByAddr(addr: PageAddr): QueryBuilderIndex<V> {
    return new QueryBuilderIndex<V>({
      ...this[QUERY_BUILDER_INTERNAL],
      offset: { kind: "addr", addr },
    });
  }

  filter(filter: Filter<V>): QueryBuilderIndex<V> {
    return new QueryBuilderIndex<V>({
      ...this[QUERY_BUILDER_INTERNAL],
      filter,
    });
  }

  filterEqual(value: V): QueryBuilderIndex<V> {
    return this.filter(filters.equal(value));
  }
}
