import type { Model } from "mongoose";

interface PaginateCursorOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  query: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  pageSize?: number;
  cursor?: string | null;
}

interface PaginateCursorResult<T> {
  data: T[];
  meta: { nextCursor: string | null; hasMore: boolean };
}

interface PaginateOffsetOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: Model<any>;
  query: Record<string, unknown>;
  sort?: Record<string, 1 | -1>;
  pageSize?: number;
  page?: number;
}

interface PaginateOffsetResult<T> {
  data: T[];
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
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
}: PaginateCursorOptions): Promise<PaginateCursorResult<T>> {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function paginateOffset<T = any>({
  model,
  query,
  sort = { _id: -1 },
  pageSize = 10,
  page = 1,
}: PaginateOffsetOptions): Promise<PaginateOffsetResult<T>> {
  const effectivePage = Math.max(1, page);
  const effectivePageSize = Math.min(Math.max(pageSize, 1), 100);

  const [totalCount, docs] = await Promise.all([
    model.countDocuments(query),
    model
      .find(query)
      .sort(sort)
      .skip((effectivePage - 1) * effectivePageSize)
      .limit(effectivePageSize)
      .lean(),
  ]);

  const totalPages = Math.ceil(totalCount / effectivePageSize);

  return {
    data: docs,
    meta: { page: effectivePage, pageSize: effectivePageSize, totalCount, totalPages },
  };
}
