import { useState } from 'react';
import styles from './AllocationCell.module.css';



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
    <div className={styles.root}>
      <label className={styles.field}>
        <span>Organisation</span>
        <select
          className={styles.input}
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

      <label className={styles.field}>
        <span>Note (optional)</span>
        <input
          className={styles.input}
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          placeholder="For example, the student's preferred organisation"
          disabled={saving}
        />
      </label>

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn--primary"

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
