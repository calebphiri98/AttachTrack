import { useState } from 'react';

function visibleOptions(options, currentId) {
  return options.filter((option) => option.is_active || option.id === currentId);
}

function industryLabel(option) {
  const base = `${option.name} - ${option.organisation || 'No company'}`;
  return option.is_active ? base : `${base} (deactivated)`;
}

function universityLabel(option) {
  const base = `${option.name} - ${option.department || 'No department'}`;
  return option.is_active ? base : `${base} (deactivated)`;
}

export default function AssignmentCell({
  student,
  industrySupervisors,
  universitySupervisors,
  saving,
  onSave,
}) {
  const currentIndustry = student.industry_supervisor_id || '';
  const currentUniversity = student.university_supervisor_id || '';
  const [industryId, setIndustryId] = useState(currentIndustry);
  const [universityId, setUniversityId] = useState(currentUniversity);

  const changed = industryId !== currentIndustry || universityId !== currentUniversity;
  const hasAny = Boolean(industryId || universityId);

  function handleSave() {
    onSave(student.id, {
      industrySupervisorId: industryId || null,
      universitySupervisorId: universityId || null,
    });
  }

  return (
    <div className="admin-assign">
      <label className="admin-assign__field">
        <span>Industry supervisor</span>
        <select value={industryId} onChange={(e) => setIndustryId(e.target.value)} disabled={saving}>
          <option value="">No industry supervisor</option>
          {visibleOptions(industrySupervisors, currentIndustry).map((option) => (
            <option key={option.id} value={option.id}>
              {industryLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-assign__field">
        <span>University supervisor</span>
        <select value={universityId} onChange={(e) => setUniversityId(e.target.value)} disabled={saving}>
          <option value="">No university supervisor</option>
          {visibleOptions(universitySupervisors, currentUniversity).map((option) => (
            <option key={option.id} value={option.id}>
              {universityLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className="btn btn--primary btn--block"
        onClick={handleSave}
        disabled={saving || !changed || !hasAny}
        title={!hasAny ? 'Choose at least one supervisor' : undefined}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}