const NOTIFICATION_TYPES = [
  {
    type: 'missed_submission',
    label: 'Missed submission',
    description: 'A student did not submit a required document by its due date.',
    roles: ['university_supervisor', 'industry_supervisor'],
    defaults: { inApp: true, email: true },
  },
  {
    type: 'missed_attendance',
    label: 'Attendance not marked',
    description: 'Students you supervise have no attendance recorded for this week.',
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