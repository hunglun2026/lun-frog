/* 由 super-opendata-edu 的 site_template 產生（oe build 會覆蓋），不要在網站資料夾改。
   探險護照的紀錄：看過哪些、各遊戲最好幾顆星、徽章。只存在這台裝置的 localStorage，不上傳、不蒐集個資。
   Progress.seen(id)、Progress.stars(key, n)、Progress.badges(items)、Progress.get()、Progress.clear()
   遊戲清單（SITE.games）與徽章規則（SITE.badges）由各站定義；徽章從紀錄算出來，不另外存，規則改了舊紀錄也會跟著對。 */
window.Progress = (function () {
  "use strict";
  const KEY = "progress-v1";
  function get() {
    const s = App.store.get(KEY, null);
    return s && s.seen ? s : { seen: {}, stars: {} };
  }
  function update(fn) {
    const s = get();
    fn(s);
    App.store.set(KEY, s);
  }
  const seen = (id) => update((s) => { s.seen[id] = s.seen[id] || Date.now(); });
  const stars = (key, n) => update((s) => { s.stars[key] = Math.max(s.stars[key] || 0, n); });
  const clear = () => App.store.set(KEY, null);

  function badges(items) {
    const s = get();
    const seenItems = items.filter((a) => s.seen[a.id]);
    const st = (k) => s.stars[k] || 0;
    return (App.SITE.badges ? App.SITE.badges(seenItems, st, items) : [])
      .map(([icon, name, how, got]) => ({ icon, name, how, got: !!got }));
  }
  return { get, seen, stars, clear, badges, GAMES: App.SITE.games || [] };
})();
