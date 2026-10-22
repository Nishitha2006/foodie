import { Router } from 'express';
import { rateLimit } from '../middleware/rateLimit.js';
import { getRecipeSuggestions } from '../controllers/aiController.js';

const router = Router();

// Each AI call costs money, so limit it: 10 requests per IP per minute.
const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: 'Too many recipe searches.' });

router.post('/recipe-suggestions', aiLimiter, getRecipeSuggestions);

export default router;
