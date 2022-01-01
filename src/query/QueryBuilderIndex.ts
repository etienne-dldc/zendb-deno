import { Filter, filters } from "../Filters.ts";
import { QUERY_BUILDER_INTERNAL, Direction, IndexSelectData } from "./utils.ts";
import { PageAddr } from "../PageAddr.ts";
import { Comparable } from "../tools/Comparable.ts";

export class QueryBuilderIndex<V extends Comparable> {
  [QUERY_BUILDER_INTERNAL]: IndexSelectData<V>;

  constructor(data: IndexSelectData<V>) {
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
