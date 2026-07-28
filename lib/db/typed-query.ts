import mongoose from "mongoose";

/**
 * Typed Mongoose query helpers.
 *
 * Mongoose 9's `InferSchemaType` produces types where ref fields are `Types.ObjectId`.
 * Route code passes plain strings as ids. Rather than casting at every call site,
 * these helpers isolate the type escape hatch here and return typed results.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = mongoose.Model<any>;

export async function leanFind<T>(
  model: AnyModel,
  filter: Record<string, unknown> = {},
  opts?: { sort?: Record<string, 1 | -1>; limit?: number },
): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = model.find(filter as any).lean();
  if (opts?.sort) query = query.sort(opts.sort);
  if (opts?.limit) query = query.limit(opts.limit);
  return query as Promise<T[]>;
}

export async function leanFindOne<T>(
  model: AnyModel,
  filter: Record<string, unknown> = {},
): Promise<T | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return model.findOne(filter as any).lean() as Promise<T | null>;
}

export async function leanFindById<T>(
  model: AnyModel,
  id: string,
): Promise<T | null> {
  return model.findById(id).lean() as Promise<T | null>;
}

export async function leanAggregate<T>(
  model: AnyModel,
  pipeline: unknown[],
): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return model.aggregate(pipeline as any) as Promise<T[]>;
}

export async function leanDistinct<T>(
  model: AnyModel,
  field: string,
  filter: Record<string, unknown> = {},
): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return model.distinct(field, filter as any).lean() as Promise<T[]>;
}

export async function findOneAndUpdate<T>(
  model: AnyModel,
  filter: Record<string, unknown>,
  update: Record<string, unknown>,
  opts?: { new?: boolean },
): Promise<T | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return model.findOneAndUpdate(filter as any, update as any, opts ?? {}) as Promise<T | null>;
}

export async function createDocument<T>(
  model: AnyModel,
  doc: Record<string, unknown>,
): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return model.create(doc) as Promise<T>;
}
