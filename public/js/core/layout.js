/* 由 super-opendata-edu 的 site_template 產生（oe build 會覆蓋），不要在網站資料夾改。
   頁首（導覽列＋難度切換）、頁尾（資料來源＋回報錯誤）與頁面啟動器 App.boot(fn)。
   每頁 <body data-page="..."> 決定導覽列亮哪一個；導覽、頁尾文字都來自 SITE。 */
(function () {
  "use strict";
  const S = App.SITE;
  const page = document.body.dataset.page || "";
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  const main = document.querySelector("main");
  main.before(wrap);
  const lv = App.level();
  wrap.innerHTML =
    '<header class="top"><a class="logo" href="/">' + App.esc(S.logo) + '</a><nav aria-label="主選單">' +
    S.nav.map((n) => '<a href="' + n[2] + '"' + (n[0] === page ? ' aria-current="page"' : "") + (n[3] ? "" : " data-nokid") + ">" + App.esc(n[1]) + "</a>").join("") +
    '</nav><label class="lvl">年級<select id="lvl" aria-label="年級">' +
    Object.entries(App.LEVELS).map(([k, v]) => '<option value="' + k + '"' + (k === lv ? " selected" : "") + ">" + v.name + "</option>").join("") +
    "</select></label></header>";
  wrap.appendChild(main);
  const applyLevel = (v) => {
    document.documentElement.dataset.level = v; // CSS 依程度切換（幼兒園字放大、藏掉文字多的連結）
    document.querySelectorAll(".say").forEach((b) => (b.hidden = v !== "k"));
  };
  applyLevel(lv);
  wrap.querySelector("#lvl").onchange = (e) => App.setLevel(e.target.value);
  document.addEventListener("app-level", (e) => applyLevel(e.detail));

  const foot = document.createElement("footer");
  foot.className = "foot";
  foot.innerHTML =
    "<div class=\"foot-brand\"><img src=\"/img/hunglun-logo.webp\" alt=\"鴻綸科技\" width=\"282\" height=\"56\"></div>" +
    "<p class=\"foot-copy\">本站資料主要為政府單位開放資料，資料版權屬原資料提供單位，由鴻綸科技整理製作。本站程式、介面設計與整理編排 © 2026 鴻綸科技股份有限公司 版權所有，未經書面同意，不得轉載、複製、改作或仿製。</p>" +
    '<p id="data-stamp" hidden></p>' +
    '<p class="foot-copy"><button class="btn" id="report" type="button">回報內容錯誤</button></p>';
  wrap.appendChild(foot);

  // 回報錯誤：送到 Worker /report（轉 ntfy），不收姓名與聯絡方式
  foot.querySelector("#report").onclick = () => {
    const d = document.createElement("dialog");
    d.className = "zdlg";
    d.innerHTML = '<h2 style="margin-top:0">回報內容錯誤</h2><p>哪裡寫錯了？請寫出是哪一處、哪一句。不要留姓名或聯絡方式。</p>' +
      '<textarea id="rp" rows="5" maxlength="500" style="width:100%;font:inherit"></textarea><p id="rpmsg" role="status"></p>' +
      '<div class="row"><button class="btn" data-v="0">取消</button><button class="btn primary" data-v="1">送出</button></div>';
    document.body.appendChild(d);
    d.showModal();
    const close = () => { d.close(); d.remove(); };
    d.querySelector('[data-v="0"]').onclick = close;
    d.querySelector('[data-v="1"]').onclick = async () => {
      const text = d.querySelector("#rp").value.trim();
      const msg = d.querySelector("#rpmsg");
      if (text.length < 4) { msg.textContent = "請多寫幾個字，說明哪裡錯了。"; return; }
      try {
        const r = await fetch("/report", { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ text, page: location.pathname + location.hash }) });
        if (!r.ok) throw new Error(r.status);
        close();
        App.dialog("謝謝你！我們收到了，會盡快查證修正。");
      } catch (e) { msg.textContent = "送不出去，請稍後再試。"; }
    };
  };

  // App.boot(fn)：載入資料後呼叫 fn(data)，處理載入中與失敗畫面
  App.boot = async function (fn) {
    main.insertAdjacentHTML("beforeend", '<div class="loading" id="boot">' + App.esc(S.loading || "資料載入中…") + "</div>");
    try {
      const data = await App.load();
      document.getElementById("boot").remove();
      document.getElementById("data-stamp").textContent = S.stamp(data.meta);
      document.querySelectorAll("[data-count]").forEach((e) => (e.textContent = data.meta.count));
      await fn(data);
      // 量「畫面可以操作」的時間用：測試腳本讀 <html data-ready>（毫秒）
      document.documentElement.dataset.ready = Math.round(performance.now());
    } catch (e) {
      console.error(e);
      const b = document.getElementById("boot");
      if (b) { b.className = "err"; b.innerHTML = '資料載入失敗了。請檢查網路後重新整理。<br><button class="btn" onclick="location.reload()">重新整理</button>'; }
    }
  };
})();
