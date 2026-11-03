// ===== Settings for the teacher =====
window.CONFIG = {
  // Paste the Google Apps Script "Web app" URL here (see SETUP_GUIDE.md, step 2).
  // While this is empty, the site still works, but the class ranking is not shared.
  SHEET_URL: 'https://script.google.com/macros/s/AKfycbwrRSzUyWmzHDs--fNpztkLqnCHnHW6vgj96bm7HUSCXlNb4Yl2iiK1MEs_GRIwLFNUtw/exec',

  // Course name shown on the home page.
  COURSE: 'International Tests – Final Exam Review',

  // true = all 10 levels are open from the start.
  // false = a level opens when the quiz of the level before it reaches 60%.
  UNLOCK_ALL: false,

  // Presentation groups students can choose when they sign in.
  GROUPS: ['G1 – IELTS', 'G2 – TOEIC / TOEFL', 'G3 – B2 First / C1 Advanced', 'G4 – Aptis', 'G5 – VSTEP / Linguaskill'],
};
