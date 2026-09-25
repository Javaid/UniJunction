const { DataTypes } = require('sequelize');

/**
 * A revocable, DB-backed refresh token. The raw token is never stored —
 * only a SHA-256 hex digest (`tokenHash`) is, so a database leak does not
 * hand out usable tokens. SHA-256 (not bcrypt) is deliberate here: this
 * hash is looked up by equality (`WHERE token_hash = ?`), which bcrypt's
 * random-salt-per-hash design makes impossible, and the input is a
 * high-entropy, server-generated 256-bit random value (not a low-entropy
 * user-chosen secret), so bcrypt's slow, salted hashing buys nothing a
 * fast deterministic hash doesn't already cover for this threat model.
 * See docs/database-guidelines.md and docs/authentication.md.
 *
 * `tokenHash` is excluded from the default scope as defense-in-depth —
 * no endpoint ever returns a RefreshToken row at all, but this ensures
 * an accidental `res.json()` of one still couldn't leak the hash.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'RefreshToken',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      tokenHash: {
        // Hex-encoded SHA-256 digest is always 64 characters.
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastUsedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'refresh_tokens',
      paranoid: false,
      defaultScope: {
        attributes: { exclude: ['tokenHash'] },
      },
      indexes: [{ fields: ['user_id'] }, { fields: ['expires_at'] }],
    }
  );
