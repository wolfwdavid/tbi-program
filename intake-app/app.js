// One conversation, five forms: front end (plain HTML + JS).
// Talks to the local server's POST /api/read, which calls Claude and checks every citation.

const DEMO = [
  "I'm Marcus Hale, born March 15, 1959. I live alone in a ground-floor apartment I lease at 100 Example Avenue, apartment 4B, in Brooklyn, Kings County. My cell is 718-555-0142.",
  "I take metformin 500 milligrams for my diabetes, lisinopril 10 for blood pressure, atorvastatin 20 for cholesterol, and sertraline 50 for depression, all by mouth. I fill my own weekly pill organizer and my phone alarm reminds me. Priya, my ILST worker, checks the organizer and helps me get refills.",
  "My primary care doctor is Dr. Lena Ortiz at Sample Primary Care, 718-555-0150. The neurology clinic has the paperwork about my head injury, but I don't remember the doctor's name.",
  "I'm on a diabetic diet, low salt and low fat, and I make my own meals. I wear glasses; my hearing is fine. English is my only language, but people sometimes have to repeat things because of my memory.",
  "No family helps me, just a neighbour who checks in now and then. My service coordinator, Dana Whitfield, at 718-555-0100, is who you call first. If something's wrong with my medications, call my primary care doctor. If I stop eating right, Dana calls the doctor.",
  "I have a power wheelchair, a shower chair and a CPAP machine from Sample DME, 718-555-0180, and a PERS button from Sample Alert Systems. If Priya can't come, I keep the PERS on me and Dana calls me every week. No pets. I have smoke and carbon monoxide detectors and I can get to all the exits.",
  "I get SSDI, about 1,200 dollars a month, and SNAP, 250 a month. I have Medicare A, B and D with the Sample Rx Plan. I'm not a veteran, and I don't have a DNR. If I ever need a hospital, I want Sample Community Hospital in Brooklyn."
];
const state = { turns: [], filled: new Set(), result: null, view: "talk", seen: new Set(), startedAt: 0, snoozeUntil: 0 };
const $ = (id) => document.getElementById(id);
function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = String(text); return n; }

DEMO.forEach((d, i) => { const b = el("button", "ghost", `${i + 1}. ${d}`); b.onclick = () => { $("box").value = d; $("box").focus(); }; $("demo").append(b); });

// ------------------------------------------------------------------ conversation

function renderTurns(result) {
  $("turns").replaceChildren();
  state.turns.forEach((t, i) => {
    const id = `t${i + 1}`, card = el("div", "turn");
    card.append(el("b", "", `You · ${i + 1}`));
    const spans = (result?.facts || []).filter((f) => f.turn_id === id && f.start >= 0).map((f) => [f.start, f.end]).sort((a, b) => a[0] - b[0]);
    let at = 0; const body = el("div");
    for (const [s, e] of spans) { if (s < at) continue; body.append(document.createTextNode(t.text.slice(at, s))); body.append(el("mark", "", t.text.slice(s, e))); at = e; }
    body.append(document.createTextNode(t.text.slice(at)));
    card.append(body); $("turns").append(card);
  });
  $("turns").scrollTop = $("turns").scrollHeight;
}

// ------------------------------------------------------------------ one record + progress

function renderRecord(result) {
  const people = $("people"); people.replaceChildren();
  for (const p of result.people) {
    const c = el("div", "person");
    c.append(el("div", "nm", p.name), el("div", "rel", [p.relationship, ...p.phones].filter(Boolean).join(" · ") || "relationship not said yet"));
    const chips = el("div", "chips"); p.roles.forEach((r) => chips.append(el("span", "chip", r))); c.append(chips);
    people.append(c);
  }
  const about = $("about"); about.replaceChildren();
  for (const f of result.about_you) {
    const li = el("li"); li.append(el("span", "k", `${f.field.replace(/_/g, " ")}: `), document.createTextNode(f.value + " "), el("span", "src", `“${f.quote}”`)); about.append(li);
  }
}

