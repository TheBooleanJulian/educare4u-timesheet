// Core logic tests. Run: node --test tests/
// Loads the <script id="core"> block straight out of index.html so the app stays a single file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const src = /<script id="core">([\s\S]*?)<\/script>/.exec(html)[1];
const ctx = vm.createContext({});
vm.runInContext(src, ctx);
const C = ctx.TimesheetCore;

const AUG = `5
Aug 2026, Wed
12:00 – 13:30
Educare4u Gumi Sec 1 Maths + Sci
https://us06web.zoom.us/j/1?pwd=x
12:00 – 13:30
Educare4u Gumi Sec 1 Maths + Sci
Zoom

7
Aug 2026, Fri
18:00 – 20:30
Educare4u Megurine Luka Sec 4 Maths + Sci
Centre Branch, 1 Sample Rd, Singapore 000000

9
Aug 2026, Sun
12:00 – 15:00
Educare4u IA Sec 4 Maths + Sci
Centre Branch, 1 Sample Rd, Singapore 000000

11
Aug 2026, Tue
12:00 – 13:30
Educare4u Gumi Sec 1 Maths + Sci
https://us06web.zoom.us/j/2?pwd=y
12:00 – 13:30
Educare4u Gumi Sec 1 Maths + Sci
Zoom

12
Aug 2026, Wed
19:30 – 21:30
Educare4u Meiko Sec 2 Sci
Zoom
19:30 – 21:30
Educare4u Meiko Sec 4 Sci
https://us06web.zoom.us/j/3?pwd=z

14
Aug 2026, Fri
16:00 – 17:30
Educare4u Megurine Luka Sec 4 Maths + Sci
Centre Branch, 1 Sample Rd, Singapore 000000
18:02 – 18:42
Take transit from EduCare4u Pte. Ltd. to Promenade Station Exit A

21
Aug 2026, Fri
18:00 – 20:00
Educare4u Megurine Luka Sec 4 Maths + Sci
Centre Branch, 1 Sample Rd, Singapore 000000

25
Aug 2026, Tue
12:00 – 13:30
Educare4u Gumi Sec 1 Maths + Sci
https://us06web.zoom.us/j/2?pwd=y
12:00 – 13:30
Educare4u Gumi Sec 1 Maths + Sci
Zoom
19:30 – 21:30
Educare4u Meiko Sec 2 Sci
https://us06web.zoom.us/j/3?pwd=z
19:30 – 21:30
Educare4u Meiko Sec 2 Sci
Zoom

28
Aug 2026, Fri
14:00 – 16:00
Educare4u IA Sec 4 Maths + Sci
Centre Branch, 1 Sample Rd, Singapore 000000
18:00 – 20:00
Educare4u Megurine Luka Sec 4 Maths + Sci
Centre Branch, 1 Sample Rd, Singapore 000000`;

const sessionOn = (r, d, student) => r.sessions.find(s => s.d === d && s.student === student);

test('August sample: cells match the submitted timesheet', () => {
  const r = C.run({ blob: AUG });
  assert.equal(r.monthLabel, 'August 2026');
  assert.equal(r.days[5].lines.join('\n'), '12–1.30pm (1.5 hrs) Gumi: $52.50');
  assert.equal(r.days[7].lines.join('\n'), '6–8.30pm (2.5 hrs) Megurine Luka: $87.50');
  assert.equal(r.days[9].lines.join('\n'), '12–3pm (2.5 hrs) IA: $87.50');
  assert.equal(r.days[12].lines.join('\n'), '7.30–9.30pm (2.0 hrs) Meiko: $70.00');
  assert.equal(r.days[14].lines.join('\n'), '4–5.30pm (1.5 hrs) Megurine Luka: $52.50');
  assert.equal(r.days[25].lines.join('\n'), '12–1.30pm (1.5 hrs) Gumi: $52.50\n7.30–9.30pm (2.0 hrs) Meiko: $70.00');
  assert.equal(r.days[25].cents, 12250);
  assert.equal(r.count, 11);
  assert.equal(r.totalCents, 73500);
  assert.deepEqual([...r.weeks.map(w => w.cents)], [0, 22750, 17500, 7000, 26250, 0]);
});

