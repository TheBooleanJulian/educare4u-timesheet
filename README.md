# Educare4u Timesheet

Single-file tool (`index.html`) that turns a month of Google Calendar lessons into the Educare4u timesheet. No install and no build step. Open the file in a browser; it works offline apart from the brand fonts.

## Use

1. **Calendar**: in Google Calendar's schedule view, select the month, copy it, and paste it into the left panel. Results update as you type.
2. **Check**: the alert lists anything that needs a decision. Fix it in the **Sessions** tab (edit times, pick between conflicting entries, untick to exclude, add a missed lesson), or press **Mark checked** once you've confirmed it.
3. **Output**, either:
   - **Copy for Excel**: select the first Monday *Date* cell (B4) in the centre's sheet and paste. This fills dates, lessons and daily totals; the sheet's own weekly and final formulas do the rest.
   - **Download .xlsx**: drop the centre's blank template in panel 2 first. The tool writes into the template directly and keeps its formatting and formulas. It also fills your name, widens the day columns, sets row heights, and saves as e.g. `10) October 2026 Sam.xlsx`.

Rates, billing rules and public holidays live under **Settings**. Settings and edits are saved in this browser (localStorage).

## Private data

The repo ships with demo students and rates. To use your real roster, copy `private-config.example.js` to `private-config.js` next to `index.html` and edit it (your name, rates, rules, and optionally a sample calendar). `private-config.js` is gitignored and loaded automatically if present. Use **Reset settings** after changing it.

## How the calendar is read (deterministic)

- Only events whose title starts with `Educare4u` count. Everything else (e.g. transit) is listed as ignored.
- The student is the longest rate-list name at the start of the title, after removing `Educare4u`, `x Sam`, a leading `x`, and anything after `|`. Unknown names are read up to the level (`Sec 4`, `P5`, `JC1` …) and flagged; they're billed at the default rate.
- Same student, same day, overlapping times → **one lesson**. Identical times merge silently (the Zoom-link copy plus the "Zoom" copy). Different times are flagged, and the earliest is assumed until you pick one.
- Rules are tried in this order: a named student's *exact time window* / *split long session*, then the same with the student left blank (blank = anyone), then *break if long* as the fallback. Defaults: 10am–3pm and 10am–4pm lessons bill 4 hrs (1 h lunch; 10am–4pm also drops 1 h as FOC), Farah 6 h split, Noah ≥ 3 h minus 30 min.
- Flagged: conflicting duplicate times, unknown students, times off the 15-minute grid, lessons over 3 h with no rule, two students at overlapping times, weekday/date mismatches, "cancelled" titles (excluded by default), and unrecognised lines in the paste.
- Public holidays with a lesson are labelled `9 PH` (yellow in the downloaded file). The list is pre-filled with Singapore 2026; add later years in Settings.

## Tests

```sh
node --test tests/core.test.mjs
```

Covers parsing, merging, rules, flags and the TSV output against the August 2026 timesheet ($752.50 once the 28 Aug Noah lesson is edited to 2–5pm). The .xlsx writer depends on browser APIs, so it isn't covered by the Node tests. It was checked by filling an Excel-made replica template in headless Edge and reopening the result in Excel.
