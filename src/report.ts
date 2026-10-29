// 由 super-opendata-edu 的 site_template 產生（oe build 會覆蓋），不要在網站資料夾改。
import type { Env } from "./env";
import { notifyError } from "./notify";

// 頁尾「回報內容錯誤」：POST /report {text, page} → ntfy。不收姓名與聯絡方式。
// 擋大量送出：Cache API 記每個 IP 10 分鐘內送了幾次（每個機房各算各的，只擋一般的連續狂按，不用資料庫）。
const WINDOW = 600;
const LIMIT = 5;

async function overLimit(ip: string): Promise<boolean> {
  const cache = caches.default;
  const key = new Request(`https://report-limit.invalid/${encodeURIComponent(ip)}`);
  const hit = await cache.match(key);
  const n = hit ? Number(await hit.text()) || 0 : 0;
  if (n >= LIMIT) return true;
  await cache.put(key, new Response(String(n + 1), { headers: { "cache-control": `max-age=${WINDOW}` } }));
  return false;
}

export async function handleReport(req: Request, env: Env): Promise<Response> {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  let body: { text?: unknown; page?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 500) : "";
  const page = typeof body.page === "string" ? body.page.slice(0, 200) : "";
  if (text.length < 4) return new Response("too short", { status: 400 });
  const ip = req.headers.get("cf-connecting-ip") || "unknown";
  if (await overLimit(ip)) return new Response("too many", { status: 429 });
  await notifyError(env, `${env.SITE_NAME}：有人回報內容錯誤`, `頁面：${page}\n${text}`);
  return Response.json({ ok: true });
}
