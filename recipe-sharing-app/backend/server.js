import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import recipeRoutes from './routes/recipeRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { deleteUploadedFile, MAX_UPLOAD_MESSAGE } from './middleware/upload.js';

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is missing. Copy .env.example to .env and set it.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5050;

// ---------- CORS ----------
// CLIENT_URL can hold one URL or several separated by commas, e.g.
// https://your-app.vercel.app,http://localhost:5173
// Trailing slashes are removed because browsers send origins without them.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// ---------- Middleware ----------
app.use(cors({ origin: allowedOrigins }));
// Parse JSON request bodies (req.body).
app.use(express.json({ limit: '1mb' }));
// Serve uploaded images, e.g. http://localhost:5050/uploads/abc.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- Routes ----------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/ai', aiRoutes);

// ---------- 404 + error handling ----------
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler: anything thrown in a route ends up here.
// Express 5 forwards errors from async handlers automatically.
app.use((err, req, res, next) => {
  // If the request failed after Multer saved an image, remove the orphan file.
  if (req.file) deleteUploadedFile(`/uploads/${req.file.filename}`);

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? MAX_UPLOAD_MESSAGE : err.message;
    return res.status(400).json({ message });
  }
  if (err.name === 'ValidationError') {
    // Mongoose validation: send every field message so the form can show them.
    const errors = Object.fromEntries(Object.entries(err.errors).map(([field, e]) => [field, e.message]));
    const messages = Object.values(errors);
    const message = messages.length === 1 ? messages[0] : 'Please fix the highlighted fields';
    return res.status(400).json({ message, errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for ${err.path}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'That value is already in use' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 ? 'Something went wrong on the server' : err.message });
});

// ---------- Start ----------
await connectDB();
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});