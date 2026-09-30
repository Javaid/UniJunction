import apiClient from './apiClient';

const unwrap = (promise) => promise.then((res) => res.data);

// ---- My profile (§27) ---------------------------------------------------------
export const getMyProfile = () => unwrap(apiClient.get('/students/me/profile'));
export const createMyProfile = (payload) => unwrap(apiClient.post('/students/me/profile', payload));
export const updateMyProfile = (payload) => unwrap(apiClient.put('/students/me/profile', payload));
export const updateMyProfileStatus = (status) =>
  unwrap(apiClient.patch('/students/me/profile/status', { status }));

// ---- Public/discovery profile (§25/§26) ----------------------------------------
export const getStudentProfile = (id) => unwrap(apiClient.get(`/students/${id}/profile`));

// ---- Skills (§28) ---------------------------------------------------------------
export const listSkills = (params) => unwrap(apiClient.get('/skills', { params }));
export const addMySkill = (payload) => unwrap(apiClient.post('/students/me/skills', payload));
export const updateMySkill = (skillId, payload) =>
  unwrap(apiClient.put(`/students/me/skills/${skillId}`, payload));
export const removeMySkill = (skillId) => unwrap(apiClient.delete(`/students/me/skills/${skillId}`));

// ---- Academic interests (§29) ----------------------------------------------------
export const listInterests = (params) => unwrap(apiClient.get('/interests', { params }));
export const addMyInterest = (payload) => unwrap(apiClient.post('/students/me/interests', payload));
export const removeMyInterest = (interestId) =>
  unwrap(apiClient.delete(`/students/me/interests/${interestId}`));

// ---- Research areas / interests (§30) --------------------------------------------
export const listResearchAreas = (params) => unwrap(apiClient.get('/research-areas', { params }));
export const addMyResearchInterest = (payload) =>
  unwrap(apiClient.post('/students/me/research-interests', payload));
export const removeMyResearchInterest = (id) =>
  unwrap(apiClient.delete(`/students/me/research-interests/${id}`));

// ---- Languages (§31) ---------------------------------------------------------------
export const listLanguages = (params) => unwrap(apiClient.get('/languages', { params }));
export const addMyLanguage = (payload) => unwrap(apiClient.post('/students/me/languages', payload));
export const updateMyLanguage = (id, payload) => unwrap(apiClient.put(`/students/me/languages/${id}`, payload));
export const removeMyLanguage = (id) => unwrap(apiClient.delete(`/students/me/languages/${id}`));

// ---- Certifications (§32) -----------------------------------------------------------
export const listMyCertifications = () => unwrap(apiClient.get('/students/me/certifications'));
export const createMyCertification = (payload) => unwrap(apiClient.post('/students/me/certifications', payload));
export const updateMyCertification = (id, payload) =>
  unwrap(apiClient.put(`/students/me/certifications/${id}`, payload));
export const deleteMyCertification = (id) => unwrap(apiClient.delete(`/students/me/certifications/${id}`));

// ---- Achievements (§33) ---------------------------------------------------------------
export const listMyAchievements = () => unwrap(apiClient.get('/students/me/achievements'));
export const createMyAchievement = (payload) => unwrap(apiClient.post('/students/me/achievements', payload));
export const updateMyAchievement = (id, payload) =>
  unwrap(apiClient.put(`/students/me/achievements/${id}`, payload));
export const deleteMyAchievement = (id) => unwrap(apiClient.delete(`/students/me/achievements/${id}`));

// ---- Academic goals (§34) ------------------------------------------------------------
export const listMyGoals = () => unwrap(apiClient.get('/students/me/goals'));
export const createMyGoal = (payload) => unwrap(apiClient.post('/students/me/goals', payload));
export const updateMyGoal = (id, payload) => unwrap(apiClient.put(`/students/me/goals/${id}`, payload));
export const deleteMyGoal = (id) => unwrap(apiClient.delete(`/students/me/goals/${id}`));

// ---- Admin: university student oversight (§35) -----------------------------------
export const listUniversityStudents = (universityId, params) =>
  unwrap(apiClient.get(`/universities/${universityId}/students`, { params }));
