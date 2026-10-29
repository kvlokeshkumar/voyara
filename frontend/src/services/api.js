import config from '../config';
import { getIdToken } from '../auth/cognito';

export class ApiError extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

async function request(method, path, body) {
  if (!config.apiUrl) throw new ApiError(0, 'not_configured', 'API URL is not configured (REACT_APP_API_URL).');
  const token = await getIdToken(); // refreshes silently if needed
  if (!token) {
    if (unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(401, 'unauthorized', 'Your session has expired. Please log in again.');
  }
  let res;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Cannot reach the server. Check your connection and try again.');
  }
  if (res.status === 401) {
    if (unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(401, 'unauthorized', 'Your session has expired. Please log in again.');
  }
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const e = data?.error || {};
    throw new ApiError(res.status, e.code || 'error', e.message || `Request failed (${res.status})`, e.field);
  }
  return data;
}

const enc = encodeURIComponent;

export const api = {
  me: () => request('GET', '/me'),
  dashboard: () => request('GET', '/dashboard'),
  listTrips: () => request('GET', '/trips'),
  createTrip: (t) => request('POST', '/trips', t),
  getTrip: (id) => request('GET', `/trips/${enc(id)}`),
  updateTrip: (id, t) => request('PUT', `/trips/${enc(id)}`, t),
  deleteTrip: (id) => request('DELETE', `/trips/${enc(id)}`),
  getBudget: (id) => request('GET', `/trips/${enc(id)}/budget`),
  saveBudget: (id, b) => request('PUT', `/trips/${enc(id)}/budget`, b),
  listExpenses: (id) => request('GET', `/trips/${enc(id)}/expenses`),
  addExpense: (id, e) => request('POST', `/trips/${enc(id)}/expenses`, e),
  updateExpense: (expenseId, e) => request('PUT', `/expenses/${enc(expenseId)}`, e),
  deleteExpense: (expenseId) => request('DELETE', `/expenses/${enc(expenseId)}`),
  getItinerary: (id) => request('GET', `/trips/${enc(id)}/itinerary`),
  saveItinerary: (id, days) => request('PUT', `/trips/${enc(id)}/itinerary`, { days }),
  getSummary: (id) => request('GET', `/trips/${enc(id)}/summary`),
  getThreshold: (id) => request('GET', `/trips/${enc(id)}/threshold`),
  exportReport: (id, format) => request('POST', `/trips/${enc(id)}/reports`, { format }),
  adminAnalytics: () => request('GET', '/admin/analytics'),
};

export default api;
