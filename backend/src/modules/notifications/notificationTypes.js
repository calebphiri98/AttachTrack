const NOTIFICATION_TYPES = [
  {
    type: 'logbook_submitted',
    label: 'Logbook entries submitted',
    description: 'A student submitted logbook entries for your review.',
    roles: ['industry_supervisor'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'logbook_reviewed',
    label: 'Logbook reviewed',
    description: 'Your industrial supervisor approved or returned your logbook entries.',
    roles: ['student'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'results_ready',
    label: 'Results ready for approval',
    description: 'The Coordinator sent compiled results for your approval.',
    roles: ['hod'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'assessment_reminder',
    label: 'Assessment reminder',
    description: 'The Coordinator asked you to complete a pending student assessment.',
    roles: ['industry_supervisor', 'university_supervisor'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'assessment_submitted',
    label: 'Assessment submitted',
    description: 'An industrial supervisor submitted an assessment for a student.',
    roles: ['university_supervisor', 'admin'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'placement_confirmed',
    label: 'Placement confirmed',
    description: 'The Head of Department confirmed an attachment placement.',
    roles: ['student', 'industry_supervisor', 'university_supervisor'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'new_message',
    label: 'New message',
    description: 'Someone sent you a message.',
    roles: ['student', 'industry_supervisor', 'university_supervisor'],
    defaults: { inApp: true, email: false },
  },
  {
    type: 'submission_received',
    label: 'Submission received',
    description: 'A student submitted a document addressed to you.',
    roles: ['university_supervisor', 'industry_supervisor'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'submission_requested',
    label: 'Submission requested',
    description: 'Your supervisor asked you to submit a document by a due date.',
    roles: ['student'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'submission_reopened',
    label: 'Submission reopened',
    description: 'Your supervisor reopened a submission that was past its due date.',
    roles: ['student'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'missed_submission',
    label: 'Missed submission',
    description: 'A student did not submit a required document by its due date.',
    roles: ['university_supervisor', 'industry_supervisor'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'missed_attendance',
    label: 'Attendance not recorded',
    description: 'Students you supervise have had no attendance recorded for several days.',
    roles: ['industry_supervisor'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'feedback_received',
    label: 'New feedback',
    description: 'Your industry supervisor left new feedback for you.',
    roles: ['student'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'result_released',
    label: 'Final result released',
    description: 'Your end-of-semester attachment result is available.',
    roles: ['student'],
    defaults: { inApp: true, email: true },
  },
];

function findType(type) {
  return NOTIFICATION_TYPES.find((entry) => entry.type === type) || null;
}

function typesForRole(role) {
  return NOTIFICATION_TYPES.filter((entry) => entry.roles.includes(role));
}

module.exports = { NOTIFICATION_TYPES, findType, typesForRole };