/**
 * Holds the refresh token in memory only — never localStorage/sessionStorage
 * (see docs/authentication.md, "Token storage"). This means it does not
 * survive a full page reload; the access token (which lives in Redux
 * state, also memory-only) doesn't either. A reload currently requires
 * logging in again — an accepted, documented limitation for this chunk.
 *
 * Kept out of Redux deliberately, per the chunk brief: "do not put
 * refresh tokens into Redux state if the chosen storage strategy does
 * not require it." The Axios interceptor (apiClient.js) is the only
 * other reader/writer of this module.
 */
let refreshToken = null;

export const getRefreshToken = () => refreshToken;
export const setRefreshToken = (token) => {
  refreshToken = token;
};
export const clearRefreshToken = () => {
  refreshToken = null;
};
