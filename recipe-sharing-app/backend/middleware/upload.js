import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { httpError } from '../utils/http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const MAX_SIZE_MB = 5;

// Allowed image types -> file extension we save them with.
// The extension comes from this table, never from the user's file name.
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, unique + ALLOWED_TYPES[file.mimetype]);
  },
});

// Accepts one optional file in the form field named "image".
export const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    cb(httpError(400, 'Only JPG, PNG, WEBP or GIF images are allowed'));
  },
}).single('image');

export const MAX_UPLOAD_MESSAGE = `Image must be ${MAX_SIZE_MB} MB or smaller`;

// Delete a previously uploaded image. Ignores external URLs and missing files.
export function deleteUploadedFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
  const filePath = path.join(UPLOAD_DIR, path.basename(imageUrl));
  fs.promises.unlink(filePath).catch(() => {});
}
