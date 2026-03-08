// middleware/multerConfig.js
// Multer configuration for handling audio uploads (max 5 MB, in memory)

const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    // Accept only wav or mp3 audio
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type – only audio files are allowed'));
    }
  },
});

module.exports = upload;
