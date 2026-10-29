/* 兩棲探險家：這一站的設定（window.SITE）。所有頁面最先載入這支，再載入 /js/core/*（通用核心，工具產生，不要手改）。
   負責：站名、導覽列、各科的圖示顏色、常見程度、線索遮名、護照的遊戲與徽章。
   資料是水利署河川情勢調查的紀錄（流域、月份、筆數），沒有外形與習性，所以畫面上不寫資料沒有的事。 */
(function () {
  "use strict";
  // 科：照資料裡最新登錄的科別（轉接器 wra_amphibians）
  const FAMILIES = {
    赤蛙科: { emoji: "🐸", color: "#b4532a" },
    樹蛙科: { emoji: "🌿", color: "#2f8f4e" },
    蟾蜍科: { emoji: "🪨", color: "#7a5c3a" },
    狹口蛙科: { emoji: "🔸", color: "#c98a12" },
    叉舌蛙科: { emoji: "🍃", color: "#5a7d2a" },
    樹蟾科: { emoji: "🌱", color: "#1f8a8a" },
    山椒魚科: { emoji: "🦎", color: "#6a4fb0" },
  };
  // 常見程度：依水利署調查的紀錄筆數分三級（門檻寫在這裡，小百科、遊戲、學習單共用）
  const COMMON = [
    { id: "很常見", min: 300, emoji: "⭐⭐⭐", hint: "300 筆以上" },
    { id: "常見", min: 50, emoji: "⭐⭐", hint: "50 到 299 筆" },
    { id: "少見", min: 0, emoji: "⭐", hint: "不到 50 筆" },
  ];
  const familyOf = (name) => FAMILIES[name] || FAMILIES["赤蛙科"];
  const commonOf = (n) => COMMON.find((c) => n >= c.min);
  const MONTHS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

  window.SITE = {
    key: "frog",
    name: "兩棲探險家",
    logo: "🐸 兩棲探險家",
    noun: "兩棲類", unit: "種",
    detailUrl: "/frogs#",
    dataFile: "/data/site.json",
    loading: "兩棲類資料載入中…🐸",
    champion: "兩棲小博士",
    maker: "本站非經濟部水利署製作。鴻綸科技 製作",
    confetti: ["#2f8f4e", "#b4532a", "#c98a12", "#1f8a8a", "#8bc34a", "#ffd166"],
    FAMILIES, COMMON, MONTHS, familyOf, commonOf,
    // [頁面代號, 名稱, 網址, 低年級也顯示嗎]
    nav: [
      ["frogs", "兩棲小百科", "/frogs", true],
      ["season", "幾月遇得到", "/season", true],
      ["classify", "蛙蛙分類", "/classify", true],
      ["map", "溪流地圖", "/map", true],
      ["passport", "探險護照", "/passport", true],
      ["teacher", "教師專區", "/teacher", false],
    ],
    footer: "",
    stamp: (m) => "目前收錄 " + m.count + " 種兩棲類，其中 " + m.rewritten + " 種已完成分級介紹。資料整理日期：" + m.version + "。",
    enrich(a) {
      const at = a.attrs || {};
      a.family = at.family || "";
      a.familyInfo = familyOf(a.family);
      a.order = at.order || "";
      a.latin = at.latin || "";
      a.oldLatin = at.old_latin || [];
      a.basins = at.basins || [];
      a.basinN = at.basin_n || [];
      a.months = at.months || [];
      a.records = at.records || 0;
      a.common = commonOf(a.records);
      // 樣點字串「緯度,經度,流域,樣點名,筆數」→ 物件（地圖頁用；樣點名裡可能有逗號，所以頭兩個與最後一個以外都併回名字）
      a.spots = (at.spots || []).map((s) => {
        const p = s.split(",");
        return { lat: +p[0], lng: +p[1], basin: p[2], name: p.slice(3, -1).join(","), n: +p[p.length - 1] };
      });
      a.place = a.family;
    },
    icon: (a) => a.familyInfo.emoji,
    color: (a) => a.familyInfo.color,
    // 線索遮名：名稱（跟查核程式 names_of 同一套）
    maskNames(a) {
      return [a.name];
    },
    games: [
      ["family", "認識蛙的家族"], ["more", "誰的紀錄比較多"], ["classify-timed", "家族分類・60 秒"], ["season", "猜猜哪個季節最常遇到"],
    ],
    badges(seen, st) {
      const fams = new Set(seen.map((a) => a.family));
      const basins = new Set(seen.flatMap((a) => a.basins));
      return [
        ["👣", "第一步", "在小百科看第 1 種兩棲類", seen.length >= 1],
        ["📖", "兩棲百科通", "在小百科看過 20 種", seen.length >= 20],
        ["🌿", "樹蛙迷", "看過 8 種樹蛙科", seen.filter((a) => a.family === "樹蛙科").length >= 8],
        ["🧭", "家族都認識", "7 個科都看過", fams.size >= 7],
        ["🏞️", "走遍溪流", "看過的兩棲類出現在 20 個流域", basins.size >= 20],
        ["🏆", "分類高手", "認識蛙的家族拿到三顆星", st("family") >= 3],
        ["📊", "紀錄達人", "誰的紀錄比較多拿到三顆星", st("more") >= 3],
        ["📅", "季節達人", "猜猜哪個季節最常遇到拿到三顆星", st("season") >= 3],
        ["⚡", "閃電快手", "60 秒挑戰拿到三顆星", st("classify-timed") >= 3],
      ];
    },
  };
})();