function renderProgress(result) {
  const before = state.filled, now = new Set(); let fresh = 0; const freshForms = new Set();
  const forms = $("forms"); forms.replaceChildren();
  for (const form of result.forms) {
    const c = el("div", "form");
    c.append(el("div", "code", form.code), el("div", "t", form.title));
    const bar = el("div", "bar"), fill = el("i"); bar.append(fill); fill.style.width = `${Math.round(100 * form.filled / form.total)}%`;
    c.append(bar, el("div", "cnt", `${form.filled} of ${form.total} sections filled`));
    for (const s of form.sections) {
      const key = `${form.code}|${s.section}|${s.label}`, row = el("div", `sec${s.filled ? " filled" : ""}`);
      if (s.filled) { now.add(key); if (!before.has(key)) { row.classList.add("fresh"); fresh++; freshForms.add(form.code); } }
      const lab = el("div", "lab"); lab.append(el("span", "mk", s.filled ? "✓" : "○"), el("span", "", `§${s.section} ${s.label}`)); row.append(lab);
      if (s.filled) {
        const vals = el("div", "vals");
        s.entries.forEach((e) => { const v = el("span"); v.append(document.createTextNode((e.person ? `${e.person}: ` : "") + e.value + " "), el("span", "src", `“${e.quote}”`)); vals.append(v); });
        row.append(vals);
      } else row.append(el("div", "q", s.question));
      c.append(row);
    }
    forms.append(c);
  }
  state.filled = now;
  return { fresh, forms: freshForms.size };
}

// ------------------------------------------------------------------ form view: the official forms, filled

function sheet(code, title) {
  const s = el("article", "sheet");
  const head = el("header", "sh");
  head.append(el("div", "sh-a", "NEW YORK STATE DEPARTMENT OF HEALTH · Division of Home and Community Based Services"),
    el("div", "sh-t", title.toUpperCase()), el("div", "sh-c", `NHTD Revised Service Plan packet · ${code}`));
  s.append(head); return s;
}

// The official forms, filled: every section in the form's own order, each value with the words it came from.
function renderForms(result) {
  const out = $("paper"); out.replaceChildren();
  for (const form of result.forms) {
    const s = sheet(form.code, form.title);
    for (const sec of form.sections) {
      s.append(el("div", "fh", `${sec.section === "header" || sec.section === "list" ? "" : sec.section + ". "}${sec.label}`));
      if (!sec.entries.length) { const r = el("div", "fl"); r.append(el("span", "fl-v blank", "")); s.append(r); continue; }
      for (const e of sec.entries) {
        const r = el("div", "fl");
        const label = e.person ? `${e.person}` : e.field.replace(/^role_|^participant_/, "").replace(/_/g, " ");
        r.append(el("span", "fl-l", label + ":"));
        const v = el("span", "fl-v", e.value); v.title = `From: “${e.quote}”`; r.append(v);
        const k = `${form.code}|${sec.section}|${e.value}`; if (!state.seen.has(k)) { r.classList.add("new-line"); state.seen.add(k); }
        s.append(r);
      }
    }
    out.append(s);
  }
  out.append(el("p", "fl-foot", "Blank lines are still to be asked. Hover a filled line to see the words it came from. Signatures stay on each official form; a coordinator reviews everything before filing."));
}

// ------------------------------------------------------------------ map: the gathered information as nodes

const GROUPS = [
  ["Medications", /^(medication|needs_help_)/], ["Equipment", /^device$/], ["Diet", /^(diet|eating_ability)$/],
  ["Senses & language", /^(vision|hearing|primary_language|other_languages|communication_ability)$/],
  ["Home & safety", /^(living_situation|fire_safety|backup_plan|pets|hospital_preference|advance_directive)$/],
  ["Money & insurance", /^(insurance|income_or_benefit)$/],
];
const FORM_COLORS = { RSP: "#176b61", PPO: "#92591c", Contacts: "#5b5fa8", Insurance: "#8a4f7d" };
const SVGNS = "http://www.w3.org/2000/svg";
function sv(tag, attrs, text) { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; return n; }

