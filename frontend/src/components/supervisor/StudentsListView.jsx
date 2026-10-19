import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../shared/StatusBadge';
import StudentAvatar from './StudentAvatar';
import './supervisor.tokens.css';
import styles from './StudentsListView.module.css';

function SkeletonRows() {
  return (
    <div className={styles.skeletonWrap} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={styles.skeletonRow}>
          <span className={styles.skeletonDot} />
          <span className={styles.skeletonBar} />
        </div>
      ))}
    </div>
  );
}

export default function StudentsListView({ students, error, basePath }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!students) return [];
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      `${s.name || ''} ${s.email || ''}`.toLowerCase().includes(q)
    );
  }, [students, query]);

  const statusCounts = useMemo(() => {
    const counts = {};
    (students || []).forEach((s) => {
      const key = s.link_status || 'unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts);
  }, [students]);

  return (
    <>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {students === null && !error && <SkeletonRows />}

      {students && students.length === 0 && (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>No students assigned yet</h2>
          <p className={styles.emptyText}>
            Your coordinator assigns students to supervisors. Once you are linked to a student,
            they will appear here.
          </p>
        </div>
      )}

      {students && students.length > 0 && (
        <>
          <ul className={styles.stats} aria-label="Summary">
            <li className={styles.stat}>
              <span className={styles.statValue}>{students.length}</span>
              <span className={styles.statLabel}>Total students</span>
            </li>
            {statusCounts.map(([status, count]) => (
              <li key={status} className={styles.stat}>
                <span className={styles.statValue}>{count}</span>
                <span className={styles.statLabel}>{status}</span>
              </li>
            ))}
          </ul>

          <section className={styles.panel}>
            <div className={styles.toolbar}>
              <label className={styles.search}>
                <span className={styles.srOnly}>Search students</span>
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                  <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m14 14 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search by name or email"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <p className={styles.count} aria-live="polite">
                {filtered.length} of {students.length}
              </p>
            </div>

            {filtered.length === 0 ? (
              <p className={styles.noResults}>No students match “{query}”.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Status</th>
                    <th scope="col" className={styles.actionCol}>
                      <span className={styles.srOnly}>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student) => {
                    const to = `${basePath}/${student.id}`;
                    return (
                      <tr key={student.id} className={styles.row}>
                        <td>
                          <div className={styles.person}>
                            <StudentAvatar name={student.name} email={student.email} />
                            <div className={styles.personText}>
                              <Link to={to} state={{ student }} className={styles.name}>
                                {student.name || student.email}
                              </Link>
                              {student.name && <span className={styles.email}>{student.email}</span>}
                            </div>
                          </div>
                        </td>
                        <td data-label="Status">
                          <StatusBadge>{student.link_status}</StatusBadge>
                        </td>
                        <td className={styles.actionCol}>
                          <Link to={to} state={{ student }} className={styles.viewBtn}>
                            Open profile
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </>
  );
}
