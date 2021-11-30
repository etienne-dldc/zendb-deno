export { nanoid } from "https://deno.land/x/nanoid@v3.0.0/mod.ts";
export { extname } from "https://deno.land/std@0.116.0/path/mod.ts";
export {
  PagedFile,
  Block,
  Page,
  FixedBlockList,
  BlockSeq,
  BinvalReadBlock,
  BinvalWriteBlock,
  BinvalBlock,
  MEMORY,
} from "https://raw.githubusercontent.com/etienne-dldc/paged-file/main/mod.ts";
export type {
  IBlock,
  IBufferFacade,
} from "https://raw.githubusercontent.com/etienne-dldc/paged-file/main/mod.ts";
