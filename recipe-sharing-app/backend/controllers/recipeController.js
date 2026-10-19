import mongoose from 'mongoose';
import Recipe from '../models/Recipe.js';
import { deleteUploadedFile } from '../middleware/upload.js';
import { httpError, escapeRegex } from '../utils/http.js';

// ---------- helpers ----------

// Shape sent to the frontend. Hides the raw likes/savedBy arrays and adds
// likedByMe / savedByMe for the logged-in user.
function formatRecipe(recipe, user) {
  const r = recipe.toObject();
  const userId = user?._id?.toString();
  const includesUser = (ids) => Boolean(userId) && ids.some((id) => id.toString() === userId);

  return {
    id: r._id.toString(),
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    steps: r.steps,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    imageUrl: r.imageUrl,
    aiGenerated: r.aiGenerated,
    author: { id: r.author.toString(), name: r.authorName },
    likesCount: r.likesCount,
    likedByMe: includesUser(r.likes),
    savedByMe: includesUser(r.savedBy),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// Lists arrive as real arrays (JSON requests) or as JSON strings (multipart form uploads).
function parseList(value, label) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through to the error below
    }
  }
  throw httpError(400, `${label} must be a list`);
}

// Pick only the fields a user may set. Missing fields are left out so that
// PUT can update just some of them. Mongoose validates the result on save.
function buildRecipeData(body) {
  const data = {};

  for (const field of ['title', 'description']) {
    if (body[field] !== undefined) data[field] = String(body[field]);
  }
  for (const field of ['prepTime', 'cookTime', 'servings']) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const ingredients = parseList(body.ingredients, 'Ingredients');
  if (ingredients) {
    data.ingredients = ingredients
      .filter((item) => item && String(item.name ?? '').trim())
      .map((item) => ({ name: String(item.name).trim(), quantity: String(item.quantity ?? '').trim() }));
  }

  const steps = parseList(body.steps, 'Steps');
  if (steps) {
    data.steps = steps.map((step) => String(step ?? '').trim()).filter(Boolean);
  }

  if (body.aiGenerated !== undefined) {
    data.aiGenerated = body.aiGenerated === true || body.aiGenerated === 'true';
  }
  return data;
}

async function findRecipeOr404(id) {
  const recipe = mongoose.isValidObjectId(id) ? await Recipe.findById(id) : null;
  if (!recipe) throw httpError(404, 'Recipe not found');
  return recipe;
}

async function findOwnedRecipe(id, user) {
  const recipe = await findRecipeOr404(id);
  if (recipe.author.toString() !== user._id.toString()) {
    throw httpError(403, 'You can only change your own recipes');
  }
  return recipe;
}

// ---------- handlers ----------

// GET /api/recipes?search=tomato&page=1&limit=9&sort=newest|popular
export async function getRecipes(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 50);
  const search = String(req.query.search ?? '').trim().slice(0, 100);
  const sort = req.query.sort === 'popular' ? { likesCount: -1, createdAt: -1 } : { createdAt: -1 };

  // Search matches the recipe title OR any ingredient name (case-insensitive).
  const filter = {};
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: pattern }, { 'ingredients.name': pattern }];
  }

  const [total, recipes] = await Promise.all([
    Recipe.countDocuments(filter),
    Recipe.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
  ]);

  res.json({
    recipes: recipes.map((recipe) => formatRecipe(recipe, req.user)),
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  });
}

// GET /api/recipes/:id
export async function getRecipe(req, res) {
  const recipe = await findRecipeOr404(req.params.id);
  res.json(formatRecipe(recipe, req.user));
}

// POST /api/recipes  (multipart/form-data with optional "image", or JSON)
export async function createRecipe(req, res) {
  const data = buildRecipeData(req.body ?? {});
  data.author = req.user._id;
  data.authorName = req.user.name;
  data.imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

  const recipe = await Recipe.create(data);
  res.status(201).json(formatRecipe(recipe, req.user));
}

// PUT /api/recipes/:id  (author only)
export async function updateRecipe(req, res) {
  const recipe = await findOwnedRecipe(req.params.id, req.user);
  recipe.set(buildRecipeData(req.body ?? {}));

  let oldImage = null;
  if (req.file) {
    oldImage = recipe.imageUrl;
    recipe.imageUrl = `/uploads/${req.file.filename}`;
  } else if (req.body?.removeImage === 'true' || req.body?.removeImage === true) {
    oldImage = recipe.imageUrl;
    recipe.imageUrl = '';
  }

  await recipe.save();
  deleteUploadedFile(oldImage); // only after the new data saved successfully
  res.json(formatRecipe(recipe, req.user));
}

// DELETE /api/recipes/:id  (author only)
export async function deleteRecipe(req, res) {
  const recipe = await findOwnedRecipe(req.params.id, req.user);
  await recipe.deleteOne();
  deleteUploadedFile(recipe.imageUrl);
  res.json({ message: 'Recipe deleted' });
}

// POST /api/recipes/:id/like  -> toggles. Each update is atomic, so a user
// can never appear twice in `likes`, even with rapid double clicks.
export async function toggleLike(req, res) {
  await findRecipeOr404(req.params.id);
  const userId = req.user._id;

  let liked = true;
  let recipe = await Recipe.findOneAndUpdate(
    { _id: req.params.id, likes: { $ne: userId } },
    { $addToSet: { likes: userId }, $inc: { likesCount: 1 } },
    { returnDocument: 'after' }
  );

  if (!recipe) {
    liked = false;
    recipe = await Recipe.findOneAndUpdate(
      { _id: req.params.id, likes: userId },
      { $pull: { likes: userId }, $inc: { likesCount: -1 } },
      { returnDocument: 'after' }
    );
  }
  if (!recipe) throw httpError(404, 'Recipe not found');

  res.json({ liked, likesCount: recipe.likesCount });
}

// POST /api/recipes/:id/save  -> toggles
export async function toggleSave(req, res) {
  await findRecipeOr404(req.params.id);
  const userId = req.user._id;

  let saved = true;
  let recipe = await Recipe.findOneAndUpdate(
    { _id: req.params.id, savedBy: { $ne: userId } },
    { $addToSet: { savedBy: userId } },
    { returnDocument: 'after' }
  );

  if (!recipe) {
    saved = false;
    recipe = await Recipe.findOneAndUpdate(
      { _id: req.params.id, savedBy: userId },
      { $pull: { savedBy: userId } },
      { returnDocument: 'after' }
    );
  }
  if (!recipe) throw httpError(404, 'Recipe not found');

  res.json({ saved });
}

// GET /api/recipes/saved  and  GET /api/recipes/saved/:userId
export async function getSavedRecipes(req, res) {
  if (req.params.userId && req.params.userId !== req.user.id) {
    throw httpError(403, 'You can only view your own saved recipes');
  }
  const recipes = await Recipe.find({ savedBy: req.user._id }).sort({ updatedAt: -1 });
  res.json({ recipes: recipes.map((recipe) => formatRecipe(recipe, req.user)) });
}
