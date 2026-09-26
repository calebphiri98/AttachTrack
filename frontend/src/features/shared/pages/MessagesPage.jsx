import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import ThreadList from '../components/ThreadList';
import ThreadPanel from '../components/ThreadPanel';
import * as messagesApi from '../../../api/messages.api';
import './MessagesPage.css';

export default function MessagesPage() {
  const [threads, setThreads] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // { id, name, role }

  function loadThreads() {
    messagesApi
      .listThreads()
      .then((res) => setThreads(res.data))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadThreads();
    messagesApi
      .listContacts()
      .then((res) => setContacts(res.data))
      .catch((err) => setError(err.message));
  }, []);

  const loading = threads === null || contacts === null;

  return (
    <PortalLayout eyebrow="Communication" title="Messages">
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {loading && !error && <p style={{ color: 'var(--muted)' }}>Loading messages…</p>}

      {!loading && (
        <div className="messages-page">
          <ThreadList
            threads={threads}
            contacts={contacts}
            selectedUserId={selected?.id}
            onSelect={setSelected}
          />
          <div className="messages-page__panel">
            {selected ? (
              <ThreadPanel key={selected.id} contact={selected} onSent={loadThreads} />
            ) : (
              <div className="messages-page__placeholder">
                Select a conversation, or start a new one.
              </div>
            )}
          </div>
        </div>
      )}
    </PortalLayout>
  );
}