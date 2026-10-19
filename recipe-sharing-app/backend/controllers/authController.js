import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { httpError } from '../utils/http.js';

function signToken(user) {
  return jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/register  { name, email, password }
export async function register(req, res) {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    throw httpError(400, 'Name, email and password are required');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    throw httpError(409, 'An account with this email already exists');
  }

  const user = await User.create({
    name: String(name),
    email: normalizedEmail,
    password: String(password),
  });

  res.status(201).json({ token: signToken(user), user });
}

// POST /api/auth/login  { email, password }
export async function login(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    throw httpError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(String(password)))) {
    throw httpError(401, 'Invalid email or password');
  }

  res.json({ token: signToken(user), user });
}

// GET /api/auth/me  (requires token)
export async function getMe(req, res) {
  res.json({ user: req.user });
}
