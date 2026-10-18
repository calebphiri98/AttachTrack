import * as studentsApi from '../api/students.api';
import * as placementsApi from '../api/placements.api';
import * as logbooksApi from '../api/logbooks.api';
import * as submissionsApi from '../api/submissions.api';
import * as resultsApi from '../api/results.api';
import * as messagesApi from '../api/messages.api';
import * as attendanceApi from '../api/attendanceLog.api';
import * as assessmentsApi from '../api/assessments.api';
import * as siteVisitsApi from '../api/siteVisits.api';
import * as industrySupervisorsApi from '../api/industrySupervisors.api';
import * as universitySupervisorsApi from '../api/universitySupervisors.api';
import { getNetworkSnapshot } from './network';

const CONCURRENCY = 3;
const MIN_INTERVAL_MS = 4 * 60 * 1000;

let running = false;
let lastRunAt = 0;

async function runAll(tasks) {
  const queue = [...tasks];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      if (getNetworkSnapshot().status === 'offline') {
        queue.length = 0;
        return;
      }
      const task = queue.shift();
      try {
        await task();
      } catch {
        continue;
      }
    }
  });
  await Promise.all(workers);
}

async function safe(fn, fallback) {
  try {
    const res = await fn();
    return res && res.data !== undefined ? res.data : fallback;
  } catch {
    return fallback;
  }
}

async function prefetchStudent() {
  const profile = await safe(() => studentsApi.getMyStudentProfile(), null);
  const tasks = [
    () => placementsApi.getMyPlacement(),
    () => logbooksApi.getMyLogbook(),
    () => submissionsApi.listMine(),
    () => resultsApi.getMyResult(),
    () => messagesApi.listContacts(),
  ];
  if (profile && profile.id) {
    tasks.push(() => attendanceApi.getStudentAttendance(profile.id));
    tasks.push(() => siteVisitsApi.getSiteVisits(profile.id));
  }
  const threads = await safe(() => messagesApi.listThreads(), []);
  threads.forEach((thread) => tasks.push(() => messagesApi.getThread(thread.user_id)));
  await runAll(tasks);
}

async function prefetchIndustry() {
  const [students, attendance, assessable] = await Promise.all([
    safe(() => industrySupervisorsApi.listMyStudents(), []),
    safe(() => attendanceApi.listMyAttendanceStudents(), { students: [] }),
    safe(() => assessmentsApi.listAssessableStudents('industry'), []),
  ]);

  const tasks = [() => messagesApi.listContacts()];
  const ids = new Set();
  students.forEach((student) => ids.add(student.id));
  (attendance.students || []).forEach((student) => ids.add(student.student_id));
  assessable.forEach((student) => ids.add(student.student_id));

  ids.forEach((id) => {
    tasks.push(() => attendanceApi.getStudentAttendance(id));
    tasks.push(() => submissionsApi.listSubmissionsForStudent(id));
    tasks.push(() => logbooksApi.getStudentLogbook(id));
  });
  assessable.forEach((student) =>
    tasks.push(() => assessmentsApi.getAssessment('industry', student.student_id))
  );

  const threads = await safe(() => messagesApi.listThreads(), []);
  threads.forEach((thread) => tasks.push(() => messagesApi.getThread(thread.user_id)));
  await runAll(tasks);
}

async function prefetchUniversity() {
  const [students, assessable] = await Promise.all([
    safe(() => universitySupervisorsApi.listMyStudents(), []),
    safe(() => assessmentsApi.listAssessableStudents('university'), []),
  ]);

  const tasks = [() => messagesApi.listContacts()];
  const ids = new Set();
  students.forEach((student) => ids.add(student.id));
  assessable.forEach((student) => ids.add(student.student_id));

  ids.forEach((id) => {
    tasks.push(() => attendanceApi.getStudentAttendance(id));
    tasks.push(() => submissionsApi.listSubmissionsForStudent(id));
    tasks.push(() => logbooksApi.getStudentLogbook(id));
    tasks.push(() => siteVisitsApi.getSiteVisits(id));
  });
  assessable.forEach((student) =>
    tasks.push(() => assessmentsApi.getAssessment('university', student.student_id))
  );

  const threads = await safe(() => messagesApi.listThreads(), []);
  threads.forEach((thread) => tasks.push(() => messagesApi.getThread(thread.user_id)));
  await runAll(tasks);
}

export async function prefetchForRole(role, { force = false } = {}) {
  if (running) return;
  if (!force && Date.now() - lastRunAt < MIN_INTERVAL_MS) return;
  if (getNetworkSnapshot().status === 'offline') return;

  running = true;
  try {
    if (role === 'student') await prefetchStudent();
    if (role === 'industry_supervisor') await prefetchIndustry();
    if (role === 'university_supervisor') await prefetchUniversity();
    lastRunAt = Date.now();
  } finally {
    running = false;
  }
}

export function resetPrefetch() {
  lastRunAt = 0;
}