test('August: Zoom duplicates merge, transit ignored, no warnings', () => {
  const r = C.run({ blob: AUG });
  assert.equal(r.sessions.filter(s => s.d === 25).length, 2);
  assert.ok(sessionOn(r, 12, 'Meiko').flags.some(f => /Titles differ: Sec 2 Sci \/ Sec 4 Sci/.test(f.text)));
  assert.equal(r.ignored.length, 1);
  assert.match(r.ignored[0].title, /Take transit/);
  assert.equal(r.counts.error, 0);
  assert.equal(r.counts.warn, 0);
  assert.ok(sessionOn(r, 9, 'IA').flags.some(f => /Public holiday: National Day/.test(f.text)));
});

test('August with the 28 Aug IA lesson edited to 2–5pm reproduces $752.50', () => {
  const r0 = C.run({ blob: AUG });
  const id = sessionOn(r0, 28, 'IA').id;
  const r = C.run({ blob: AUG, overrides: { [id]: { start: '14:00', end: '17:00' } } });
  assert.equal(r.days[28].lines[0], '2–5pm (2.5 hrs) IA: $87.50');
  assert.equal(r.days[28].cents, 15750);
  assert.equal(r.totalCents, 75250);
  assert.deepEqual([...r.weeks.map(w => w.cents)], [0, 22750, 17500, 7000, 28000, 0]);
  assert.ok(sessionOn(r, 28, 'IA').flags.some(f => /Edited by you \(calendar said 2–4pm\)/.test(f.text)));
});

test('conflicting duplicate times are flagged and resolvable', () => {
  const blob = `2
Feb 2026, Mon
19:30 – 21:00
Educare4u Gumi x Miku P5 Maths | Mon 7.30pm
https://us06web.zoom.us
20:00 – 21:30
Educare4u Gumi P5 Maths
Zoom`;
  const r = C.run({ blob });
  const s = r.sessions[0];
  assert.equal(r.sessions.length, 1);
  assert.equal(s.status, 'warn');
  assert.match(s.flags.find(f => f.level === 'warn').text, /7.30–9pm vs 8–9.30pm/);
  assert.equal(r.days[2].lines[0], '7.30–9pm (1.5 hrs) Gumi: $52.50');
  const r2 = C.run({ blob, overrides: { [s.id]: { choice: 1 } } });
  assert.equal(r2.days[2].lines[0], '8–9.30pm (1.5 hrs) Gumi: $52.50');
  assert.equal(r2.sessions[0].status, 'ok');
});

test('rules: Rin 6h split and IA break; overlaps between students flagged', () => {
  const blob = `24
Feb 2026, Tue
10:00 – 16:00
Educare4u Rin Sec 4 Bio
Zoom
10:00 – 16:00
Educare4u x Rin | A level Bio | 24/2 Tues
https://us06web.zoom.us

13
Feb 2026, Fri
14:30 – 18:30
Educare4u IA Sec 4 Maths Sci
Centre Branch
18:00 – 20:00
Educare4u Megurine Luka Sec 4 Maths Sci
Centre Branch`;
  const r = C.run({ blob });
  assert.deepEqual([...r.days[24].lines], [
    '10am–12pm (2.0 hrs) Rin: $80.00',
    '12–1pm (break, unbilled)',
    '1–3pm (2.0 hrs) Rin: $80.00',
    '3–4pm (FOC)',
  ]);
  assert.equal(r.days[13].lines[0], '2.30–6.30pm (3.5 hrs) IA: $122.50');
  assert.ok(sessionOn(r, 13, 'Megurine Luka').flags.some(f => f.level === 'warn' && /Overlaps IA/.test(f.text)));
});

