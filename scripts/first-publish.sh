#!/usr/bin/env bash
# 兩棲探險家第一次上線（只跑一次；之後更新用 scripts/publish-public.sh）。照植物探險家 0.1.0 上線的步驟：
#   1. 用 hunglun2026-workflow 那把 PAT 建公開 repo hunglun2026/lun-frog（程序內帶入，不切換全機 gh 登入）
#   2. 設 Actions 密鑰 CLOUDFLARE_API_TOKEN／CLOUDFLARE_ACCOUNT_ID（hunglun2026）
#   3. publish-public.sh 推上去，等 GitHub Actions 部署完
#   4. 帳號層級 API 綁 frog.hunglun.com（wrangler.jsonc 不寫 routes）
#   5. Worker 密鑰 NTFY_TOPIC、ADMIN_TOKEN（.prod.secrets，用檔案帶入，不用管線）
# 用法（Steve 在 Claude Code 裡）：! bash /d/ClaudeOnly/school/lun-frog/scripts/first-publish.sh
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SRC"
REPO=hunglun2026/lun-frog
GH_TOKEN="$(grep '^hunglun2026-workflow=' /d/ClaudeOnly/steve0802/gh-tokens.txt | cut -d= -f2- | tr -d '\r\n ')"
export GH_TOKEN
source scripts/cfenv.sh

echo "■ 1/5 建 repo"
if gh repo view "$REPO" >/dev/null 2>&1; then echo "   已存在"; else
  gh repo create "$REPO" --public --description "兩棲探險家 frog.hunglun.com：水利署兩棲類調查開放資料做的國小教學網站"
  # 空 repo 不能 clone 出 main，先放一個 README 當第一個 commit
  gh api -X PUT "repos/$REPO/contents/README.md" -f message="建立" -f content="$(printf '# 兩棲探險家\n\nhttps://frog.hunglun.com\n' | base64 -w0)" >/dev/null
fi

echo "■ 2/5 Actions 密鑰"
gh secret set CLOUDFLARE_API_TOKEN -R "$REPO" --body "$CLOUDFLARE_API_TOKEN"
gh secret set CLOUDFLARE_ACCOUNT_ID -R "$REPO" --body "$CLOUDFLARE_ACCOUNT_ID"

echo "■ 3/5 推送並等部署"
bash scripts/publish-public.sh "兩棲探險家 0.1.0：31 種兩棲類、6 個學習工具"
sleep 8
RUN="$(gh run list -R "$REPO" -L 1 --json databaseId -q '.[0].databaseId')"
gh run watch "$RUN" -R "$REPO" --exit-status

echo "■ 4/5 綁網域 frog.hunglun.com"
API=https://api.cloudflare.com/client/v4
AUTH=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json")
ZONE="$(curl -s "${AUTH[@]}" "$API/zones?name=hunglun.com" | python -X utf8 -c "import json,sys;print(json.load(sys.stdin)['result'][0]['id'])")"
curl -s -X PUT "${AUTH[@]}" "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains" \
  -d "{\"hostname\":\"frog.hunglun.com\",\"service\":\"frog-explorer\",\"zone_id\":\"$ZONE\",\"environment\":\"production\"}" \
  | python -X utf8 -c "import json,sys;r=json.load(sys.stdin);print('   成功' if r.get('success') else r.get('errors'))"

echo "■ 5/5 Worker 密鑰"
npx wrangler secret bulk .prod.secrets

echo "完成。接著讓 Claude 打線上網址比對內容。"
