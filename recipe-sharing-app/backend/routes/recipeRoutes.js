import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import {
  getRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  toggleLike,
  toggleSave,
  getSavedRecipes,
} from '../controllers/recipeController.js';

const router = Router();

router.get('/', optionalAuth, getRecipes);
// requireAuth runs before Multer so files from logged-out users are never stored.
router.post('/', requireAuth, uploadImage, createRecipe);

// "/saved" must come before "/:id", otherwise "saved" would be treated as an id.
router.get('/saved', requireAuth, getSavedRecipes);
router.get('/saved/:userId', requireAuth, getSavedRecipes);

router.get('/:id', optionalAuth, getRecipe);
router.put('/:id', requireAuth, uploadImage, updateRecipe);
router.delete('/:id', requireAuth, deleteRecipe);

router.post('/:id/like', requireAuth, toggleLike);
router.post('/:id/save', requireAuth, toggleSave);

export default router;