test('unknown students, odd times, bad weekdays and cancellations are flagged', () => {
  const blob = `3
Mar 2026, Wed
10:00 – 11:10
Educare4u Teto Sec 3 Chem
Zoom

4
Mar 2026, Mon
10:00 – 12:00
Educare4u Gakupo P5 Maths
Zoom
14:00 – 16:00
Educare4u Gakupo P5 Maths CANCELLED
Zoom`;
  const r = C.run({ blob });
  const zara = sessionOn(r, 3, 'Teto');
  assert.equal(zara.known, false);
  assert.ok(zara.flags.some(f => /not in the rate list/.test(f.text)));
  assert.ok(zara.flags.some(f => /15-minute/.test(f.text)));
  assert.ok(r.flags.some(f => f.level === 'error' && /is a Wednesday/.test(f.text)));
  const cancelled = r.sessions.find(s => s.d === 4 && s.start === 14 * 60);
  assert.equal(cancelled.include, false);
  assert.equal(r.days[4].lines.length, 1);
});

test('student names: roster first, then level heuristics', () => {
  const roster = ['Megurine Luka', 'Gumi'];
  assert.equal(C.identifyStudent('Educare4u Megurine Luka Sec 4 Maths', roster, 'Miku').name, 'Megurine Luka');
  assert.equal(C.identifyStudent('Educare4u Gumi x Miku P5 Maths | Mon 7.30pm', roster, 'Miku').name, 'Gumi');
  assert.equal(C.identifyStudent('Educare4u x Kasane Teto Sec 2 Maths', roster, 'Miku').name, 'Kasane Teto');
  assert.equal(C.identifyStudent('Educare4u x Gakupo Maths | Sun', [], 'Miku').name, 'Gakupo');
});

test('TSV output: 3 rows per week, quoted multi-line cells, PH label', () => {
  const r = C.run({ blob: AUG });
  const tsv = C.buildTSV(r, { phDays: C.defaultPhDays(r) });
  const rows = tsv.split('\r\n');
  assert.equal(rows.length, 18);
  assert.equal(rows[3], '3\t4\t5\t6\t7\t8\t9 PH');
  assert.match(tsv, /"12–1.30pm \(1.5 hrs\) Gumi: \$52.50\n7.30–9.30pm \(2.0 hrs\) Meiko: \$70.00"/);
  assert.equal(rows[5], '\t\t$52.50\t\t$87.50\t\t$87.50');
});

test('time parsing accepts 12-hour forms and rejects bare numbers', () => {
  assert.deepEqual({ ...C.parseTimeLine('12:00 – 13:30') }, { start: 720, end: 810 });
  assert.deepEqual({ ...C.parseTimeLine('11 – 1pm') }, { start: 660, end: 780 });
  assert.deepEqual({ ...C.parseTimeLine('7:30pm - 9:30pm') }, { start: 1170, end: 1290 });
  assert.equal(C.parseTimeLine('116 - 120'), null);
  assert.equal(C.parseTimeLine('1 - 2'), null);
});

test('lunch rules apply to any student: 10am–3pm and 10am–4pm both bill 4 hrs', () => {
  const day = (who, end) => `3
Mar 2026, Tue
10:00 – ${end}
Educare4u ${who} Sec 4 Maths
Zoom`;
  const bill = (who, end) => C.run({ blob: day(who, end) }).sessions[0];
  assert.equal(bill('Gakupo', '15:00').billedMins, 240);
  assert.equal(bill('Gakupo', '16:00').billedMins, 240);
  assert.equal(bill('Gakupo', '15:00').cents, 14000);
  assert.equal(bill('Teto', '15:00').billedMins, 240);
  assert.equal(bill('IA', '15:00').billedMins, 240);          // window rule beats IA 3h+ break rule
  assert.equal(bill('Rin', '16:00').rule, 'Rin long session split'); // named rule wins
  assert.equal(bill('Rin', '16:00').billedMins, 240);
  assert.equal(bill('Gakupo', '14:00').billedMins, 240);               // 4h, no rule: unchanged
  assert.equal(bill('Gakupo', '14:00').rule, null);
  assert.equal(bill('Gakupo', '15:00').status, 'ok');
});