function renderMap(result) {
  const box = $("map"); box.replaceChildren();
  const W = 980, H = 620, cx = W / 2, cy = H / 2 + 6;
  const facts = result.facts, name = (facts.find((f) => f.field === "participant_name") || {}).value || "Participant";
  // Inner ring: each person, then each group of facts about the participant.
  const inner = result.people.map((p) => ({ label: p.name, sub: p.relationship || p.roles[0] || "", facts: p.facts, kind: "person" }));
  for (const [label, re] of GROUPS) { const fs = facts.filter((f) => !f.person && re.test(f.field)); if (fs.length) inner.push({ label, sub: `${fs.length} fact${fs.length > 1 ? "s" : ""}`, facts: fs, kind: "group" }); }
  const idFacts = facts.filter((f) => /^(participant_|county)/.test(f.field));
  const forms = result.forms.map((f, i) => ({ code: f.code, title: f.title, x: i % 2 ? W - 92 : 92, y: i < 2 ? 70 : H - 70, filled: f.filled, total: f.total }));
  const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, class: "mapsvg", role: "img", "aria-label": "Map of gathered information and the forms it fills" });
  const gEdges = sv("g"), gNodes = sv("g"); svg.append(gEdges, gNodes);
  const R = Math.min(215, 120 + inner.length * 9);
  inner.forEach((n, i) => { const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(inner.length, 1); n.x = cx + R * 1.25 * Math.cos(a); n.y = cy + R * 0.92 * Math.sin(a); });
  const edges = [];
  const formsOf = (fs) => { const m = {}; fs.forEach((f) => (f.lands_in || []).forEach((s) => { const c = s.split(" ")[0]; m[c] = (m[c] || 0) + 1; })); return m; };
  const center = { label: name, sub: "participant", facts: idFacts, x: cx, y: cy, kind: "center" };
  for (const n of [center, ...inner]) {
    if (n !== center) edges.push({ a: center, b: n, kind: "spoke" });
    const m = formsOf(n.facts);
    for (const f of forms) if (m[f.code]) edges.push({ a: n, b: f, n: m[f.code], kind: "feeds", color: FORM_COLORS[f.code] });
  }
  for (const e of edges) {
    const line = e.kind === "spoke"
      ? sv("line", { x1: e.a.x, y1: e.a.y, x2: e.b.x, y2: e.b.y, stroke: "#cfc8b8", "stroke-width": 1.2, "stroke-dasharray": "3 4" })
      : sv("path", { d: `M${e.a.x},${e.a.y} Q${(e.a.x + e.b.x) / 2 + (cy - e.a.y) * 0.12},${(e.a.y + e.b.y) / 2} ${e.b.x},${e.b.y}`, fill: "none", stroke: e.color, "stroke-opacity": 0.32, "stroke-width": 1 + Math.min(e.n, 6) });
    e.el = line; gEdges.append(line);
  }
  const tip = $("maptip");
  function node(n, r, fill, stroke, textFill) {
    const g = sv("g", { class: "mnode", tabindex: 0 });
    g.append(sv("circle", { cx: n.x, cy: n.y, r, fill, stroke, "stroke-width": 2 }));
    g.append(sv("text", { x: n.x, y: n.y - 2, "text-anchor": "middle", class: "mn-t", fill: textFill }, n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label));
    if (n.sub) g.append(sv("text", { x: n.x, y: n.y + 13, "text-anchor": "middle", class: "mn-s", fill: textFill }, n.sub.length > 22 ? n.sub.slice(0, 21) + "…" : n.sub));
    const mine = edges.filter((e) => e.a === n || e.b === n);
    g.addEventListener("mouseenter", () => {
      edges.forEach((e) => e.el.setAttribute("opacity", mine.includes(e) ? 1 : 0.12));
      const lines = (n.facts || []).slice(0, 8).map((f) => `• ${f.value}  —  “${f.quote}”`);
      tip.textContent = n.title ? `${n.code} ${n.title}: ${n.filled} of ${n.total} sections filled` : `${n.label}${lines.length ? "\n" + lines.join("\n") : ""}`;
      tip.hidden = false;
    });
    g.addEventListener("mouseleave", () => { edges.forEach((e) => e.el.removeAttribute("opacity")); tip.hidden = true; });
    gNodes.append(g);
  }
  inner.forEach((n) => node(n, 44, n.kind === "person" ? "#fbf0dd" : "#f2eff8", n.kind === "person" ? "#d9b27c" : "#ada0cc", "#263a36"));
  node(center, 54, "#176b61", "#10564e", "#ffffff");
  forms.forEach((f) => { f.label = f.code; f.sub = `${f.filled}/${f.total} sections`; node(f, 48, "#ffffff", FORM_COLORS[f.code], FORM_COLORS[f.code]); });
  box.append(svg);
  box.append(el("p", "fl-foot", "Centre: the participant. Inner ring: each person once, and each group of facts. Outer: the four forms. Thicker lines = more form sections fed. Hover any node for its facts and the words they came from."));
}

