/* 보호 파일 내려받기: protected/<id>.enc 를 비밀번호로 브라우저 안에서 풀어 원본을 내려받는다(서버 없음).
   형식 = "SDL1" + 반복 횟수(4 B) + salt(16 B) + iv(12 B) + AES-256-GCM 암호문 · 태그.
   키 = PBKDF2-SHA256(비밀번호 NFC). 만드는 쪽 = 리포 docs/presentations/2026_KSCE/site_tools/encrypt_protected.py */
(function () {
  var MSG = {
    en: { busy: "Decrypting… (a few seconds)", bad: "Wrong password.", ok: "Downloaded: ", err: "Could not load the file.", ctx: "This browser cannot decrypt here (secure connection required)." },
    ko: { busy: "푸는 중… (몇 초 걸립니다)", bad: "비밀번호가 맞지 않습니다.", ok: "내려받았습니다: ", err: "파일을 불러오지 못했습니다.", ctx: "이 브라우저에서는 풀 수 없습니다(보안 연결 필요)." }
  };
  function lang() { return document.documentElement.getAttribute("data-ui") === "ko" ? "ko" : "en"; }

  async function decrypt(url, pw) {
    if (!window.crypto || !crypto.subtle) { var c = new Error("ctx"); c.ctx = true; throw c; }
    var r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("fetch");
    var b = new Uint8Array(await r.arrayBuffer());
    if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== "SDL1") throw new Error("format");
    var it = new DataView(b.buffer, b.byteOffset).getUint32(4);
    var salt = b.slice(8, 24), iv = b.slice(24, 36), ct = b.slice(36);
    var base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
    var key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: it, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    try { return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct)); }
    catch (e) { var x = new Error("bad"); x.bad = true; throw x; }
  }
  window.sdlDecrypt = decrypt;

  document.querySelectorAll("form.protect").forEach(function (f) {
    f.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      var st = f.querySelector(".st"), btn = f.querySelector("button"), inp = f.querySelector("input"), m = MSG[lang()];
      if (!inp.value) { inp.focus(); return; }
      btn.disabled = true; st.className = "st"; st.textContent = m.busy;
      try {
        var pt = await decrypt(f.dataset.src, inp.value);
        var a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([pt], { type: "application/octet-stream" }));
        a.download = f.dataset.name; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
        st.className = "st ok"; st.textContent = m.ok + f.dataset.name; inp.value = "";
      } catch (e) {
        st.className = "st bad"; st.textContent = e.bad ? m.bad : (e.ctx ? m.ctx : m.err);
      } finally { btn.disabled = false; }
    });
  });
})();
