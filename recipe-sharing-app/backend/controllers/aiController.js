import { getAiSuggestions, isAiConfigured, AiServiceError } from '../services/aiService.js';
import { findDatabaseMatches } from '../services/recipeMatcher.js';
import { httpError } from '../utils/http.js';

export const DIETS = ['none', 'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'high-protein'];
export const DIFFICULTIES = ['any', 'Easy', 'Medium', 'Hard'];

function validateInput(body) {
  if (!Array.isArray(body?.ingredients)) {
    throw httpError(400, 'Send ingredients as a list, for example ["eggs", "rice"]');
  }

  const ingredients = [
    ...new Set(body.ingredients.map((i) => String(i ?? '').trim().toLowerCase()).filter(Boolean)),
  ];
  if (ingredients.length === 0) throw httpError(400, 'Add at least one ingredient');
  if (ingredients.length > 20) throw httpError(400, 'Please use 20 ingredients or fewer');
  if (ingredients.some((i) => i.length > 40)) throw httpError(400, 'Each ingredient must be 40 characters or fewer');

  const maxTime = Number(body.maxTime);
  return {
    ingredients,
    cuisine: String(body.cuisine ?? '').trim().slice(0, 40),
    diet: DIETS.includes(body.diet) ? body.diet : 'none',
    difficulty: DIFFICULTIES.includes(body.difficulty) ? body.difficulty : 'any',
    maxTime: Number.isFinite(maxTime) && maxTime > 0 ? Math.min(Math.round(maxTime), 600) : null,
  };
}

// POST /api/ai/recipe-suggestions
// { ingredients: string[], cuisine?, diet?, difficulty?, maxTime? }
// -> { source: 'ai' | 'database', notice?, suggestions: [...] }
export async function getRecipeSuggestions(req, res) {
  const input = validateInput(req.body);

  let reason;
  if (isAiConfigured()) {
    try {
      const suggestions = await getAiSuggestions(input);
      return res.json({ source: 'ai', suggestions });
    } catch (error) {
      if (!(error instanceof AiServiceError)) throw error;
      reason = error.message;
    }
  } else {
    reason = 'AI suggestions are not set up on this server (GEMINI_API_KEY is missing).';
  }

  // Fallback: real recipes from the database, clearly labelled as such.
  const suggestions = await findDatabaseMatches(input);
  res.json({
    source: 'database',
    notice: `${reason} Showing community recipes that match your ingredients instead.`,
    suggestions,
  });
}
