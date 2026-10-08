"""Score the reader against the practitioner's fictional filled sample (one live Opus call)."""
import json, time
import server

demo = json.load(open("marcus_demo.json", encoding="utf-8"))
turns = server.check_turns([{"text": t} for t in demo["turns"]])
t0 = time.perf_counter()
facts, dropped = server.validate(turns, server.read_with_claude(turns))
r = server.build(turns, facts)
secs = time.perf_counter() - t0
hit = total = 0
for key, tokens in demo["answer_key"].items():
    code, sec = key.split(" ", 1)
    form = next(f for f in r["forms"] if f["code"] == code)
    vals = " | ".join(e["value"] + " " + (e["person"] or "") for s in form["sections"] if s["section"] == sec for e in s["entries"]).lower()
    found = [t for t in tokens if t in vals]
    hit += len(found); total += len(tokens)
    print(f"{key:14} {len(found)}/{len(tokens)}  {'' if len(found)==len(tokens) else 'MISSING ' + str([t for t in tokens if t not in vals])}")
print(f"\nanswer-key tokens found: {hit}/{total} | facts {len(facts)} | withheld {dropped} | {secs:.1f}s")
for f in r["forms"]:
    print(f["code"], f"{f['filled']}/{f['total']} sections")
json.dump(r, open("last_marcus_result.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
