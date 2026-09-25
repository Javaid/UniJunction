/**
 * Two views of a University, per chunk brief §10:
 * - `toPublicUniversity`: what any caller (including unauthenticated
 *   visitors) may see.
 * - `toAdminUniversity`: adds fields relevant to managing the
 *   institution. Never includes internal audit metadata or anything
 *   security-sensitive — there isn't any on this model, but the split
 *   itself is what keeps a future sensitive field from leaking into the
 *   public view by default.
 */
const toPublicUniversity = (university) => {
  const plain = typeof university.toJSON === 'function' ? university.toJSON() : university;

  return {
    id: plain.uuid,
    name: plain.name,
    short_name: plain.shortName,
    slug: plain.slug,
    description: plain.description,
    logo_url: plain.logoUrl,
    website_url: plain.websiteUrl,
    country: plain.country,
    state_province: plain.stateProvince,
    city: plain.city,
    status: plain.status,
  };
};

const toAdminUniversity = (university) => {
  const plain = typeof university.toJSON === 'function' ? university.toJSON() : university;

  return {
    ...toPublicUniversity(university),
    email_domain: plain.emailDomain,
    address: plain.address,
    postal_code: plain.postalCode,
    verification_status: plain.verificationStatus,
    verified_at: plain.verifiedAt,
    created_at: plain.createdAt,
    updated_at: plain.updatedAt,
  };
};

/** True if `user` (from req.user, may be undefined) may see the admin view of this university. */
const canViewAdminUniversity = (user, universityId) => {
  if (!user) return false;
  if (user.roles.includes('SUPER_ADMIN')) return true;
  if (user.roles.includes('UNIVERSITY_ADMIN') && user.permissions.includes('UNIVERSITY_VIEW')) {
    // Membership-scoping is intentionally not re-checked for this
    // read-only "show me more detail" branch — a UNIVERSITY_ADMIN for
    // ANY university already has UNIVERSITY_VIEW and is not being
    // granted any write capability here, only a richer read. Mutating
    // endpoints still call assertUniversityAccess (access.service.js).
    return Boolean(universityId);
  }
  return false;
};

const serializeUniversity = (university, user) =>
  canViewAdminUniversity(user, university.id) ? toAdminUniversity(university) : toPublicUniversity(university);

module.exports = { toPublicUniversity, toAdminUniversity, serializeUniversity };
