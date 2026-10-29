// 由 super-opendata-edu 的 site_template 產生（oe build 會覆蓋），不要在網站資料夾改。
import type { Env } from "./env";
import { runCheck } from "./check";
import { handleReport } from "./report";

const authed = (req: Request, env: Env) => !!env.ADMIN_TOKEN && req.headers.get("authorization") === `Bearer ${env.ADMIN_TOKEN}`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    // 舊網址整站 301 轉到正式網址的同一個路徑
    const old = (env.OLD_HOSTS || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (old.includes(url.hostname)) return Response.redirect(env.SITE_URL + url.pathname + url.search + url.hash, 301);
    if (url.pathname === "/report") return handleReport(req, env);
    if (url.pathname.startsWith("/admin/")) {
      // 管理端點一律要 Authorization: Bearer <ADMIN_TOKEN>
      if (!authed(req, env)) return new Response("unauthorized", { status: 401 });
      if (url.pathname === "/admin/check" && req.method === "POST") return Response.json(await runCheck(env, url.origin));
      return new Response("not found", { status: 404 });
    }
    return env.ASSETS.fetch(req);
  },
  async scheduled(_e: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runCheck(env, env.SITE_URL));
  },
};
