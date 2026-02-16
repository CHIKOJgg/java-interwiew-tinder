import crypto from 'crypto';

export const validateTelegramWebAppData = (initData, botToken) => {
  try {
    if (!botToken) return null;

    const params = initData.split('&');

    const data = {};
    let hash;

    for (const param of params) {
      const index = param.indexOf('=');
      const key = param.substring(0, index);
      const value = param.substring(index + 1);

      if (key === 'hash') {
        hash = value;
      } else {
        data[key] = value;
      }
    }

    if (!hash) return null;

    const dataCheckString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join('\n');

    // 🔐 CORRECT SECRET KEY
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash !== hash) {
      console.log('Hash mismatch');
      return null;
    }

    if (!data.user) return null;

    const user = JSON.parse(decodeURIComponent(data.user));

    return {
      telegram_id: user.id,
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
    };
  } catch (error) {
    console.error('Validation error:', error);
    return null;
  }
};
