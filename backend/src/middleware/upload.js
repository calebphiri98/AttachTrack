const multer = require('multer');
const AppError = require('../utils/AppError');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
];

const MAX_FILE_SIZE_BYTES = 150 * 1024 * 1024; // 150MB; videos are much larger than documents

const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new AppError('Only PDF, Word, MP4, MOV, or WEBM files are accepted', 400));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

module.exports = upload;
