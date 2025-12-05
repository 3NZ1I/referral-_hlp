// src/api/index.js
// API methods for cases, assignments, comments, and import
import request from './http';

export const fetchCases = (params) => request('/cases', { params });
export const fetchCaseDetails = (id) => request(`/cases/${id}`);
export const assignCase = (id, user, ability) => request(`/cases/${id}/assign`, {
  method: 'POST',
  body: { user, ability },
});
export const createCase = (data) => request('/cases', { method: 'POST', body: data });
export const updateCaseApi = (id, data) => request(`/cases/${id}`, { method: 'PUT', body: data });
export const fetchComments = (caseId) => request(`/cases/${caseId}/comments`);
export const addComment = (caseId, text) => request(`/cases/${caseId}/comments`, {
  method: 'POST',
  body: { text },
});
export const importXLSX = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return request('/import', {
    method: 'POST',
    body: formData,
    headers: {},
  });
};
