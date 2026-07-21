const ROLE_LABELS = {
  student: 'Student',
  industry_supervisor: 'Industry Supervisor',
  university_supervisor: 'University Supervisor',
};

// `threads` = existing conversations (from GET /messages/threads).
// `contacts` = everyone this user is allowed to message (from GET /messages/contacts).
// Contacts who already have a thread are shown once, in the thread list —
// not duplicated further down under "Start a new conversation".
export default function ThreadList({ threads, contacts, selectedUserId, onSelect }) {
  const threadUserIds = new Set(threads.map((t) => t.user_id));
  const newContacts = contacts.filter((c) => !threadUserIds.has(c.id));

  return (
    <div className="thread-list">
      <h2 className="section-title">Conversations</h2>

      {threads.length === 0 && (
        <p className="thread-list__empty">No conversations yet — start one below.</p>
      )}

      <ul className="thread-list__items">
        {threads.map((t) => (
          <li key={t.user_id}>
            <button
              className={`thread-list__item${t.user_id === selectedUserId ? ' thread-list__item--active' : ''}`}
              onClick={() => onSelect({ id: t.user_id, name: t.name, role: t.role })}
            >
              <div className="thread-list__item-top">
                <span className="thread-list__name">{t.name}</span>
                {t.unread_count > 0 && (
                  <span className="thread-list__unread">{t.unread_count}</span>
                )}
              </div>
              <span className="thread-list__role">{ROLE_LABELS[t.role]}</span>
              {t.last_content && (
                <p className="thread-list__preview">
                  {t.last_sender_id !== t.user_id ? 'You: ' : ''}
                  {t.last_content}
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>

      {newContacts.length > 0 && (
        <>
          <div className="section-divider" />
          <h2 className="section-title">Start a new conversation</h2>
          <ul className="thread-list__items">
            {newContacts.map((c) => (
              <li key={c.id}>
                <button
                  className={`thread-list__item${c.id === selectedUserId ? ' thread-list__item--active' : ''}`}
                  onClick={() => onSelect(c)}
                >
                  <span className="thread-list__name">{c.name}</span>
                  <span className="thread-list__role">{ROLE_LABELS[c.role]}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}