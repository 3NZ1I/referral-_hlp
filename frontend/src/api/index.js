// src/api/index.js
// API methods for cases, assignments, comments, and import
import request from './http';

export const fetchCases = (params) => request('/cases', { params });
export const fetchCaseDetails = (id) => request(`/cases/${id}`);
export const assignCase = (id, user, ability) => request(`/cases/${id}/assign`, {
  method: 'POST',
  body: { user, ability },
});
export const fetchComments = (caseId) => request(`/cases/${caseId}/comments`);
export const addComment = (caseId, text) => request(`/cases/${caseId}/comments`, {
  method: 'POST',
  body: { text },
});
export const importXLSX = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/import`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    },
  }).then(res => {
    if (!res.ok) throw new Error('Import failed');
    return res.json();
  });
};
