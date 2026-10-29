/* 溪流地圖：臺灣輪廓 SVG 上打出水利署的調查樣點（attrs.spots，轉接器把 TWD97 座標換成經緯度），點越大＝記錄到的種類越多。
   選流域：亮出那個流域的樣點，列出在那裡記錄到的兩棲類；選一種兩棲類：亮出牠出現過的樣點。點樣點看那裡記錄到哪些。
   「找我附近的」：用這台裝置的位置找最近的 5 個樣點（只在裝置上計算，不送出去）。
   投影參數來自 /data/taiwan.json（工具 core/geo.py 產生，公式兩邊要一樣，照古蹟探險家的 /map）。網址 #b=流域、#s=種類 id 可直接開。 */
App.boot(async function (data) {
  const { esc, el, photo } = App;
  const items = data.items;
  const byId = Object.fromEntries(items.map((a) => [a.id, a]));
  const geo = await (await fetch("/data/taiwan.json?v=" + encodeURIComponent(data.version))).json();
  const [x0, , , y1] = geo.bbox;
  const sx = geo.w / ((geo.bbox[2] - x0) * geo.k);
  const proj = (lng, lat) => [(lng - x0) * geo.k * sx, (y1 - lat) * sx];

  // ---- 樣點：同一個座標合成一點，記下每種兩棲類在這裡幾筆 ----
  const sites = new Map();
  items.forEach((a) => a.spots.forEach((s) => {
    const key = s.lat + "," + s.lng;
    if (!sites.has(key)) sites.set(key, { key, lat: s.lat, lng: s.lng, basin: s.basin, name: s.name, sp: [] });
    sites.get(key).sp.push({ id: a.id, n: s.n });
  }));
  const all = [...sites.values()];
  all.forEach((s) => s.sp.sort((p, q) => q.n - p.n));

  // ---- 地圖 ----
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + geo.w + " " + geo.h);
  svg.setAttribute("class", "map");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "臺灣兩棲類調查樣點地圖");
  const land = document.createElementNS(NS, "path");
  land.setAttribute("d", geo.path);
  land.setAttribute("class", "land");
  svg.appendChild(land);
  const dots = new Map();
  all.sort((p, q) => p.sp.length - q.sp.length).forEach((s) => {
    const [x, y] = proj(s.lng, s.lat);
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", x.toFixed(1));
    c.setAttribute("cy", y.toFixed(1));
    c.setAttribute("r", (2.4 + Math.min(s.sp.length, 12) * 0.35).toFixed(1));
    c.setAttribute("class", "dot");
    const t = document.createElementNS(NS, "title");
    t.textContent = s.basin + "流域・" + s.name + "：" + s.sp.length + " 種";
    c.appendChild(t);
    c.addEventListener("click", () => showSite(s));
    svg.appendChild(c);
    dots.set(s.key, c);
  });
  document.getElementById("mapbox").appendChild(svg);

  // ---- 選單 ----
  const basinSel = document.getElementById("basin");
  const spSel = document.getElementById("sp");
  const basins = [...new Set(all.map((s) => s.basin))];
  const spInBasin = (b) => items.filter((a) => a.basins.includes(b));
  basins.sort((p, q) => spInBasin(q).length - spInBasin(p).length)
    .forEach((b) => basinSel.appendChild(el('<option value="' + esc(b) + '">' + esc(b) + "（" + spInBasin(b).length + " 種）</option>")));
  items.slice().sort((p, q) => q.records - p.records)
    .forEach((a) => spSel.appendChild(el('<option value="' + a.id + '">' + esc(a.name) + "</option>")));
  basinSel.onchange = () => { spSel.value = ""; basinSel.value ? showBasin(basinSel.value) : reset(); };
  spSel.onchange = () => { basinSel.value = ""; spSel.value ? showSp(byId[spSel.value]) : reset(); };

  // ---- 亮點與清單 ----
  const list = document.getElementById("list");
  const count = document.getElementById("count");
  function light(keys) {
    dots.forEach((c, k) => { c.classList.toggle("dim", !!keys && !keys.has(k)); c.classList.toggle("on", !!keys && keys.has(k)); });
  }
  function row(a, extra) {
    const r = el('<a class="nrow" href="/frogs#' + encodeURIComponent(a.id) + '"><span class="pic"></span><span><b>' + esc(a.name) + "</b><br><small>" +
      a.familyInfo.emoji + " " + esc(a.family) + (extra ? "・" + extra : "") + "</small>" + (a.k ? "<br><small>" + esc(a.k) + "</small>" : "") + "</span></a>");
    r.querySelector(".pic").replaceWith(photo(a));
    return r;
  }
  function reset() {
    light(null);
    history.replaceState(null, "", location.pathname);
    count.textContent = "地圖上有 " + all.length + " 個調查樣點，點越大，記錄到的種類越多。選一個流域或一種兩棲類看看。";
    list.replaceChildren(el('<p class="lead">記錄到最多種類的樣點：</p>'),
      ...all.slice().sort((p, q) => q.sp.length - p.sp.length).slice(0, 6).map((s) => siteBtn(s)));
  }
  function siteBtn(s) {
    const b = el('<button class="nrow site" type="button"><span class="ico">📍</span><span><b>' + esc(s.name) + "</b><br><small>" +
      esc(s.basin) + "流域・記錄到 " + s.sp.length + " 種</small></span></button>");
    b.onclick = () => showSite(s);
    return b;
  }
  function showBasin(b) {
    history.replaceState(null, "", "#b=" + encodeURIComponent(b));
    light(new Set(all.filter((s) => s.basin === b).map((s) => s.key)));
    const sp = spInBasin(b).map((a) => [a, a.basinN[a.basins.indexOf(b)]]).sort((p, q) => q[1] - p[1]);
    count.textContent = b + "流域：" + all.filter((s) => s.basin === b).length + " 個樣點，記錄到 " + sp.length + " 種兩棲類。";
    list.replaceChildren(...sp.map(([a, n]) => row(a, n + " 筆")),
      el('<p><a class="btn" href="/frogs?basin=' + encodeURIComponent(b) + '">在小百科看' + esc(b) + "流域的兩棲類 ➜</a></p>"));
  }
  function showSp(a) {
    history.replaceState(null, "", "#s=" + encodeURIComponent(a.id));
    light(new Set(a.spots.map((s) => s.lat + "," + s.lng)));
    count.textContent = a.name + "：在 " + a.basins.length + " 個流域、" + a.spots.length + " 個樣點有紀錄。";
    list.replaceChildren(row(a, a.records + " 筆紀錄"), el('<p class="lead">紀錄最多的流域：' +
      a.basins.slice(0, 6).map((b, i) => esc(b) + " " + a.basinN[i] + " 筆").join("、") + "</p>"));
  }
  function showSite(s, extra) {
    light(new Set([s.key]));
    svg.appendChild(dots.get(s.key)); // 移到最上層，不被別的點蓋住
    count.textContent = s.basin + "流域・" + s.name + (extra ? "（" + extra + "）" : "") + "：記錄到 " + s.sp.length + " 種兩棲類。";
    list.replaceChildren(...s.sp.map(({ id, n }) => row(byId[id], "這裡 " + n + " 筆")));
    list.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---- 找我附近的：只在這台裝置上算距離 ----
  const km = (s, lat, lng) => {
    const r = Math.PI / 180, dLat = (s.lat - lat) * r, dLng = (s.lng - lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat * r) * Math.cos(s.lat * r) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };
  document.getElementById("locate").onclick = () => {
    if (!navigator.geolocation) return App.dialog("這台裝置不能定位，請改用上面的選單。");
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const near = all.map((s) => [s, km(s, lat, lng)]).sort((p, q) => p[1] - q[1]).slice(0, 5);
      const old = svg.querySelector(".me");
      if (old) old.remove();
      const [x, y] = proj(lng, lat);
      if (x >= 0 && y >= 0 && x <= geo.w && y <= geo.h) {
        const me = document.createElementNS(NS, "circle");
        me.setAttribute("cx", x); me.setAttribute("cy", y); me.setAttribute("r", 6); me.setAttribute("class", "me");
        svg.appendChild(me);
      }
      light(new Set(near.map((p) => p[0].key)));
      count.textContent = "離你最近的 5 個調查樣點：";
      list.replaceChildren(...near.map(([s, d]) => {
        const b = siteBtn(s);
        b.querySelector("small").textContent += "・約 " + (d < 10 ? d.toFixed(1) : Math.round(d)) + " 公里";
        b.onclick = () => showSite(s, "約 " + (d < 10 ? d.toFixed(1) : Math.round(d)) + " 公里");
        return b;
      }));
    }, () => App.dialog("沒有拿到位置（可能沒有允許定位）。請改用上面的選單。"), { timeout: 15000 });
  };

  reset();
  const fromHash = () => {
    const m = location.hash.match(/^#([bs])=(.+)$/);
    if (!m) return;
    const v = decodeURIComponent(m[2]);
    if (m[1] === "b" && basins.includes(v)) { basinSel.value = v; basinSel.onchange(); }
    if (m[1] === "s" && byId[v]) { spSel.value = v; spSel.onchange(); }
  };
  addEventListener("hashchange", fromHash); // 同一頁只改 # 不會重新載入，要自己接
  fromHash();
});
