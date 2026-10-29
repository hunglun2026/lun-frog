// 由 super-opendata-edu 的 site_template 產生（oe build 會覆蓋），不要在網站資料夾改。
import type { Env } from "./env";
import { notifyError } from "./notify";

// 每月檢查：data.gov.tw 上本站用到的資料集 modifiedDate 有沒有比 public/data/meta.json 記的新。
// 資料整理（統一格式、改寫、照片）在本機用 super-opendata-edu 跑，這裡只負責發現更新並 ntfy 提醒，網站繼續用舊資料。
// 不用資料庫：上次整理時的日期就寫在隨網站發布的 meta.json 裡，從 ASSETS 讀出來比。
export async function runCheck(env: Env, origin: string): Promise<{ status: string; message: string }> {
  try {
    const r = await env.ASSETS.fetch(new Request(origin + "/data/meta.json"));
    if (!r.ok) throw new Error(`讀 meta.json 失敗：HTTP ${r.status}`);
    const meta: { sources: Record<string, { title: string; modified: string }> } = await r.json();
    const changed: string[] = [];
    for (const [id, src] of Object.entries(meta.sources)) {
      const res = await fetch(`https://data.gov.tw/api/v2/rest/dataset/${id}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`查 data.gov.tw ${id} 失敗：HTTP ${res.status}`);
      const m: any = await res.json();
      const mod = (m.result ?? m).modifiedDate;
      if (mod && mod > src.modified) changed.push(`${src.title}（${mod}）`);
    }
    if (!changed.length) return { status: "same", message: "資料沒有更新" };
    const res = { status: "update", message: `有 ${changed.length} 個資料集更新，請在本機跑 sd edu fetch → normalize → brief → build：` + changed.join("、") };
    await notifyError(env, `${env.SITE_NAME}：資料有更新`, res.message);
    return res;
  } catch (e) {
    const res = { status: "error", message: e instanceof Error ? e.message : String(e) };
    await notifyError(env, `${env.SITE_NAME}：每月檢查失敗`, res.message);
    return res;
  }
}
