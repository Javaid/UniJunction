const { sequelize, User, EmailVerificationToken } = require('../../src/models');

afterAll(() => sequelize.close());

describe('EmailVerificationToken model', () => {
  it('requires userId, tokenHash, and expiresAt', () => {
    const attrs = EmailVerificationToken.rawAttributes;
    expect(attrs.userId.allowNull).toBe(false);
    expect(attrs.tokenHash.allowNull).toBe(false);
    expect(attrs.tokenHash.unique).toBeTruthy();
    expect(attrs.expiresAt.allowNull).toBe(false);
  });

  it('allows usedAt to be null (unused until consumed)', () => {
    expect(EmailVerificationToken.rawAttributes.usedAt.allowNull).toBe(true);
  });

  it('excludes tokenHash from its default scope', () => {
    expect(EmailVerificationToken.options.defaultScope.attributes.exclude).toContain('tokenHash');
  });

  it('is not soft-deletable — single-use state is tracked via usedAt', () => {
    expect(EmailVerificationToken.options.paranoid).toBe(false);
  });

  it('belongs to a user and cascades on user deletion', () => {
    expect(EmailVerificationToken.associations.User).toBeDefined();
    expect(User.associations.emailVerificationTokens.options.onDelete).toBe('CASCADE');
  });
});
