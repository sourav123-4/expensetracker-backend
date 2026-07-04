import multer from 'multer';
import { ApiError } from '../utils/ApiError';

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

/** In-memory upload (buffer streamed straight to Cloudinary, never written to disk). */
export const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RECEIPT_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(ApiError.badRequest('Only JPEG, PNG, WEBP, or HEIC images are allowed'));
    }
    cb(null, true);
  },
});