// ------------------------------------------------------------------ doctor requests: what each clinician must provide

const signed = {};    // clinician -> client has signed the HIPAA release (staff ticks it)
const questions = {}; // clinician -> extra questions staff typed for that doctor
const emails = {};    // clinician -> email typed by staff when the conversation did not give one
function renderRequests(result) {
  const box = $("requests"); box.replaceChildren();
  const who = (result.facts.find((f) => f.field === "participant_name") || {}).value || "the participant";
  const reqs = result.clinician_requests || [];
  box.append(el("p", "muted", "Doctors are picked up from the conversation. Each card collects what that doctor must provide, from what was said and from the packet's own rules, plus any question you add."));
  if (!reqs.length) { box.append(el("p", "muted", "No doctors yet. Mention a doctor, a clinic or a medication in the conversation.")); return; }
  for (const r of reqs) {
    const key = r.clinician, c = el("article", "req");
    const head = el("div", "req-h");
    head.append(el("div", "nm", `✉ ${key}`), el("div", "rel", r.known ? [r.agency, r.phone].filter(Boolean).join(" · ") || "contact details not said yet" : "Doctor not named yet: ask the participant who this is"));
    c.append(head);
    const mail = el("input", "req-email"); mail.type = "email"; mail.placeholder = "doctor's email (from the conversation, or type it)"; mail.value = emails[key] || r.email || "";
    mail.oninput = () => { emails[key] = mail.value; update(); };
    c.append(mail);
    const ul = el("ul", "req-items"); c.append(ul);
    const ask = el("div", "row"), qbox = el("input", "req-q"), qadd = el("button", "ghost", "Add question");
    qbox.placeholder = `Add a question for ${key}…`; ask.append(qbox, qadd); c.append(ask);
    const hip = el("label", "req-hipaa"), cb = el("input"); cb.type = "checkbox"; cb.checked = !!signed[key];
    hip.append(cb, document.createTextNode(` ${who} has signed the HIPAA release for ${key}`)); c.append(hip);
    const pre = el("pre", "req-draft"); c.append(pre);
    const row = el("div", "row"), copy = el("button", "ghost", "Copy email"), send = el("a", "btn", "Open email draft"), note = el("span", "muted", "");
    row.append(copy, send, note); c.append(row);
    function draft() {
      const items = [...r.items.map((i) => i.need + (i.section !== "packet" ? ` (for ${i.section})` : "")), ...(questions[key] || [])];
      return { subject: `Information request for ${who}: NHTD waiver Revised Service Plan`, body: [
        `Dear ${key},`, "",
        `We are the service coordination team for ${who}. With the attached HIPAA authorization signed by ${who}, could you please provide:`,
        ...(items.length ? items.map((t, n) => `  ${n + 1}. ${t}`) : ["  (add a question above)"]),
        "", "Thank you. Please reply to this email or call our office.", ].join("\n") };
    }
    function update() {
      ul.replaceChildren();
      r.items.forEach((i) => { const li = el("li"); li.append(document.createTextNode(i.need + " "), el("span", "chip", i.section === "packet" ? "for the packet" : i.section), el("span", "src", ` ${i.source}: “${i.quote}”`)); ul.append(li); });
      (questions[key] || []).forEach((q) => { const li = el("li"); li.append(document.createTextNode(q + " "), el("span", "chip", "your question")); ul.append(li); });
      const d = draft(); pre.textContent = `To: ${mail.value || "(email needed)"}\nSubject: ${d.subject}\n\n${d.body}`;
      const ready = cb.checked && mail.value.includes("@");
      send.classList.toggle("off", !ready);
      send.href = ready ? `mailto:${encodeURIComponent(mail.value)}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}` : "#";
      note.textContent = !cb.checked ? "Unlocks once the client has signed the release." : !mail.value.includes("@") ? "Add the doctor's email." : "Opens in your email app; nothing is sent until you press send there.";
    }
    qadd.onclick = () => { const t = qbox.value.trim(); if (!t) return; (questions[key] = questions[key] || []).push(t); qbox.value = ""; update(); };
    qbox.onkeydown = (e) => { if (e.key === "Enter") qadd.onclick(); };
    cb.onchange = () => { signed[key] = cb.checked; update(); };
    send.onclick = (e) => { if (send.classList.contains("off")) e.preventDefault(); };
    copy.onclick = () => navigator.clipboard.writeText(pre.textContent).then(() => { copy.textContent = "Copied"; setTimeout(() => (copy.textContent = "Copy email"), 1400); });
    update(); box.append(c);
  }
  box.append(el("p", "fl-foot", "Drafts only. Use the agency's own HIPAA authorization form; a coordinator reviews every request before it is sent."));
}

