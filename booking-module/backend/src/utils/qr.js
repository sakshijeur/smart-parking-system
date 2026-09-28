const crypto = require('crypto');
const QRCode = require('qrcode');
require('dotenv').config();

const SECRET = process.env.QR_SECRET;

/**
 * Builds a signed token for a reservation:  <reservationId>.<signature>
 * The signature is an HMAC-SHA256 of the reservationId using our secret key,
 * so an operator's scan can verify the QR wasn't hand-crafted/faked.
 */
function generateQrToken(reservationId) {
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(String(reservationId))
    .digest('hex');
  return `${reservationId}.${signature}`;
}

/**
 * Verifies a scanned token. Returns the reservationId if valid, else null.
 */
function verifyQrToken(token) {
  const [reservationId, signature] = String(token).split('.');
  if (!reservationId || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', SECRET)
    .update(reservationId)
    .digest('hex');

  // timingSafeEqual avoids leaking info via timing attacks
  const valid =
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  return valid ? Number(reservationId) : null;
}

/**
 * Turns a token into a QR code image (base64 data URI) the app can display.
 */
async function tokenToQrImage(token) {
  return QRCode.toDataURL(token); // e.g. "data:image/png;base64,...."
}

module.exports = { generateQrToken, verifyQrToken, tokenToQrImage };
