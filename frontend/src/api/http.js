// src/api/http.js
// Secure HTTP client using fetch with best practices

const BASE_URL = import.meta.env.VITE_API_URL || process.env.REACT_APP_API_URL || 'https://api.bessar.work/api';

function getAuthToken() {
  // Example: get token from localStorage or cookie
  return localStorage.getItem('authToken');
}

async function request(endpoint, { method = 'GET', body, headers = {}, params } = {}) {
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const query = new URLSearchParams(params).toString();
    url += `?${query}`;
  }

  const token = getAuthToken();
  const fetchHeaders = {
    ...headers,
  };
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (!isFormData) {
    fetchHeaders['Content-Type'] = 'application/json';
  }
  if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers: fetchHeaders,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    credentials: 'include', // send cookies if needed
  });

  // Try to parse JSON only when content-type is JSON
  const isJson = response.headers.get('Content-Type')?.includes('application/json');
  if (!response.ok) {
    let errorBody = null;
    if (isJson) {
      errorBody = await response.json().catch(() => null);
    }
    const message = (errorBody && errorBody.detail) || (errorBody && errorBody.message) || response.statusText || 'API Error';
    const err = new Error(message);
    err.status = response.status;
    err.body = errorBody;
    throw err;
  }
  if (isJson) {
    return response.json();
  }
  return response.text();
}

export default request;
