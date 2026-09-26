import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import * as companiesApi from '../../../api/companies.api';

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({ name: '', address: '', industrySector: '', mouStatus: 'pending', mouDate: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  async function loadCompanies() {
    const res = await companiesApi.listCompanies();
    setCompanies(res.data);
  }

  useEffect(() => {
    loadCompanies().catch((err) => setError(err.message));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await companiesApi.updateCompany(editingId, form);
      } else {
        await companiesApi.createCompany(form);
      }
      setForm({ name: '', address: '', industrySector: '', mouStatus: 'pending', mouDate: '' });
      setEditingId(null);
      await loadCompanies();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(company) {
    setEditingId(company.id);
    setForm({
      name: company.name,
      address: company.address || '',
      industrySector: company.industry_sector || '',
      mouStatus: company.mou_status || 'pending',
      mouDate: company.mou_date || '',
    });
  }

  return (
    <PortalLayout eyebrow="Registry" title="Companies" actions={<a href="/admin/dashboard" style={{ color: 'var(--stamp)', textDecoration: 'none' }}>Return to dashboard</a>}>
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24 }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 20, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Company list</h3>
          {companies.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No companies registered yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {companies.map((company) => (
                <li key={company.id} style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <strong>{company.name}</strong>
                      <div style={{ color: 'var(--muted)', fontSize: 12 }}>{company.industry_sector || 'General industry'}</div>
                    </div>
                    <button type="button" onClick={() => startEdit(company)} style={{ background: 'transparent', border: '1px solid var(--line)', padding: '6px 10px', borderRadius: 8 }}>Edit</button>
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>{company.address || 'Address not set'}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, marginTop: 8 }}>
                    <span>MOU: {company.mou_status || 'pending'}</span>
                    <span>{company.mou_date || 'No date yet'}</span>
                    <span>{company.supervisor_count} supervisors</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 20, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit company' : 'Add company'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Company name" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)' }} required />
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)' }} />
            <input value={form.industrySector} onChange={(e) => setForm({ ...form, industrySector: e.target.value })} placeholder="Industry sector" style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)' }} />
            <select value={form.mouStatus} onChange={(e) => setForm({ ...form, mouStatus: e.target.value })} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)' }}>
              <option value="pending">Pending</option>
              <option value="signed">Signed</option>
              <option value="review">Review</option>
            </select>
            <input type="date" value={form.mouDate} onChange={(e) => setForm({ ...form, mouDate: e.target.value })} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)' }} />
            <button type="submit" style={{ background: 'var(--stamp)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px 14px', cursor: 'pointer' }}>
              {editingId ? 'Update company' : 'Create company'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', address: '', industrySector: '', mouStatus: 'pending', mouDate: '' }); }} style={{ background: 'transparent', border: '1px solid var(--line)', borderRadius: 12, padding: '11px 14px', cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </PortalLayout>
  );
}
