import crypto from 'crypto';

export const validateTelegramWebAppData = (initData, botToken) => {
  try {
    if (!botToken || !initData) return null;

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

    // 🔐 Telegram correct secret key
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

/**
 * Mock validation for development (when BOT_TOKEN is not set)
 */
export const mockValidation = (initData) => {
  try {
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get('user');

    if (!userParam) {
      // Return mock user for development
      return {
        telegram_id: 123456789,
        username: 'dev_user',
        first_name: 'Dev',
        last_name: 'User',
      };
    }

    const user = JSON.parse(userParam);
    return {
      telegram_id: user.id,
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
    };
  } catch (error) {
    // Return mock user on any error in dev mode
    return {
      telegram_id: 123456789,
      username: 'dev_user',
      first_name: 'Dev',
      last_name: 'User',
    };
  }
};
