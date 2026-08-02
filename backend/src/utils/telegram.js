import crypto from 'crypto';
import logger from '../config/logger.js';

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
      logger.warn({ initDataPreview: initData?.slice(0, 400), initDataLen: initData?.length }, 'No hash in initData — rejecting');
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

    if (
      hashBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(hashBuffer, receivedBuffer)
    ) {
      logger.warn({ hash: hash.slice(0,16)+'...', calcHash: calculatedHash.slice(0,16)+'...', initDataLen: initData?.length, hasUser: urlParams.has('user') }, '❌ Telegram initData hash mismatch — rejecting request');
      return null;
    }

    // Reject stale initData: a signed hash is valid forever, so without a
    // freshness check a captured initData could authenticate indefinitely.
    const authDate = parseInt(urlParams.get('auth_date'), 10);
    if (!Number.isFinite(authDate)) {
      logger.warn('No auth_date in initData — rejecting');
      return null;
    }
    if (Date.now() / 1000 - authDate > 24 * 60 * 60) {
      logger.warn('initData is older than 24h — rejecting');
      return null;
    }

    // Parse user data
    const userParam = urlParams.get('user');
    if (!userParam) {
      logger.warn('No user parameter in initData — rejecting');
      return null;
    }

    const user = JSON.parse(userParam);

    logger.debug({ telegramId: user.id }, '✅ User data parsed');

    return {
      telegram_id: user.id,
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
    };
  } catch (err) {
    logger.error({ err }, 'Error validating Telegram data');
    return null;
  }
};

/**
 * Mock validation for development (when BOT_TOKEN is not set)
 *
 * SECURITY: always returns a FIXED dev user. We never trust a telegram_id
 * supplied in the request body — doing so would let anyone impersonate any
 * user in development and, if misconfigured, in production.
 */
export const mockValidation = () => {
  const env = process.env.NODE_ENV || 'development';
  if (env !== 'development' && env !== 'test') {
    throw new Error(`Mock validation is blocked in environment: ${env}`);
  }
  return {
    telegram_id: 123456789,
    username: 'dev_user',
    first_name: 'Dev',
    last_name: 'User',
  };
};
