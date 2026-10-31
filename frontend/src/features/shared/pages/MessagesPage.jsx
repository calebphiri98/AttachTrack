import { useEffect, useMemo, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import ThreadList from '../components/ThreadList';
import ThreadPanel from '../components/ThreadPanel';
import { useAuth } from '../../../context/AuthContext';
import * as messagesApi from '../../../api/messages.api';
import { useSyncRefresh } from '../../../offline/hooks';
import './MessagesPage.css';

export default function MessagesPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState(null);
  const [contacts, setContacts] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const isSupervisor =
    user?.role === 'industry_supervisor' ||
    user?.role === 'university_supervisor';

  function loadThreads() {
    messagesApi
      .listThreads()
      .then((res) => setThreads(res.data))
      .catch((err) => setError(err.message));
  }

  function loadContacts() {
    messagesApi
      .listContacts()
      .then((res) => setContacts(res.data))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    setThreads(null);
    setContacts(null);
    setSelected(null);
    setError('');
    loadThreads();
    loadContacts();
  }, [user?.id]);

  useSyncRefresh(() => {
    loadThreads();
    loadContacts();
  });

  const allowedContactIds = useMemo(() => {
    return new Set((contacts || []).map((contact) => String(contact.id)));
  }, [contacts]);

  const visibleThreads = useMemo(() => {
    if (!threads) return [];

    if (!isSupervisor || contacts === null) {
      return threads;
    }

    return threads.filter((thread) =>
      allowedContactIds.has(String(thread.user_id))
    );
  }, [threads, contacts, isSupervisor, allowedContactIds]);

  const visibleContacts = useMemo(() => {
    if (!contacts) return [];

    return contacts.filter((contact) =>
      String(contact.id) !== String(user?.id)
    );
  }, [contacts, user?.id]);

  useEffect(() => {
    if (!isSupervisor || !selected || contacts === null) return;

    if (!allowedContactIds.has(String(selected.id))) {
      setSelected(null);
    }
  }, [isSupervisor, selected, contacts, allowedContactIds]);

  const loading = threads === null || contacts === null;

  return (
    <PortalLayout eyebrow="Communication" title="Messages">
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      {loading && !error && (
        <p style={{ color: 'var(--muted)' }}>Loading messages...</p>
      )}

      {!loading && (
        <div className="messages-page">
          <ThreadList
            threads={visibleThreads}
            contacts={visibleContacts}
            selectedUserId={selected?.id}
            onSelect={setSelected}
          />

          <div className="messages-page__panel">
            {selected ? (
              <ThreadPanel
                key={selected.id}
                contact={selected}
                onSent={loadThreads}
              />
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
