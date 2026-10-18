import { useEffect, useMemo, useRef, useState } from 'react';
import StampButton from '../../../components/shared/StampButton';
import SyncChip from '../../../components/shared/SyncChip';
import { useAuth } from '../../../context/AuthContext';
import * as messagesApi from '../../../api/messages.api';
import * as actions from '../../../offline/actions';
import { useOutbox, useSyncRefresh } from '../../../offline/hooks';
import { pendingMessages, syncInfo } from '../../../offline/overlays';
import { compressImage } from '../../../offline/images';
import { discardRecord } from '../../../offline/syncEngine';

export default function ThreadPanel({ contact, onSent }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState(null);
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const outbox = useOutbox();
  const queued = useMemo(() => pendingMessages(outbox, contact.id), [outbox, contact.id]);

  function load() {
    messagesApi
      .getThread(contact.id)
      .then((res) => {
        setMessages(res.data);
        const unread = res.data.filter((m) => m.recipient_id === user.id && !m.read_at);
        if (unread.length > 0) {
          Promise.all(unread.map((m) => messagesApi.markRead(m.id).catch(() => null))).then(onSent);
        }
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    setMessages(null);
    setError('');
    load();
  }, [contact.id]);

  useSyncRefresh(() => {
    load();
    onSent();
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, queued.length]);

  async function handleFile(event) {
    const chosen = event.target.files?.[0] || null;
    setFile(chosen ? await compressImage(chosen) : null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!content.trim() && !file) {
      setError('Write a message or attach a file before sending');
      return;
    }
    setSending(true);
    try {
      const result = await actions.sendMessage({
        recipientId: contact.id,
        recipientName: contact.name,
        content: content.trim(),
        file,
      });
      setContent('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (!result.queued) {
        load();
        onSent();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="thread-panel">
      <div className="thread-panel__header">
        <span className="thread-panel__name">{contact.name}</span>
      </div>

      <div className="thread-panel__messages">
        {messages === null && !error && <p style={{ color: 'var(--muted)' }}>Loading...</p>}
        {messages && messages.length === 0 && queued.length === 0 && (
          <p className="thread-list__empty">No messages yet. Say hello.</p>
        )}
        {messages &&
          messages.map((m) => (
            <div
              key={m.id}
              className={`thread-panel__bubble${
                m.sender_id === user.id ? ' thread-panel__bubble--mine' : ''
              }`}
            >
              {m.content && <p className="thread-panel__content">{m.content}</p>}
              {m.attachment_url && (
                <a
                  href={m.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="thread-panel__attachment"
                >
                  {m.attachment_name || 'Attachment'}
                </a>
              )}
              <span className="thread-panel__time">{new Date(m.sent_at).toLocaleString()}</span>
            </div>
          ))}

        {queued.map((record) => (
          <div key={record.id} className="thread-panel__bubble thread-panel__bubble--mine">
            {record.payload.content && <p className="thread-panel__content">{record.payload.content}</p>}
            {record.files[0] && (
              <span className="thread-panel__attachment">{record.files[0].name}</span>
            )}
            <SyncChip sync={syncInfo(record)} />
            {record.status === 'failed' && (
              <button type="button" className="btn btn--ghost" onClick={() => discardRecord(record.id)}>
                Discard
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="thread-panel__composer">
        <textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Message ${contact.name}...`}
        />
        <div className="thread-panel__composer-row">
          <label className="thread-panel__attach">
            <input ref={fileInputRef} type="file" onChange={handleFile} />
            {file ? file.name : 'Attach file'}
          </label>
          <StampButton type="submit" loading={sending} style={{ width: 'auto', padding: '9px 20px' }}>
            Send
          </StampButton>
        </div>
        {error && <p className="inline-form__error">{error}</p>}
      </form>
    </div>
  );
}
