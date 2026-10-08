# TBI Forms Assistant — plan

Guided, browser-only tool at `/forms` that helps NY TBI Waiver providers and service coordinators
fill the official DOH forms. Enter each fact once; every form that needs it is filled.

## Decisions (from user, 2026-10-08)
- Guided step-by-step workflow (not a node canvas)
- Browser-only: no server, nothing sent anywhere (GitHub Pages)
- Output = the state's official PDFs, filled
- Lives at `/forms`; GTM page stays at `/`

## Key findings
- The forms on health.ny.gov/.../tbi/ are the **July 2009** set. The 2025 manual uses renumbered
  **DOH-57xx** forms (rev. 12/20 – 6/21), published at `health.ny.gov/forms/doh-57xx`.
- Many current forms have real fillable fields (AcroForm). Others are flat and need text drawn
  at fixed coordinates. pdf-lib loads and writes all of them (tested: 34/34 of the 2009 set).
- No current DOH number found for: Revised Service Plan, Addendum, ISR, Team Meeting Summary,
  PPO, Contact List. SRI forms have newer NHTD/TBI versions (2021 NHTD manual, section XIV).

## Form sources (what we ship)
| Stage | Form | Source | Fill method |
|---|---|---|---|
| Intake | DOH-5729 Application for Participation (5 pp) | 12/20 | AcroForm (21) |
| Intake | DOH-5725 Initial Applicant Interview & Ack | 12/20 | AcroForm (11) |
| Intake | DOH-5728 Freedom of Choice | 12/20 | AcroForm (18) |
| Intake | DOH-5727 Service Coordination Agency Selection | 12/20 | AcroForm (20) |
| Intake | DOH-5730 Provider Selection | 12/20 | AcroForm (27) |
| Intake | DOH-5732 Participant Rights & Responsibilities | 12/20 | AcroForm (14) |
| Plan | DOH-5726 Initial Service Plan (20 pp) | 6/21 | Overlay + continuation pages |
| Plan | DOH-5752 AT / 5753 E-Mod cost projection | 12/20 | Overlay |
| Plan | DOH-5755 Final Cost | 12/20 | Overlay |
| Plan | C-1.3 Plan for Protective Oversight, C-1.5 Contact List | 2009 | Overlay |
| Changes | DOH-5731 Change of SC Agency, DOH-5750 Change of Provider | 12/20 | AcroForm |
| Ongoing | C-4.1 Revised Service Plan, C-4.2 ISR, C-4.3 Addendum, C-4.6 Team Meeting | 2009 | Overlay / continuation |
| Incidents | SRI 24-Hour Provider Report, Follow-up Report | 2021 NHTD/TBI | Overlay |

Not shipped: RRDS/RRDC-issued notices (DOH-5734–5743), provider enrollment (A-series, via RRDS),
deprecated C-2.5 / C-2.7, E-1/E-2 (LDSS home assessment).

## Architecture
- `static/forms/*.pdf` — official blank PDFs (public state forms), versioned with a source URL + rev date.
- `src/lib/forms/model.ts` — one case record: `participant`, `guardian`, `serviceCoordinator`,
  `scAgency`, `provider`, `rrds`, `services[]`, `supports`, `incident` … (keys from the field inventory).
- `src/lib/forms/defs/<form>.ts` — per form: metadata (stage, who signs, deadline rule) and a field map
  `{ key → AcroForm field name | {page, x, y, size, maxWidth} }`. Long text wraps; overflow goes to a
  labeled continuation page instead of being cut off.
- `src/lib/forms/fill.ts` — pdf-lib: load blank → fill AcroForm fields or draw overlay text → flatten
  (optional) → download. Handles rotated (landscape) pages.
- Wizard UI (`/forms`): steps = Case basics → Intake → Initial Service Plan → Costs → Changes →
  Incidents → Review & download. Each step only asks for fields not already known; a sidebar shows
  every form with % complete. Download one form or the whole application packet (merged PDF).
- Deadlines from the manual shown as helper text (e.g. ISP due 60 days after SC approval; SRI 24-hour
  report within 24 h; packet denied if older than 120 days).

## Privacy (PHI)
- Data lives in memory only. Closing the tab clears it unless the user saves.
- "Save case file": exports a `.tbicase` file encrypted with a passphrase (WebCrypto AES-GCM, PBKDF2).
  "Open case file" decrypts it. No localStorage for PHI. SSN fields are optional and masked.
- No analytics or third-party scripts on `/forms`. Make the Google Fonts load local so the page makes
  no third-party requests.
- Clear banner: tool is a fill-in aid; providers remain responsible for accuracy and submission.

## Phases
- [ ] 1. Foundation: download + store blank PDFs, dump AcroForm field names, build case model and fill engine, unit tests
- [ ] 2. Intake step + forms DOH-5729/5725/5728/5727/5730/5732 (all AcroForm — fastest win), packet download
- [ ] 3. Initial Service Plan DOH-5726 (overlay, continuation pages) + 5752/5753/5755 + C-1.3/C-1.5
- [ ] 4. Changes (5731, 5750) + ongoing (C-4.1/4.2/4.3/4.6)
- [ ] 5. Incidents (SRI 24-hour + follow-up) with deadline timers
- [ ] 6. Encrypted save/open, privacy banner, self-hosted fonts
- [ ] 7. Verification: render each filled PDF to PNG and check alignment visually; type check, build, a11y pass (keyboard, labels, contrast), phone + desktop screenshots; deploy

## Answered (2026-10-08)
- Users: both service coordinators and waiver service providers; workflow starts with a role pick.
- 2009 forms without a current DOH version: include, labeled "2009 version: confirm with your RRDS".
- Build all phases, verify, deploy at the end.

## Review
_(filled in after implementation)_
