const { DataTypes } = require('sequelize');

/**
 * A single-use email verification token. Same hashing rationale as
 * RefreshToken: only a SHA-256 hash of the raw token is stored, and
 * `tokenHash` is excluded from the default scope as defense-in-depth —
 * no endpoint ever returns one of these rows.
 */
module.exports = (sequelize) =>
  sequelize.define(
    'EmailVerificationToken',
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
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'email_verification_tokens',
      paranoid: false,
      defaultScope: {
        attributes: { exclude: ['tokenHash'] },
      },
      indexes: [{ fields: ['user_id'] }, { fields: ['expires_at'] }],
    }
  );
