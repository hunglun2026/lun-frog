// 由 super-opendata-edu 的 site_template 產生（oe build 會覆蓋），不要在網站資料夾改。
export interface Env {
  ASSETS: Fetcher;
  APP_VERSION: string;
  SITE_NAME: string;   // 例：古蹟探險家（ntfy 通知標題用）
  SITE_URL: string;    // 正式網址，例：https://heritage.hunglun.com
  OLD_HOSTS?: string;  // 舊網址（逗號分隔），整站 301 轉到正式網址
  NTFY_TOPIC?: string; // secret
  ADMIN_TOKEN?: string; // secret
}
