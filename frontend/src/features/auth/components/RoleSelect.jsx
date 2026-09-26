import './RoleSelect.css';

const ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'industry_supervisor', label: 'Industry Supervisor' },
  { value: 'university_supervisor', label: 'University Supervisor' },
];

export default function RoleSelect({ value, onChange }) {
  return (
    <div className="role-select" role="radiogroup" aria-label="I am a">
      <span className="ledger-field__label">I am a</span>
      <div className="role-select__options">
        {ROLES.map((role) => (
          <button
            key={role.value}
            type="button"
            role="radio"
            aria-checked={value === role.value}
            className={`role-select__option${value === role.value ? ' role-select__option--active' : ''}`}
            onClick={() => onChange(role.value)}
          >
            {role.label}
          </button>
        ))}
      </div>
    </div>
  );
}
