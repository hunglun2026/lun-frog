"""由 super-opendata-edu 的 site_template 產生（oe build 會覆蓋），不要在網站資料夾改。
離線檢查 public/data 的資料完整性（npm test 會跑；GitHub Actions 部署前也跑）。有問題離場碼 1。"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
DATA = PUB / "data"
PRIVATE = ("caseOwnership", "owner", "ownerName", "phone", "email")  # 個資欄位不准出現在公開資料
errors = []


def err(msg):
    errors.append(msg)


d = json.loads((DATA / "site.json").read_text("utf-8"))
meta = json.loads((DATA / "meta.json").read_text("utf-8"))
items = d["items"]
ids = [a["id"] for a in items]
if len(ids) != len(set(ids)):
    err("id 重複")
if meta["count"] != len(items):
    err(f"meta.count {meta['count']} ≠ 實際 {len(items)}")
if meta["rewritten"] != sum(1 for a in items if "k" in a):
    err("meta.rewritten 跟實際改寫筆數不同")
if not meta.get("sources"):
    err("meta.json 沒有資料集來源（Worker 每月比對要用）")
origs = {}
for a in items:
    t = f"{a['id']} {a['name']}"
    if "k" in a:
        if not (a.get("e") and len(a.get("c") or []) == 3):   # q（探究題）看各站 schema，不強制
            err(f"{t}：改寫缺欄位")
    if not a.get("src"):
        err(f"{t}：缺原文來源網址")
    if a.get("photo"):
        if not a["photo"].get("by"):
            err(f"{t}：照片缺作者")
        for w in (480, 800):
            if not (PUB / "img" / "p" / f"{a['id']}-{w}.webp").exists():
                err(f"{t}：缺照片檔 {w}")
    if a["of"] not in origs:
        f = DATA / "orig" / f"{a['of']}.json"
        origs[a["of"]] = json.loads(f.read_text("utf-8")) if f.exists() else None
    if origs[a["of"]] is None or a["id"] not in origs[a["of"]]:
        err(f"{t}：原文分檔 {a['of']}.json 沒有這筆")
raw = (DATA / "site.json").read_text("utf-8")
for k in PRIVATE:
    if f'"{k}"' in raw:
        err(f"公開資料出現個資欄位 {k}")
geo = DATA / "taiwan.json"
if not geo.exists() or not json.loads(geo.read_text("utf-8")).get("path"):
    err("taiwan.json 地圖輪廓不見了")

for e in errors[:40]:
    print("[錯]", e)
print(f"檢查 {len(items)} 筆，已改寫 {meta['rewritten']}，有照片 {meta['photos']}，問題 {len(errors)} 個")
sys.exit(1 if errors else 0)
