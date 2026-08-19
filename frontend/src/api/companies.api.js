import { request } from './httpClient';

export function listCompanies() {
  return request('/companies');
}

export function createCompany(payload) {
  return request('/companies', { method: 'POST', body: payload });
}

export function updateCompany(companyId, payload) {
  return request(`/companies/${companyId}`, { method: 'PATCH', body: payload });
}

export function assignMyCompany(companyId) {
  return request('/companies/me/company', { method: 'PATCH', body: { companyId } });
}
