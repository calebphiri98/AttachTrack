import { request } from './httpClient';

export function signup({ name, email, password, role }) {
  return request('/auth/signup', { method: 'POST', body: { name, email, password, role } });
}

export function verifyEmail({ email, code }) {
  return request('/auth/verify-email', { method: 'POST', body: { email, code } });
}

export function resendCode({ email }) {
  return request('/auth/resend-code', { method: 'POST', body: { email } });
}

export function login({ email, password }) {
  return request('/auth/login', { method: 'POST', body: { email, password } });
}

export function logout({ refreshToken }) {
  return request('/auth/logout', { method: 'POST', body: { refreshToken } });
}
