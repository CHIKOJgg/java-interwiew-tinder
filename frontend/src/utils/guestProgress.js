// Guest (zero-login) progress persisted in localStorage so a visitor who plays
// the demo doesn't lose their work when they sign up. Keyed by language because
// different languages expose different question pools. Flushed to the server
// (POST /api/questions/import-progress) once on registration.
const KEY = 'guest_progress_v1';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — demo still works, just not persisted */
  }
}

export function saveGuestAnswer(language, questionId, status) {
  if (!questionId || (status !== 'known' && status !== 'unknown')) return;
  const all = readAll();
  all[language] = all[language] || {};
  all[language][questionId] = status;
  writeAll(all);
}

// Returns { questionId, status }[] for a language, then clears that language
// so it isn't imported twice.
export function takeGuestProgress(language) {
  const all = readAll();
  const bucket = all[language] || {};
  const items = Object.entries(bucket).map(([questionId, status]) => ({ questionId: Number(questionId), status }));
  if (all[language]) delete all[language];
  writeAll(all);
  return items;
}