// ------------------------------------------------------------------ steps: one thing on screen at a time

const STEP_OF = { talk: "stepTalk", forms: "stepForms", map: "stepForms", progress: "stepForms", requests: "stepDoctors", save: "stepSave" };
function setView(view) {
  state.view = view;
  for (const id of ["stepTalk", "stepForms", "stepDoctors", "stepSave"]) $(id).hidden = STEP_OF[view] !== id;
  for (const [id, v] of [["tabTalk", "stepTalk"], ["tabForms", "stepForms"], ["tabReq", "stepDoctors"], ["tabSave", "stepSave"]]) $(id).classList.toggle("on", STEP_OF[view] === v);
  for (const [id, v] of [["tabPaper", "forms"], ["tabMap", "map"], ["tabProgress", "progress"]]) $(id).classList.toggle("on", view === v);
  $("paper").hidden = view !== "forms"; $("mapwrap").hidden = view !== "map"; $("progressWrap").hidden = view !== "progress";
  window.scrollTo({ top: 0 });
}
$("tabTalk").onclick = () => setView("talk");
$("tabForms").onclick = () => setView("forms");
$("tabReq").onclick = () => setView("requests");
$("tabSave").onclick = () => setView("save");
$("tabPaper").onclick = () => setView("forms");
$("tabMap").onclick = () => setView("map");
$("tabProgress").onclick = () => setView("progress");

// What the last message added, in plain words, with the forms each fact went to.
const SHORT = { RSP: "Service Plan", PPO: "Protective Oversight", Contacts: "Contact List", Insurance: "Insurance" };
function renderJustAdded(result) {
  const last = `t${state.turns.length}`, box = $("justAdded"); box.replaceChildren();
  const facts = result.facts.filter((f) => f.turn_id === last);
  $("justCard").hidden = !facts.length;
  for (const f of facts.slice(0, 12)) {
    const d = el("div", "ja"), forms = [...new Set((f.lands_in || []).map((s) => s.split(" ")[0]))];
    d.append(el("b", "", (f.person ? `${f.person}: ` : "") + f.value));
    const lands = el("span", "lands"); forms.forEach((c) => lands.append(el("span", "chip", SHORT[c] || c))); d.append(lands);
    d.append(el("div", "src", `“${f.quote}”`));
    box.append(d);
  }
  const chips = $("chips"); chips.replaceChildren();
  for (const form of result.forms) {
    const b = el("button", "fchip"), bar = el("i"), fill = el("s");
    fill.style.width = `${Math.round(100 * form.filled / form.total)}%`; bar.append(fill);
    b.append(el("b", "", form.title), document.createTextNode(`${form.filled} of ${form.total} sections`), bar);
    b.onclick = () => setView("forms"); chips.append(b);
  }
}

// ------------------------------------------------------------------ round trip

