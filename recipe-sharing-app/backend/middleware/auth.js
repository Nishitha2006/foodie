import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Reads "Authorization: Bearer <token>" and returns the matching user, or null.
async function userFromRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    return await User.findById(payload.id);
  } catch {
    return null; // invalid or expired token
  }
}

// Route needs a logged-in user. Sets req.user or responds 401.
export async function requireAuth(req, res, next) {
  const user = await userFromRequest(req);
  if (!user) {
    return res.status(401).json({ message: 'Please log in to continue' });
  }
  req.user = user;
  next();
}

// Route works for everyone, but knows who you are if you are logged in
// (used to show whether you already liked/saved a recipe).
export async function optionalAuth(req, res, next) {
  req.user = await userFromRequest(req);
  next();
}
