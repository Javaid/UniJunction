const { sequelize, User, RefreshToken } = require('../../src/models');

afterAll(() => sequelize.close());

describe('RefreshToken model', () => {
  it('requires userId, tokenHash, and expiresAt', () => {
    const attrs = RefreshToken.rawAttributes;
    expect(attrs.userId.allowNull).toBe(false);
    expect(attrs.tokenHash.allowNull).toBe(false);
    expect(attrs.tokenHash.unique).toBeTruthy();
    expect(attrs.expiresAt.allowNull).toBe(false);
  });

  it('allows revokedAt and lastUsedAt to be null', () => {
    const attrs = RefreshToken.rawAttributes;
    expect(attrs.revokedAt.allowNull).toBe(true);
    expect(attrs.lastUsedAt.allowNull).toBe(true);
  });

  it('excludes tokenHash from its default scope', () => {
    expect(RefreshToken.options.defaultScope.attributes.exclude).toContain('tokenHash');
  });

  it('is not soft-deletable — revocation is a column, not a delete', () => {
    expect(RefreshToken.options.paranoid).toBe(false);
  });

  it('belongs to a user and cascades on user deletion', () => {
    expect(RefreshToken.associations.User).toBeDefined();
    expect(User.associations.refreshTokens.options.onDelete).toBe('CASCADE');
  });
});
