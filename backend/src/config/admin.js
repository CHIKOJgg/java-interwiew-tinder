const ADMIN_IDS = new Set(
  (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
);

export const isAdmin = (userId) => ADMIN_IDS.has(String(userId));

export default ADMIN_IDS;
