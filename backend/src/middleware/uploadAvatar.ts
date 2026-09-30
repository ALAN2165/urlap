import multer from 'multer';

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Only PNG, JPEG, WEBP or GIF images are allowed.'));
    }
    cb(null, true);
  },
}).single('avatar');