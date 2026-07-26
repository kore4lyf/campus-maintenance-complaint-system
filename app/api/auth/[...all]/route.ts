import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

async function handler(request: Request) {
  const auth = await getAuth();
  const next = toNextJsHandler(auth);
  return next(request);
}

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
