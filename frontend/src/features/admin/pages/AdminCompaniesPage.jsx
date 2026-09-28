import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import * as companiesApi from '../../../api/companies.api';
import '../../../styles/portalSections.css';
import './AdminCompaniesPage.css';

const EMPTY_FORM = { name: '', address: '', industrySector: '', mouStatus: 'pending', mouDate: '' };

function formatDate(value) {
  if (!value) return 'No date yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date yet';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadCompanies() {
    const res = await companiesApi.listCompanies();
    setCompanies(res.data);
  }

  useEffect(() => {
    loadCompanies().catch((err) => setError(err.message));
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editingId) {
        await companiesApi.updateCompany(editingId, form);
      } else {
        await companiesApi.createCompany(form);
      }
      resetForm();
      await loadCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(company) {
    setEditingId(company.id);
    setForm({
      name: company.name,
      address: company.address || '',
      industrySector: company.industry_sector || '',
      mouStatus: company.mou_status || 'pending',
      mouDate: company.mou_date ? String(company.mou_date).slice(0, 10) : '',
    });
  }

  return (
    <PortalLayout
      eyebrow="Registry"
      title="Companies"
      actions={
        <Link to="/admin/dashboard" className="btn btn--ghost">
          Back to dashboard
        </Link>
      }
    >
      {error && <p className="companies-error">{error}</p>}

      <div className="companies-layout">
        <section className="companies-panel">
          <h2 className="companies-panel__title">Company list</h2>
          {companies.length === 0 ? (
            <p className="companies-empty">No companies registered yet.</p>
          ) : (
            <ul className="companies-list">
              {companies.map((company) => {
                const status = company.mou_status || 'pending';
                return (
                  <li key={company.id} className="company-item">
                    <div className="company-item__head">
                      <div>
                        <div className="company-item__name">{company.name}</div>
                        <div className="company-item__sector">{company.industry_sector || 'General industry'}</div>
                      </div>
                      <button type="button" className="btn btn--ghost" onClick={() => startEdit(company)}>
                        Edit
                      </button>
                    </div>
                    <div className="company-item__address">{company.address || 'Address not set'}</div>
                    <div className="company-item__meta">
                      <span className={`company-item__mou company-item__mou--${status}`}>MOU {status}</span>
                      <span>{formatDate(company.mou_date)}</span>
                      <span>
                        {company.supervisor_count} {Number(company.supervisor_count) === 1 ? 'supervisor' : 'supervisors'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="companies-panel companies-panel--form">
          <h2 className="companies-panel__title">{editingId ? 'Edit company' : 'Add company'}</h2>
          <form onSubmit={handleSubmit} className="companies-form">
            <label className="inline-form__field">
              <span>Company name</span>
              <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
            </label>
            <label className="inline-form__field">
              <span>Address</span>
              <input value={form.address} onChange={(e) => updateField('address', e.target.value)} />
            </label>
            <label className="inline-form__field">
              <span>Industry sector</span>
              <input value={form.industrySector} onChange={(e) => updateField('industrySector', e.target.value)} />
            </label>
            <label className="inline-form__field">
              <span>MOU status</span>
              <select value={form.mouStatus} onChange={(e) => updateField('mouStatus', e.target.value)}>
                <option value="pending">Pending</option>
                <option value="signed">Signed</option>
                <option value="review">Review</option>
              </select>
            </label>
            <label className="inline-form__field">
              <span>MOU date</span>
              <input type="date" value={form.mouDate} onChange={(e) => updateField('mouDate', e.target.value)} />
            </label>
            <div className="companies-form__actions">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Update company' : 'Create company'}
              </button>
              {editingId && (
                <button type="button" className="btn btn--ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </PortalLayout>
  );
}