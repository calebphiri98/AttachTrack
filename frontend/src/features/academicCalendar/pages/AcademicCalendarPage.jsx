import PortalLayout from '../../../components/shared/PortalLayout';
import styles from './AcademicCalendarPage.module.css';

const CALENDAR_URL = 'https://calendar.mubas.ac.mw/';

export default function AcademicCalendarPage() {
  return (
    <PortalLayout eyebrow="Industrial supervisor" title="Academic calendar">
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="calendar-title">
          <div className={styles.kicker}><span className={styles.dot} aria-hidden="true" /> OFFICIAL UNIVERSITY RESOURCE</div>
          <h2 id="calendar-title" className={styles.title}>Plan around the MUBAS academic year.</h2>
          <p className={styles.lead}>
            View the official Malawi University of Business and Applied Sciences academic calendar
            to understand study periods, examinations, semester breaks and university reopening dates.
          </p>
          <a className={styles.primaryLink} href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
            Open the official MUBAS calendar <span aria-hidden="true">↗</span>
          </a>
          <p className={styles.source}>Source: Malawi University of Business and Applied Sciences · calendar.mubas.ac.mw</p>
        </section>

        <section className={styles.guidance} aria-label="Using the academic calendar">
          <div className={styles.sectionIntro}>
            <span className={styles.eyebrow}>SUPERVISOR GUIDE</span>
            <h3>What you can check</h3>
            <p>Use the university's published dates when discussing attachment activities and planning work with students.</p>
          </div>
          <div className={styles.cards}>
            <article className={styles.card}>
              <span className={styles.number}>01</span>
              <h4>Semester schedules</h4>
              <p>Check when academic activities are scheduled to resume so you can plan handovers and work commitments.</p>
            </article>
            <article className={styles.card}>
              <span className={styles.number}>02</span>
              <h4>Examinations and study weeks</h4>
              <p>Take scheduled study and examination periods into account when arranging attachment duties.</p>
            </article>
            <article className={styles.card}>
              <span className={styles.number}>03</span>
              <h4>Breaks and key dates</h4>
              <p>Review published academic breaks and announcements for possible changes to student availability.</p>
            </article>
          </div>
        </section>

        <section className={styles.note} aria-label="Important availability note">
          <div className={styles.noteIcon} aria-hidden="true">i</div>
          <div>
            <h3>Confirm individual availability</h3>
            <p>
              University-wide dates may differ by programme, intake or mode of study. The calendar does not
              confirm an individual student's final-semester status or permission to remain employed after attachment.
              Please confirm such arrangements with the student and the university.
            </p>
          </div>
        </section>
      </main>
    </PortalLayout>
  );
}
