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
// ...


const app = express();

app.use(cors());
app.use(express.json());

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

// Unmatched routes
app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

app.use(errorHandler);

module.exports = app;
