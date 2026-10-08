# One conversation, many forms (intake app)

Built at Claude Build Day, Mental Health & Wellness, NYC, Oct 8 2026, with **Claude Opus 5.5** (`claude-opus-5-5`).

A staff-facing intake helper for New York Medicaid **NHTD waiver** paperwork (the Revised Service Plan packet). Today
the same facts (who the participant is, who helps them, medications, equipment, diet, benefits) are written again and
again across several forms, and one person composes the whole packet in one sitting afterwards.

**How it works**
1. Staff and participant just talk (typed, or voice through ElevenLabs).
2. Claude Opus 5.5 reads each message into **one record**. Every fact cites the exact words it came from.
3. Plain code checks every citation and routes each fact to **every form section that uses it**, across the:
   - Revised Service Plan;
   - Plan for Protective Oversight;
   - Waiver Contact List;
   - Insurance, Resources and Funding sheet.
4. The page shows the **official forms, filled** (printable), a **Map** of everything gathered, a **next question** from
   the biggest gap, and **Doctor requests**. Doctors come from the conversation; what each must provide comes from what
   was said plus the packet's own rules; you can add your own questions. Sending is gated on the client's signed HIPAA
   release and opens a draft in your email app.
5. A coordinator reviews everything. The official forms are still filed as-is, and signatures stay on each form.

**Data:** synthetic only. The demo participant (Marcus T. Hale) is fictional, from a sample supplied by our practitioner
teammate. Nothing is stored on disk; the server listens on 127.0.0.1 only.

## Run it

```bash
pip install anthropic
set EVIDENCE_KEY_FILE=C:\path\to\anthropic_key.txt
set ELEVEN_KEY_FILE=C:\path\to\elevenlabs_key.txt
python -B server.py
```

The first `set` can be `set ANTHROPIC_API_KEY=...` instead. The second is optional: without it, the page uses the
browser's own voice and the Record button is off. Then open http://127.0.0.1:8776, press **▶ Play demo intake**, and see
`/architecture.html` for the architecture, data-flow and user-flow diagrams.

`python -B score_marcus.py` runs the demo intake in one live call and checks each form section against an answer key
taken from the practitioner's filled fictional sample. That key was written from the same sample as the conversation, so
it tests routing, not robustness.

## Files
| File | What it is |
|---|---|
| `server.py` | Claude call (structured output), citation check, record builder, form router, doctor requests, ElevenLabs voice |
| `index.html`, `app.js` | Plain HTML + JS page |
| `architecture.html` | Architecture, data-flow and user-flow diagrams |
| `marcus_demo.json` | The demo conversation and answer key (fictional) |
| `score_marcus.py` | The routing check |

Not clinical advice and not an eligibility decision. Claude proposes; a service coordinator confirms.
