const cloudinary = require('../config/cloudinary');

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
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { uploadBuffer };
