// Recorded replay: lets the unchanged app run as a static page (GitHub Pages) with no server and no API key.
// It answers the app's /api/* requests from one recorded live run of the demo intake (Claude Opus 5.5, Oct 8 2026).
(function () {
  const realFetch = window.fetch.bind(window);
  let data = null;
  const ready = realFetch("replay.json").then((r) => r.json()).then((d) => { data = d; return d; });
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  window.fetch = async function (url, opts = {}) {
    const path = String(url);
    if (path.endsWith("/api/health")) { await ready; return json({ model: data.model, ready: true, voice: false, replay: true }); }
    if (path.endsWith("/api/tts") || path.endsWith("/api/stt")) return json({ error: "Recorded replay: voice runs in the live app." }, 503);
    if (path.endsWith("/api/read")) {
      await ready;
      const body = JSON.parse(opts.body || "{}"), n = (body.turns || []).length;
      const res = data.responses[n - 1];
      if (!res) return json({ error: "The recorded intake has ended. Reload to replay it, or run the live app to try new answers." }, 400);
      await wait(1200); // a short pause so the replay reads like the live app (live answers took about 3-5 s)
      return json(res);
    }
    return realFetch(url, opts);
  };

  // Replay mode: the answer box always holds the next recorded line, so the forms match what was said.
  function nextLine() {
    const box = document.getElementById("box"), n = document.querySelectorAll("#turns .turn").length;
    if (!data || !box) return;
    box.value = data.turns[n] || ""; box.readOnly = true;
    box.placeholder = "The recorded intake is complete. Reload to watch it again.";
  }
  window.addEventListener("DOMContentLoaded", () => {
    const note = document.createElement("div");
    note.className = "replay-note";
    note.textContent = "Recorded replay of the live app: these are Claude Opus 5.5's real responses to the demo intake, recorded on Oct 8 2026. No AI runs on this page, and you can't type new answers here.";
    document.body.prepend(note);
    const mic = document.getElementById("mic"); if (mic) mic.hidden = true;
    ready.then(nextLine);
    new MutationObserver(nextLine).observe(document.getElementById("turns"), { childList: true });
  });
})();
