import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/config";

export const dynamic = "force-dynamic";

const handlers = toNextJsHandler(await getAuth());

export const { GET, POST } = handlers;
