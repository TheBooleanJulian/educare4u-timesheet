// Copy to private-config.js (gitignored) and edit. Omit any key to keep the built-in demo default.
globalThis.TIMESHEET_PRIVATE = {
  settings: {
    tutor: 'Your Name',          // fills "Name" in the sheet; ignored in titles like "Gumi x Your Name"
    defaultRate: 35,
    rates: [{ name: 'Student One', rate: 40 }, { name: 'Student Two', rate: 35 }],
    rules: [
      // type: 'window' (exact start/end), 'exact_hours' (split a long session), 'break_over' (deduct a break if long)
      // student: '' applies to anyone
      { id: 1, label: 'Lunch 10am–3pm', type: 'window', student: '', start: '10:00', end: '15:00', breakMins: 60 },
    ],
  },
  // sample: '5
Aug 2026, Wed
12:00 – 13:30
Educare4u Student One Sec 1 Maths
Zoom',   // optional "Load sample" text
};
