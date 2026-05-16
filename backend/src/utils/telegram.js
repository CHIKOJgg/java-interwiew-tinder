import crypto from 'crypto';

/**
 * Validates Telegram Mini App initData
 * @param {string} initData - Raw initData string from Telegram WebApp
 * @param {string} botToken - Your Telegram Bot Token
 * @returns {Object|null} - Parsed user data or null if invalid
 */
export const validateTelegramWebAppData = (initData, botToken) => {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');

    if (!hash) {
      console.log('No hash in initData');
      return null;
    }

    urlParams.delete('hash');

    // Sort parameters alphabetically
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Validate using timing-safe comparison to prevent timing attacks
    const hashBuffer = Buffer.from(calculatedHash, 'hex');
    const receivedBuffer = Buffer.from(hash, 'hex');

    if (hashBuffer.length !== receivedBuffer.length ||
        !crypto.timingSafeEqual(hashBuffer, receivedBuffer)) {
      console.warn('❌ Telegram initData hash mismatch — rejecting request');
      return null;
    }

    // Parse user data
    const userParam = urlParams.get('user');
    if (!userParam) {
      console.log('No user parameter in initData');
      return null;
    }

    const user = JSON.parse(userParam);

    console.log('✅ User data parsed:', user.id);

    return {
      telegram_id: user.id,
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
    };
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return null;
  }
};

/**
 * Mock validation for development (when BOT_TOKEN is not set)
 */
export const mockValidation = (initData) => {
  if (process.env.NODE_ENV === 'production' && !process.env.BOT_TOKEN) {
    throw new Error('Production guard: BOT_TOKEN is missing. Mock validation is blocked in production.');
  }
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
