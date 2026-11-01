import { useCallback, useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import { useAuth } from '../../../context/AuthContext';
import * as api from '../../../api/announcements.api';
import styles from './AnnouncementsPage.module.css';

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function AnnouncementReplies({ announcementId }) {
  const [items, setItems] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.listReplies(announcementId).then((response) => { setItems(response.data); setError(''); }).catch((err) => setError(err.message));
  }, [announcementId]);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await api.postReply(announcementId, text.trim());
      setText('');
      load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <section className={styles.replies} aria-label="Announcement replies">
    <div className={styles.replyHeader}><h3>Discussion</h3><button type="button" onClick={load} className={styles.textButton}>Refresh</button></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {items === null && !error && <p className={styles.hint}>Loading replies…</p>}
    {items?.length === 0 && <p className={styles.hint}>No replies yet. Start the discussion.</p>}
    {items?.map((item) => <article className={styles.reply} key={item.id}>
      <div className={styles.replyMeta}><strong>{item.author_name}</strong><span>{item.author_role?.replaceAll('_', ' ')} · {formatDate(item.created_at)}</span></div>
      <p>{item.body}</p>
    </article>)}
    <form onSubmit={submit} className={styles.replyForm}>
      <label htmlFor={`reply-${announcementId}`}>Your reply</label>
      <textarea id={`reply-${announcementId}`} maxLength={2000} rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a respectful reply…" required />
      <button className={styles.primaryButton} disabled={busy || !text.trim()}>{busy ? 'Posting…' : 'Post reply'}</button>
    </form>
  </section>;
}

export function AnnouncementCard({ announcement }) {
  const [expanded, setExpanded] = useState(false);
  return <article className={styles.announcement}>
    <div className={styles.announcementMeta}><span>{announcement.author_name || 'Coordinator'}</span><span>{formatDate(announcement.created_at)}</span></div>
    <h2>{announcement.title}</h2>
    <p className={styles.body}>{announcement.body}</p>
    <div className={styles.announcementFoot}><span className={styles.audience}>{announcement.audience === 'all' ? 'Everyone' : announcement.audience === 'students' ? 'Students' : 'Supervisors'}</span>
      <button type="button" className={styles.textButton} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Close discussion' : `Replies (${announcement.reply_count || 0})`}</button>
    </div>
    {expanded && <AnnouncementReplies announcementId={announcement.id} />}
  </article>;
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.listAnnouncements().then((response) => { setItems(response.data); setError(''); }).catch((err) => setError(err.message));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function publish(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.createAnnouncement({ title: title.trim(), body: body.trim(), audience });
      setTitle(''); setBody(''); setAudience('all'); load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return <PortalLayout eyebrow="Communication" title="Announcements">
    <div className={styles.intro}><p>Official updates and discussion for students and supervisors.</p><button type="button" onClick={load} className={styles.secondaryButton}>Refresh updates</button></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {user?.role === 'admin' && <form className={styles.compose} onSubmit={publish}>
      <h2>Publish an announcement</h2>
      <label htmlFor="announcement-title">Title</label><input id="announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} required placeholder="Announcement subject" />
      <label htmlFor="announcement-audience">Who should see this?</label><select id="announcement-audience" value={audience} onChange={(event) => setAudience(event.target.value)}><option value="all">All students and supervisors</option><option value="students">Students only</option><option value="supervisors">Supervisors only</option></select>
      <label htmlFor="announcement-body">Message</label><textarea id="announcement-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={5} required placeholder="Write your announcement…" />
      <div className={styles.formActions}><span>{body.length}/5000</span><button type="submit" className={styles.primaryButton} disabled={busy || !title.trim() || !body.trim()}>{busy ? 'Publishing…' : 'Publish announcement'}</button></div>
    </form>}
    <section className={styles.feed} aria-label="Announcements feed"><div className={styles.feedHeader}><h2>Latest announcements</h2><span>{items?.length ?? '—'} updates</span></div>
      {items === null && !error && <p className={styles.hint}>Loading announcements…</p>}
      {items?.length === 0 && <p className={styles.empty}>No announcements have been posted yet.</p>}
      {items?.map((item) => <AnnouncementCard key={item.id} announcement={item} />)}
    </section>
  </PortalLayout>;
}
