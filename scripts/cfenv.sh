#!/usr/bin/env bash
# 由 super-opendata-edu 的 site_template 產生（oe build 會覆蓋），不要在網站資料夾改。
# 讓這個程序裡的 wrangler／API 呼叫一定打到 project.yaml 指定的 Cloudflare 帳號：同時指定 API token 與帳號編號，
# 蓋過使用者環境變數與全機 OAuth 登入（直接打 wrangler 可能靜默打到錯帳號）。
# 用法：source scripts/cfenv.sh
_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
_conf() { grep "^$1:" "$_SRC/project.yaml" | head -1 | sed -E "s/^$1:[[:space:]]*//; s/[[:space:]]+#.*$//" | tr -d '\r'; }
CLOUDFLARE_API_TOKEN="$(grep "^$(_conf 憑證名稱)=" /d/ClaudeOnly/steve0802/cf-tokens.txt | cut -d= -f2- | tr -d '\r\n ')"
CLOUDFLARE_ACCOUNT_ID="$(_conf Cloudflare帳號編號)"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
