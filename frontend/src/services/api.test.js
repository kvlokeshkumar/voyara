import { api, setUnauthorizedHandler } from './api';

jest.mock('../auth/cognito', () => ({ getIdToken: jest.fn() }));
jest.mock('../config', () => ({ __esModule: true, default: { apiUrl: 'https://api.test', userPoolId: 'p', clientId: 'c' }, isConfigured: () => true }));

const { getIdToken } = require('../auth/cognito');

beforeEach(() => {
  global.fetch = jest.fn();
  getIdToken.mockReset();
  setUnauthorizedHandler(null);
});

test('sends the Cognito ID token as a bearer header and parses JSON', async () => {
  getIdToken.mockResolvedValue('tok123');
  global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: 1 }] });
  await expect(api.listTrips()).resolves.toEqual([{ id: 1 }]);
  const [url, opts] = global.fetch.mock.calls[0];
  expect(url).toBe('https://api.test/trips');
  expect(opts.headers.Authorization).toBe('Bearer tok123');
});

test('never sends a user id; body is passed through unchanged', async () => {
  getIdToken.mockResolvedValue('t');
  global.fetch.mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: 5 }) });
  await api.createTrip({ from: 'A', to: 'B' });
  expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ from: 'A', to: 'B' });
});

test('missing session triggers the unauthorized handler without calling the API', async () => {
  getIdToken.mockResolvedValue(null);
  const handler = jest.fn();
  setUnauthorizedHandler(handler);
  await expect(api.listTrips()).rejects.toMatchObject({ status: 401 });
  expect(handler).toHaveBeenCalled();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('401 from the server triggers the handler', async () => {
  getIdToken.mockResolvedValue('expired');
  global.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
  const handler = jest.fn();
  setUnauthorizedHandler(handler);
  await expect(api.getTrip(1)).rejects.toMatchObject({ status: 401 });
  expect(handler).toHaveBeenCalled();
});

test('structured API errors are surfaced', async () => {
  getIdToken.mockResolvedValue('t');
  global.fetch.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { code: 'validation_error', message: 'amount must be a number', field: 'amount' } }) });
  await expect(api.addExpense(1, {})).rejects.toMatchObject({ status: 400, code: 'validation_error', field: 'amount', message: 'amount must be a number' });
});

test('204 returns null and network failure gives a friendly error', async () => {
  getIdToken.mockResolvedValue('t');
  global.fetch.mockResolvedValueOnce({ ok: true, status: 204 });
  await expect(api.deleteTrip(3)).resolves.toBeNull();
  global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(api.listTrips()).rejects.toMatchObject({ code: 'network_error' });
});
