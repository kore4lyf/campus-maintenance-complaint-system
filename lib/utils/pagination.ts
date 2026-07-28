import type { Model } from "mongoose";

interface PaginateOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  query: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  pageSize?: number;
  cursor?: string | null;
}

interface PaginateResult<T> {
  data: T[];
  meta: { nextCursor: string | null; hasMore: boolean };
}

function isValidObjectId(value: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function paginateCursor<T = any>({
  model,
  query,
  sort = { _id: -1 },
  pageSize = 20,
  cursor = null,
}: PaginateOptions): Promise<PaginateResult<T>> {
  const effectivePageSize = Math.min(Math.max(pageSize, 1), 100);
  const filter: Record<string, unknown> = { ...query };

  if (cursor && isValidObjectId(cursor)) {
    filter._id = { $lt: cursor };
  }

  const docs = await model
    .find(filter)
    .sort(sort)
    .limit(effectivePageSize + 1)
    .lean();

  const hasMore = docs.length > effectivePageSize;
  const data = hasMore ? docs.slice(0, effectivePageSize) : docs;
  const lastItem = data[data.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem._id) : null;

  return {
    data,
    meta: { nextCursor, hasMore },
  };
}
