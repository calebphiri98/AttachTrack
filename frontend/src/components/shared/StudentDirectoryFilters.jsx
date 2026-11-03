import { ASSIGNMENT_OPTIONS } from '../../utils/studentDirectory.mjs';
import styles from './StudentDirectoryFilters.module.css';

export default function StudentDirectoryFilters({ query, onQueryChange, assignment, onAssignmentChange, sort, onSortChange, count, total, label = 'Student directory' }) {
  const reset = () => { onQueryChange(''); onAssignmentChange('all'); onSortChange('name'); };
  return (
    <section className={styles.wrap} aria-label={label}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>Search students</span>
          <input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Name, email, supervisor or company" />
        </label>
        <label className={styles.field}>
          <span>Supervisor assignment</span>
          <select value={assignment} onChange={(event) => onAssignmentChange(event.target.value)}>
            {ASSIGNMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>Sort by</span>
          <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
            <option value="name">Student name (A–Z)</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <button type="button" className={styles.clear} onClick={reset} disabled={!query && assignment === 'all' && sort === 'name'}>Clear</button>
      </div>
      <p className={styles.count} aria-live="polite">Showing {count} of {total} students</p>
    </section>
  );
}
