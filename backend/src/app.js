const express = require('express');
const cors = require('cors');

const authRoutes = require('./modules/auth/auth.routes');
const studentsRoutes = require('./modules/students/students.routes');
const industrySupervisorsRoutes = require('./modules/industrySupervisors/industrySupervisors.routes');
const universitySupervisorsRoutes = require('./modules/universitySupervisors/universitySupervisors.routes');
const submissionsRoutes = require('./modules/submissions/submissions.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const feedbackRoutes = require('./modules/feedback/feedback.routes');
const gradesRoutes = require('./modules/grades/grades.routes');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');
const messagesRoutes = require('./modules/messages/messages.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const companiesRoutes = require('./modules/companies/companies.routes');
const logbooksRoutes = require('./modules/logbooks/logbooks.routes');
const siteVisitsRoutes = require('./modules/siteVisits/siteVisits.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const { authLimiter, generalLimiter } = require('./middleware/rateLimiters');
const tempSupervisorsRoutes = require('./modules/tempSupervisors/tempSupervisors.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const cronRoutes = require('./modules/cron/cron.routes');
const placementsRoutes = require('./modules/placements/placements.routes');
const assessmentsRoutes = require('./modules/assessments/assessments.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.set('trust proxy', 1);

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'AttachTrack API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/industry-supervisors', industrySupervisorsRoutes);
app.use('/api/university-supervisors', universitySupervisorsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/logbooks', logbooksRoutes);
app.use('/api/site-visits', siteVisitsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/temp-supervisors', tempSupervisorsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/placements', placementsRoutes);
app.use('/api/assessments', assessmentsRoutes);

app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

app.use(errorHandler);

module.exports = app;