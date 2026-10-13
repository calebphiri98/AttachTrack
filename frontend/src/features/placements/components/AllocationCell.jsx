import { useState } from 'react';

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--line)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontSize: 14,
};

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  color: 'var(--muted)',
};

function companyLabel(company) {
  const sector = company.industry_sector ? ` - ${company.industry_sector}` : '';
  const places =
    company.places_left === null || company.places_left === undefined
      ? 'no limit'
      : `${company.places_left} left`;
  return `${company.name}${sector} (${places})`;
}

export default function AllocationCell({ row, companies, saving, onSave, onRemove }) {
  const currentCompany = row.company_id || '';
  const currentNote = row.preference_note || '';
  const [companyId, setCompanyId] = useState(currentCompany);
  const [note, setNote] = useState(currentNote);

  const changed = companyId !== currentCompany || note !== currentNote;

  function handleSave() {
    onSave(row.student_id, { companyId, preferenceNote: note });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={fieldStyle}>
        <span>Organisation</span>
        <select
          style={selectStyle}
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          disabled={saving}
        >
          <option value="">Choose an organisation</option>
          {companies.map((company) => {
            const full = company.places_left === 0 && company.id !== currentCompany;
            return (
              <option key={company.id} value={company.id} disabled={full}>
                {companyLabel(company)}
              </option>
            );
          })}
        </select>
      </label>

      <label style={fieldStyle}>
        <span>Note (optional)</span>
        <input
          style={selectStyle}
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example, the student's preferred organisation"
          disabled={saving}
        />
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn btn--primary"
          style={{ flex: 1 }}
          onClick={handleSave}
          disabled={saving || !companyId || !changed}
        >
          {saving ? 'Saving...' : row.status === 'allocated' ? 'Update' : 'Allocate'}
        </button>
        {row.status === 'allocated' && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => onRemove(row)}
            disabled={saving}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}