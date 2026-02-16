import crypto from 'crypto';

/**
 * Validates Telegram Mini App initData
 * @param {string} initData - Raw initData string from Telegram WebApp
 * @param {string} botToken - Your Telegram Bot Token
 * @returns {Object|null} - Parsed user data or null if invalid
 */
export const validateTelegramWebAppData = (initData, botToken) => {
  try {
    if (!botToken) return null;

    // 1️⃣ Разбиваем вручную, НЕ через URLSearchParams
    const params = initData.split('&');

    const data = {};
    let hash;
    console.log('INIT:', initData);
    console.log('BOT:', botToken.slice(0, 10));
    console.log('CHECK STRING:', dataCheckString);
    console.log('CALC:', calculatedHash);
    console.log('HASH:', hash);
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
    console.log('INIT:', initData);
    console.log('BOT:', botToken.slice(0, 10));
    console.log('CHECK STRING:', dataCheckString);
    console.log('CALC:', calculatedHash);
    console.log('HASH:', hash);
    if (!hash) return null;

    // 2️⃣ Формируем data_check_string из RAW значений
    const dataCheckString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join('\n');
    console.log('INIT:', initData);
    console.log('BOT:', botToken.slice(0, 10));
    console.log('CHECK STRING:', dataCheckString);
    console.log('CALC:', calculatedHash);
    console.log('HASH:', hash);
    // 3️⃣ secret_key = SHA256(botToken)
    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    // 4️⃣ HMAC
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    console.log('INIT:', initData);
    console.log('BOT:', botToken.slice(0, 10));
    console.log('CHECK STRING:', dataCheckString);
    console.log('CALC:', calculatedHash);
    console.log('HASH:', hash);
    if (calculatedHash !== hash) {
      console.log('Hash mismatch');
      return null;
    }

    // 5️⃣ Теперь декодируем user
    if (!data.user) return null;

    const user = JSON.parse(decodeURIComponent(data.user));
    console.log('INIT:', initData);
    console.log('BOT:', botToken.slice(0, 10));
    console.log('CHECK STRING:', dataCheckString);
    console.log('CALC:', calculatedHash);
    console.log('HASH:', hash);

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
