/* 첫 화면 방문수: 무료 카운터 API(abacus.jasoncameron.dev, 가입 없음)에 방문을 올리고 꼬리말에 숫자만 보인다.
   세지 않고 읽기만 하는 경우 — 주인 브라우저(?owner=on 으로 한 번 표시, ?owner=off 로 해제),
   자동화 브라우저 · 검색 로봇, 공개 주소가 아닌 곳(로컬 시험). 같은 브라우저는 하루 한 번만 센다.
   카운터 관리 키는 리포 밖(~/.config/sdl_site/abacus_admin_key)에 있다. */
(function () {
  var el = document.getElementById("visits");
  if (!el) return;
  var URL_BASE = "https://abacus.jasoncameron.dev/", NS = "sentirain7.github.io", KEY = "sdl-home";
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
  var count = location.hostname === NS && !owner && !robot && !seen;

  fetch(URL_BASE + (count ? "hit/" : "get/") + NS + "/" + KEY, { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (j) {
      if (typeof j.value !== "number") return;
      if (count) store(function (s) { s.setItem(DAY, today); });
      el.textContent = j.value.toLocaleString("en-US");
      if (q === "on" || q === "off") {
        var ko = document.documentElement.getAttribute("data-ui") === "ko";
        el.textContent += q === "on" ? (ko ? " · 이 브라우저는 세지 않습니다" : " · this browser is not counted")
                                     : (ko ? " · 이 브라우저를 다시 셉니다" : " · this browser is counted again");
      }
      el.hidden = false;
    })
    .catch(function () {});
})();
