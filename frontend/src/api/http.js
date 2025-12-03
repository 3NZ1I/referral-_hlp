// src/api/http.js
// Secure HTTP client using fetch with best practices

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

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
    'Content-Type': 'application/json',
    ...headers,
  };
  if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, {
    method,
    headers: fetchHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // send cookies if needed
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API Error');
  }
  return response.json();
}

export default request;
