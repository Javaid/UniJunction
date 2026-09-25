const bcrypt = require('bcryptjs');
const env = require('../../config/env');

/**
 * All password hashing/verification goes through this module — no other
 * file should call bcrypt directly. Cost factor is configurable
 * (BCRYPT_SALT_ROUNDS) rather than hard-coded.
 */
const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, env.security.bcryptSaltRounds);

const verifyPassword = (plainPassword, passwordHash) => bcrypt.compare(plainPassword, passwordHash);

module.exports = { hashPassword, verifyPassword };
