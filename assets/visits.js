/* 첫 화면 방문수: 무료 카운터 API(abacus.jasoncameron.dev, 가입 없음)에 방문을 올리고 날짜 옆에 "총 방문.내 방문"을 숫자로만 보인다(괄호 없이 마침표로 구분).
   카운터 두 개 — sdl-home = 다른 사람, sdl-home-me = 주인 브라우저(?owner=on 으로 한 번 표시, ?owner=off 로 해제). 총 방문 = 둘의 합.
   세지 않고 읽기만 하는 경우 — 자동화 브라우저 · 검색 로봇, 공개 주소가 아닌 곳(로컬 시험). 같은 브라우저는 하루 한 번만 센다.
   카운터 관리 키는 리포 밖(~/.config/sdl_site/abacus_admin_key, abacus_admin_key_me)에 있다. */
(function () {
  var el = document.getElementById("visits");
  if (!el) return;
  var URL_BASE = "https://abacus.jasoncameron.dev/", NS = "sentirain7.github.io", OTHERS = "sdl-home", MINE = "sdl-home-me";
  var OWN = "sdl-owner", DAY = "sdl-visit-day";
  function store(fn) { try { return fn(localStorage); } catch (e) { return null; } }

  var q = null;
  try { q = new URLSearchParams(location.search).get("owner"); } catch (e) {}
  if (q === "on") store(function (s) { s.setItem(OWN, "1"); });
  if (q === "off") store(function (s) { s.removeItem(OWN); });
  if (q === "on" || q === "off") {
    try { var u = new URL(location.href); u.searchParams.delete("owner"); history.replaceState(null, "", u); } catch (e) {}
  }

  var d = new Date(), today = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  var owner = store(function (s) { return s.getItem(OWN) === "1"; });
  var seen = store(function (s) { return s.getItem(DAY) === today; });
  var robot = navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(navigator.userAgent);
  var count = location.hostname === NS && !robot && !seen;
  function call(key, hit) {
    return fetch(URL_BASE + (hit ? "hit/" : "get/") + NS + "/" + key, { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) { return typeof j.value === "number" ? j.value : Promise.reject("value"); });
  }

  Promise.all([call(OTHERS, count && !owner), call(MINE, count && owner)])
    .then(function (v) {
      if (count) store(function (s) { s.setItem(DAY, today); });
      var n = function (x) { return x.toLocaleString("en-US"); };
      el.textContent = n(v[0] + v[1]) + "." + n(v[1]);
      if (q === "on" || q === "off") {
        var ko = document.documentElement.getAttribute("data-ui") === "ko";
        el.textContent += q === "on" ? (ko ? " · 이 브라우저는 내 방문으로 셉니다" : " · this browser counts as yours")
                                     : (ko ? " · 이 브라우저를 다른 사람 방문으로 셉니다" : " · this browser counts as others");
      }
      el.hidden = false;
    })
    .catch(function () {});
})();
