import { useEffect, useRef, useState } from 'react';
import StampButton from '../../../components/shared/StampButton';
import { useAuth } from '../../../context/AuthContext';
import * as messagesApi from '../../../api/messages.api';

export default function ThreadPanel({ contact, onSent }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState(null);
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  function load() {
    messagesApi
      .getThread(contact.id)
      .then((res) => {
        setMessages(res.data);
        // Mark any unread messages sent to me as read, then refresh the
        // thread list so the unread badge/preview stays in sync.
        const unread = res.data.filter((m) => m.recipient_id === user.id && !m.read_at);
        if (unread.length > 0) {
          Promise.all(unread.map((m) => messagesApi.markRead(m.id))).then(onSent);
        }
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    setMessages(null);
    setError('');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!content.trim() && !file) {
      setError('Write a message or attach a file before sending');
      return;
    }
    setSending(true);
    try {
      await messagesApi.sendMessage({ recipientId: contact.id, content: content.trim(), file });
      setContent('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
      onSent();
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
        {messages === null && !error && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
        {messages && messages.length === 0 && (
          <p className="thread-list__empty">No messages yet — say hello.</p>
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
                
                 < a href={m.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="thread-panel__attachment"
                >
                  📎 {m.attachment_name || 'Attachment'}
                </a>
              )}
              <span className="thread-panel__time">
                {new Date(m.sent_at).toLocaleString()}
              </span>
            </div>
          ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="thread-panel__composer">
        <textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Message ${contact.name}…`}
        />
        <div className="thread-panel__composer-row">
          <label className="thread-panel__attach">
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setFile(e.target.files[0] || null)}
            />
            {file ? file.name : '📎 Attach file'}
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