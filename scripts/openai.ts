// OpenAI Responses API for the catalog scripts (`npm run enrich`, `npm run photos`): retries rate limits and server
// errors, stops the whole run when the credits are used up or the key is wrong, and counts tokens.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");

/** Reads .env.local / .env (tsx does not load them like Next.js does). */
export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const line of readFileSync(full, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  }
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing — add it to .env.local");
}

/** No credits left or a wrong key: retrying cannot help, the whole run stops. */
export class FatalApiError extends Error {}

export const usage = { input: 0, output: 0, searches: 0 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sends one request to /v1/responses and returns the text of the answer. */
export async function respond(body: Record<string, unknown>): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ store: false, ...body }),
      signal: AbortSignal.timeout(240_000),
    }).catch((err: Error) => err);
    if (!(res instanceof Error) && (res.status === 401 || res.status === 429)) {
      const data = await res.clone().json().catch(() => ({}));
      const code = data.error?.code ?? data.error?.type;
      if (res.status === 401 || code === "insufficient_quota" || code === "credit_balance_exhausted") {
        throw new FatalApiError(`OpenAI ${res.status} (${code ?? "unauthorized"}): ${data.error?.message ?? ""}`);
      }
    }
    if (res instanceof Error || res.status === 429 || res.status >= 500) {
      if (attempt >= 5) throw res instanceof Error ? res : new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const wait = res instanceof Error ? 0 : Number(res.headers.get("retry-after")) * 1000;
      await sleep(Math.max(wait || 0, 3000 * 2 ** attempt));
      continue;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${data.error?.message ?? "unknown error"}`);
    usage.input += data.usage?.input_tokens ?? 0;
    usage.output += data.usage?.output_tokens ?? 0;
    const output = data.output as { type: string; content?: { type: string; text?: string; refusal?: string }[] }[];
    usage.searches += output.filter((o) => o.type === "web_search_call").length;
    if (data.status !== "completed") throw new Error(`response ${data.status}: ${JSON.stringify(data.incomplete_details)}`);
    const text = output
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? [])
      .map((c) => c.text ?? (c.refusal ? `REFUSAL: ${c.refusal}` : ""))
      .join("");
    if (text.startsWith("REFUSAL")) throw new Error(text);
    return text;
  }
}

export const tokenLine = () =>
  `${usage.input.toLocaleString("en")} tokens in, ${usage.output.toLocaleString("en")} out${usage.searches ? `, ${usage.searches} web searches` : ""}`;
