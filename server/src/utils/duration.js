/**
 * Parses short duration strings ("15m", "1h", "30d") into milliseconds.
 *
 * Used wherever a duration configured as a JWT-style string (e.g.
 * JWT_ACCESS_EXPIRES_IN) also needs to be expressed as a concrete
 * expiry Date (refresh/verification token rows) or a seconds count
 * (the `expires_in` field returned to clients).
 */
const UNIT_MS = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

const parseDurationMs = (input) => {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(String(input).trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${input}". Expected formats like "15m", "1h", "30d".`);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit.toLowerCase()];
};

const parseDurationSeconds = (input) => Math.floor(parseDurationMs(input) / 1000);

module.exports = { parseDurationMs, parseDurationSeconds };