function render(result) {
  state.result = result;
  renderTurns(result); renderRecord(result);
  const fresh = renderProgress(result); renderForms(result); renderMap(result); renderRequests(result); renderJustAdded(result);
  if (fresh.fresh) { const b = $("banner"); b.textContent = `That answer filled ${fresh.fresh} section${fresh.fresh > 1 ? "s" : ""} across ${fresh.forms} form${fresh.forms > 1 ? "s" : ""}. Tap to see the forms.`; b.classList.remove("on"); void b.offsetWidth; b.classList.add("on"); }
  $("nextText").textContent = result.next_question ? result.next_question.text : "Every section we track has an answer. Check the forms next.";
  $("recordNote").textContent = `Each person is entered once, with every role they play. ${result.facts.length} facts read · ${result.seconds}s${result.dropped ? ` · ${result.dropped} withheld (no matching words)` : ""}`;
}

async function send() {
  const text = $("box").value.trim(); if (!text) return;
  if (!state.startedAt) state.startedAt = Date.now();
  const readFrom = state.result ? state.turns.length : 0;
  state.turns.push({ text }); $("box").value = ""; renderTurns(state.result);
  $("send").disabled = true; $("status").className = ""; $("status").textContent = "Claude is reading…";
  try {
    // Only the new answer is read; earlier facts are sent back and re-checked against their words.
    const known = readFrom ? state.result.facts.map(({ field, person, value, quote, turn_id }) => ({ field, person, value, quote, turn_id })) : [];
    const r = await fetch("/api/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ turns: state.turns, known_facts: known, read_from: readFrom }) });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || r.statusText);
    render(data); $("status").textContent = "";
  } catch (e) { state.turns.pop(); $("box").value = text; renderTurns(state.result); $("status").className = "err"; $("status").textContent = `Couldn't read that: ${e.message}`; }
  finally { $("send").disabled = false; }
}
$("send").onclick = send;

// ------------------------------------------------------------------ save and resume (demo: this browser only, synthetic data)

const DRAFT = "nhtd-intake-draft";
function savedDraft() { try { return JSON.parse(localStorage.getItem(DRAFT) || "null"); } catch { return null; } }
function saveDraft() {
  try { localStorage.setItem(DRAFT, JSON.stringify({ turns: state.turns, savedAt: new Date().toISOString() })); $("saveNote").textContent = `Saved ${state.turns.length} answers at ${new Date().toLocaleTimeString()}. Resume from this laptop any time.`; }
  catch { $("saveNote").textContent = "This browser would not save. Copy the forms instead."; }
}
async function resumeDraft() {
  const d = savedDraft(); if (!d || !d.turns?.length) { $("saveNote").textContent = "No saved intake on this laptop."; return; }
  state.turns = d.turns.slice(); state.result = null; state.filled = new Set(); state.seen = new Set();
  $("resumeBar").hidden = true; setView("talk"); renderTurns(null);
  $("status").className = ""; $("status").textContent = `Reading the ${state.turns.length} saved answers…`;
  try {
    const r = await fetch("/api/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ turns: state.turns }) });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || r.statusText);
    render(data); $("status").textContent = "Picked up where you left off.";
  } catch (e) { $("status").className = "err"; $("status").textContent = `Couldn't resume: ${e.message}`; }
}
$("saveNow").onclick = saveDraft;
$("resumeNow").onclick = resumeDraft;
$("resumeTop").onclick = resumeDraft;
$("newIntake").onclick = () => { if (confirm("Start a new intake? The current answers stay saved only if you pressed Save.")) location.reload(); };
if (savedDraft()) $("resumeBar").hidden = false;

// ------------------------------------------------------------------ break check-in (every 30 minutes of talking)

const CHECKIN_MS = 30 * 60 * 1000;
function showCheckin() {
  const who = (state.result?.facts.find((f) => f.field === "participant_name") || {}).value || "the participant";
  const mins = state.startedAt ? Math.max(1, Math.round((Date.now() - state.startedAt) / 60000)) : 30;
  $("checkinText").textContent = `You've been talking with ${who.split(" ")[0]} for ${mins} minute${mins > 1 ? "s" : ""}.`;
  $("checkin").hidden = false; setView("talk");
}
setInterval(() => { if (state.startedAt && !state.snoozeUntil && Date.now() - state.startedAt > CHECKIN_MS) showCheckin(); if (state.snoozeUntil && Date.now() > state.snoozeUntil) state.snoozeUntil = 0; }, 30000);
$("keepGoing").onclick = () => { $("checkin").hidden = true; state.snoozeUntil = Date.now() + 15 * 60 * 1000; };
$("takeBreak").onclick = () => { $("checkin").hidden = true; saveDraft(); setView("save"); };
$("checkinNow").onclick = showCheckin;

// ------------------------------------------------------------------ voice (ElevenLabs via the local server; browser voice as fallback)

const voice = { server: false, on: true, playing: false, stop: false };
async function speak(text, role) {
  if (!voice.on || !text) return;
  if (voice.server) {
    try {
      const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, role }) });
      if (r.ok) { const url = URL.createObjectURL(await r.blob()); const a = new Audio(url); await new Promise((res) => { a.onended = res; a.onerror = res; a.play().catch(res); }); URL.revokeObjectURL(url); return; }
    } catch (e) { /* fall through to the browser voice */ }
  }
  if (!("speechSynthesis" in window)) return;
  await new Promise((res) => { const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; u.pitch = role === "staff" ? 1.15 : 0.9; u.onend = res; u.onerror = res; speechSynthesis.speak(u); });
}
async function typeInto(text) { const box = $("box"); box.value = ""; for (let i = 0; i < text.length; i += 3) { box.value = text.slice(0, i + 3); await new Promise((r) => setTimeout(r, 12)); } box.value = text; }

