import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import { Card } from '../../../components/shared/Card';
import * as notificationsApi from '../../../api/notifications.api';
import '../../../styles/portalSections.css';
import './NotificationSettingsPage.css';

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    notificationsApi
      .getNotificationPreferences()
      .then((res) => setPrefs(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(type, channel) {
    const current = prefs.find((pref) => pref.type === type);
    if (!current) return;

    const next = { ...current, [channel]: !current[channel] };
    setPrefs((prev) => prev.map((pref) => (pref.type === type ? next : pref)));
    setError('');
    setStatus('Saving...');

    try {
      await notificationsApi.saveNotificationPreferences([
        { type, inApp: next.inApp, email: next.email },
      ]);
      setStatus('Saved');
    } catch (err) {
      setPrefs((prev) => prev.map((pref) => (pref.type === type ? current : pref)));
      setStatus('');
      setError(err.message);
    }
  }

  async function handleReset() {
    if (!window.confirm('Reset all notification options to their defaults?')) return;

    const updates = prefs.map((pref) => ({
      type: pref.type,
      inApp: pref.defaults.inApp,
      email: pref.defaults.email,
    }));

    setError('');
    setStatus('Saving...');

    try {
      const res = await notificationsApi.saveNotificationPreferences(updates);
      setPrefs(res.data);
      setStatus('Saved');
    } catch (err) {
      setStatus('');
      setError(err.message);
    }
  }

  return (
    <PortalLayout
      eyebrow="Settings"
      title="Notifications"
      actions={
        <button
          type="button"
          className="btn btn--ghost"
          onClick={handleReset}
          disabled={loading || prefs.length === 0}
        >
          Reset to defaults
        </button>
      }
    >
      {error && <p className="notif-settings__error">{error}</p>}

      <Card>
        <h2 className="section-title">Choose what you receive</h2>
        <p className="notif-settings__hint">
          In-app notifications appear under the bell. Email goes to the address on your account.
          Account emails such as password resets are always sent.
        </p>

        {loading && <p className="notif-settings__empty">Loading...</p>}

        {!loading && prefs.length === 0 && !error && (
          <p className="notif-settings__empty">There are no notification options for your role yet.</p>
        )}

        {prefs.length > 0 && (
          <div className="notif-settings__table">
            <div className="notif-settings__row notif-settings__row--head">
              <span>Event</span>
              <span className="notif-settings__channel">In-app</span>
              <span className="notif-settings__channel">Email</span>
            </div>

            {prefs.map((pref) => (
              <div key={pref.type} className="notif-settings__row">
                <div className="notif-settings__text">
                  <div className="notif-settings__label">{pref.label}</div>
                  <div className="notif-settings__desc">{pref.description}</div>
                </div>

                <label className="notif-switch notif-settings__channel">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={pref.inApp}
                    onChange={() => handleToggle(pref.type, 'inApp')}
                    aria-label={`${pref.label}: in-app`}
                  />
                  <span className="notif-switch__track" />
                </label>

                <label className="notif-switch notif-settings__channel">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={pref.email}
                    onChange={() => handleToggle(pref.type, 'email')}
                    aria-label={`${pref.label}: email`}
                  />
                  <span className="notif-switch__track" />
                </label>
              </div>
            ))}
          </div>
        )}

        <p className="notif-settings__status" aria-live="polite">
          {status}
        </p>
      </Card>
    </PortalLayout>
  );
}