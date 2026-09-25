const { User, Role, UserRole } = require('../../models');
const ApiError = require('../../utils/ApiError');
const { toPublicUser } = require('../../utils/userSerializer');
const { withRolesAndPermissions } = require('../auth/auth.service');

/**
 * Administrative user listing. USER_VIEW-gated (see admin.routes.js).
 *
 * NOTE (documented, known limitation — see docs/authentication.md,
 * "Known limitations"): the initial role/permission mapping (§21 of the
 * chunk brief) grants USER_VIEW to STUDENT/FACULTY/RESEARCHER as well as
 * SUPER_ADMIN/UNIVERSITY_ADMIN, which technically permits any
 * authenticated user to call this endpoint today. USER_VIEW as specified
 * is intended to eventually cover "view a user's own/public profile" in a
 * future non-admin endpoint; splitting that from "list all users
 * platform-wide" needs a second, narrower permission this chunk does not
 * introduce (to avoid inventing permissions beyond the specified initial
 * set). Flagged here rather than silently deviating from the specified
 * role/permission table.
 */
const listUsers = async ({ page, limit, status }) => {
  const where = {};
  if (status) {
    where.status = status;
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    include: [{ association: 'roles' }],
    limit,
    offset: (page - 1) * limit,
    order: [['createdAt', 'DESC']],
    distinct: true, // count users, not the join rows their roles produce
  });

  return {
    users: rows.map(toPublicUser),
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) || 0 },
  };
};

const findUserByPublicId = async (userUuid) => {
  const user = await User.findOne({ where: { uuid: userUuid } });
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }
  return user;
};

/** Role assignment (§25). Never trusts a role name without checking it exists. */
const assignRole = async (userUuid, roleName) => {
  const user = await findUserByPublicId(userUuid);

  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) {
    throw new ApiError(404, 'Role not found.');
  }

  const existing = await UserRole.findOne({ where: { userId: user.id, roleId: role.id } });
  if (existing) {
    throw new ApiError(409, 'User already has this role.');
  }

  try {
    await user.addRole(role);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ApiError(409, 'User already has this role.');
    }
    throw error;
  }

  return toPublicUser(await withRolesAndPermissions(user.id));
};

/**
 * Role removal (§26). Refuses to remove a user's last remaining role,
 * since that would leave the account without any basis for
 * authorization decisions elsewhere in the platform.
 */
const removeRole = async (userUuid, roleName) => {
  const user = await findUserByPublicId(userUuid);
  const withRoles = await withRolesAndPermissions(user.id);

  const role = withRoles.roles.find((r) => r.name === roleName);
  if (!role) {
    throw new ApiError(404, 'User does not have this role.');
  }

  if (withRoles.roles.length <= 1) {
    throw new ApiError(409, "Cannot remove the user's only role.");
  }

  await user.removeRole(role);

  return toPublicUser(await withRolesAndPermissions(user.id));
};

module.exports = { listUsers, assignRole, removeRole };
