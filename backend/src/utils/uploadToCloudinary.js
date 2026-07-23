const cloudinary = require('../config/cloudinary');
const AppError = require('./AppError');

// Submissions are PDFs/Word docs, not images — resource_type 'auto' lets
// Cloudinary store them correctly without trying image-specific processing.
function uploadBuffer(buffer, { folder, filename }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: filename,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
      },
      (err, result) => {
        if (err) {
          // Cloudinary SDK errors aren't AppError instances, so without this
          // they'd fall through errorHandler.js's generic "Something went
          // wrong" 500 — technically safe, but unhelpful: the user can't
          // tell a dropped connection apart from a real server problem.
          // Log the real error for debugging, but surface something
          // actionable to the client.
          console.error('[uploadToCloudinary] upload failed:', err);
          return reject(
            new AppError(
              'File upload failed. Please check your connection and try again.',
              502 // Bad Gateway — we correctly received the request, but the upstream (Cloudinary) failed
            )
          );
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { uploadBuffer };