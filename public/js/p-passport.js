/* 探險護照：看過幾種兩棲類（依科分）、徽章、各遊戲最好幾顆星。紀錄在 core/progress.js，只存在這台裝置。 */
App.boot(function (data) {
  const { esc, el } = App;
  const root = document.getElementById("root");
  function draw() {
    const s = Progress.get();
    const seen = data.items.filter((a) => s.seen[a.id]);
    const byFam = {};
    seen.forEach((a) => { byFam[a.family] = (byFam[a.family] || 0) + 1; });
    const basins = new Set(seen.flatMap((a) => a.basins));
    const box = el('<div><div class="w-stats">' +
      '<div class="w-stat"><b class="w-num">' + seen.length + "</b><span>種兩棲類看過了</span></div>" +
      '<div class="w-stat"><b class="w-num">' + Object.keys(byFam).length + "</b><span>個科</span></div>" +
      '<div class="w-stat"><b class="w-num">' + basins.size + "</b><span>個流域</span></div>" +
      '<div class="w-stat"><b class="w-num">' + Progress.badges(data.items).filter((b) => b.got).length + "</b><span>個徽章</span></div></div>" +
      (seen.length ? '<div class="chips">' + Object.entries(byFam).sort((x, y) => y[1] - x[1])
        .map(([f, n]) => '<a class="chip" style="text-decoration:none;color:inherit" href="/frogs?family=' + encodeURIComponent(f) + '">' + App.SITE.familyOf(f).emoji + " " + esc(f) + " " + n + "</a>").join("") + "</div>"
        : '<p class="lead">還沒有看過兩棲類，<a href="/frogs">到兩棲小百科</a>點一種看看吧！</p>') +
      '<h2>徽章</h2><div class="badges">' + Progress.badges(data.items).map((b) =>
        '<div class="bdg' + (b.got ? " got" : "") + '"><div class="ico">' + b.icon + "</div><b>" + esc(b.name) + "</b><small>" + esc(b.how) + "</small></div>").join("") + "</div>" +
      '<h2>遊戲紀錄</h2><table class="gtable"><tbody>' + Progress.GAMES.map(([k, name]) =>
        "<tr><th>" + esc(name) + "</th><td>" + App.stars(s.stars[k] || 0) + "</td></tr>").join("") + "</tbody></table>" +
      '<p style="margin-top:24px"><button class="btn danger" id="clear">清除這台裝置的紀錄</button></p></div>');
    root.replaceChildren(box);
    root.querySelector("#clear").onclick = async () => {
      const ok = await App.dialog("確定要清除這台裝置上的護照紀錄嗎？清除後不能復原。", [{ label: "取消", value: false }, { label: "清除", value: true, danger: true }]);
      if (ok) { Progress.clear(); draw(); }
    };
  }
  draw();
});
