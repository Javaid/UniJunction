import apiClient from './apiClient';

const unwrap = (promise) => promise.then((res) => res.data);

// ---- Universities -----------------------------------------------------------
export const listUniversities = (params) => unwrap(apiClient.get('/universities', { params }));
export const getUniversity = (id) => unwrap(apiClient.get(`/universities/${id}`));
export const createUniversity = (payload) => unwrap(apiClient.post('/universities', payload));
export const updateUniversity = (id, payload) => unwrap(apiClient.put(`/universities/${id}`, payload));
export const updateUniversityStatus = (id, status) =>
  unwrap(apiClient.patch(`/universities/${id}/status`, { status }));
export const updateUniversityVerification = (id, status) =>
  unwrap(apiClient.patch(`/universities/${id}/verification`, { status }));

// ---- Domains ------------------------------------------------------------------
export const listDomains = (universityId) => unwrap(apiClient.get(`/universities/${universityId}/domains`));
export const createDomain = (universityId, payload) =>
  unwrap(apiClient.post(`/universities/${universityId}/domains`, payload));
export const removeDomain = (universityId, domainId) =>
  unwrap(apiClient.delete(`/universities/${universityId}/domains/${domainId}`));

// ---- Faculties ----------------------------------------------------------------
export const listFaculties = (universityId, params) =>
  unwrap(apiClient.get(`/universities/${universityId}/faculties`, { params }));
export const createFaculty = (universityId, payload) =>
  unwrap(apiClient.post(`/universities/${universityId}/faculties`, payload));
export const updateFaculty = (facultyId, payload) => unwrap(apiClient.put(`/faculties/${facultyId}`, payload));
export const updateFacultyStatus = (facultyId, status) =>
  unwrap(apiClient.patch(`/faculties/${facultyId}/status`, { status }));

// ---- Departments --------------------------------------------------------------
export const listDepartments = (universityId, params) =>
  unwrap(apiClient.get(`/universities/${universityId}/departments`, { params }));
export const createDepartment = (universityId, payload) =>
  unwrap(apiClient.post(`/universities/${universityId}/departments`, payload));
export const updateDepartmentStatus = (departmentId, status) =>
  unwrap(apiClient.patch(`/departments/${departmentId}/status`, { status }));

// ---- Programs -----------------------------------------------------------------
export const listPrograms = (universityId, params) =>
  unwrap(apiClient.get(`/universities/${universityId}/programs`, { params }));
export const createProgram = (universityId, payload) =>
  unwrap(apiClient.post(`/universities/${universityId}/programs`, payload));
export const updateProgramStatus = (programId, status) =>
  unwrap(apiClient.patch(`/programs/${programId}/status`, { status }));

// ---- Members / memberships ------------------------------------------------------
export const listMembers = (universityId, params) =>
  unwrap(apiClient.get(`/universities/${universityId}/members`, { params }));
export const createMembership = (universityId, payload) =>
  unwrap(apiClient.post(`/universities/${universityId}/members`, payload));
export const updateMembership = (universityId, membershipId, payload) =>
  unwrap(apiClient.patch(`/universities/${universityId}/members/${membershipId}`, payload));

// ---- University administrators --------------------------------------------------
export const listUniversityAdmins = (universityId) =>
  unwrap(apiClient.get(`/admin/universities/${universityId}/admins`));
export const assignUniversityAdmin = (universityId, userId) =>
  unwrap(apiClient.post(`/admin/universities/${universityId}/admins`, { userId }));

// ---- Own / another user's institutional affiliations -------------------------
export const listMyUniversities = () => unwrap(apiClient.get('/users/me/universities'));
export const listUserUniversities = (userId) => unwrap(apiClient.get(`/users/${userId}/universities`));