// Plays the whole demo intake hands-free: staff question (spoken), participant line (typed + spoken), Claude reads.
async function playDemo() {
  if (voice.playing) { voice.stop = true; $("play").textContent = "Stopping…"; return; }
  voice.playing = true; voice.stop = false; $("play").textContent = "■ Stop demo";
  try {
    for (let i = state.turns.length; i < DEMO.length && !voice.stop; i++) {
      const q = state.result?.next_question?.text || "Let's start with your full name, date of birth, address and phone.";
      $("nextText").textContent = q;
      await speak(q, "staff");
      if (voice.stop) break;
      await typeInto(DEMO[i]);
      await Promise.all([speak(DEMO[i], "client"), send()]);
    }
  } finally { voice.playing = false; $("play").textContent = "▶ Play demo intake"; }
}
$("play").onclick = playDemo;
$("voiceToggle").onclick = () => { voice.on = !voice.on; $("voiceToggle").textContent = voice.on ? "Voice: on" : "Voice: off"; if (!voice.on && "speechSynthesis" in window) speechSynthesis.cancel(); };

// Microphone -> ElevenLabs speech-to-text -> editable text (never sent automatically).
let rec = null, chunks = [];
$("mic").onclick = async () => {
  if (rec && rec.state === "recording") { rec.stop(); return; }
  if (!voice.server) { $("status").className = "err"; $("status").textContent = "Recording needs the ElevenLabs key on the server."; return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    rec = new MediaRecorder(stream); chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop()); $("mic").textContent = "🎙 Record"; $("status").className = ""; $("status").textContent = "Transcribing…";
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      const r = await fetch("/api/stt", { method: "POST", headers: { "Content-Type": blob.type }, body: blob });
      const data = await r.json();
      if (r.ok) { $("box").value = ($("box").value + " " + data.text).trim(); $("status").textContent = "Check the words, then add them to the forms."; }
      else { $("status").className = "err"; $("status").textContent = data.error || "Transcription failed."; }
    };
    rec.start(); $("mic").textContent = "■ Stop recording"; $("status").className = ""; $("status").textContent = "Recording…";
  } catch (e) { $("status").className = "err"; $("status").textContent = `Microphone: ${e.message}`; }
};
$("box").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); });

fetch("/api/health").then((r) => r.json()).then((hh) => { voice.server = !!hh.voice; $("voiceSrc").textContent = hh.voice ? "ElevenLabs voice" : "browser voice (ElevenLabs key not set)"; if (!hh.ready) { $("status").className = "err"; $("status").textContent = "No API key set on the server."; } }).catch(() => {});

setView("talk");
$("banner").onclick = () => { setView("forms"); $("paper").scrollIntoView({ behavior: "smooth", block: "start" }); };
$("printForms").onclick = () => { setView("forms"); window.print(); };
