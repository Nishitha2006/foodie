import Recipe from '../models/Recipe.js';
import { escapeRegex } from '../utils/http.js';

// ---------- ingredient matching (used by both the AI service and the DB fallback) ----------

// Very small "singular" helper so "tomatoes" matches "tomato" and "eggs" matches "egg".
function singular(word) {
  if (word.length <= 3 || word.endsWith('ss')) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (/(oes|ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function words(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singular);
}

// True when one name contains all the words of the other.
// "tomato" ~ "cherry tomatoes", "cheddar cheese" ~ "cheese", but "oil" !~ "boiled egg".
export function ingredientMatches(userIngredient, recipeIngredient) {
  const a = words(userIngredient);
  const b = words(recipeIngredient);
  if (!a.length || !b.length) return false;
  return a.every((w) => b.includes(w)) || b.every((w) => a.includes(w));
}

// Split a recipe's ingredients into the ones the user has and the ones they still need.
export function splitIngredients(recipeIngredients, userIngredients) {
  const availableIngredients = [];
  const missingIngredients = [];
  for (const ingredient of recipeIngredients) {
    const hasIt = userIngredients.some((mine) => ingredientMatches(mine, ingredient.name));
    (hasIt ? availableIngredients : missingIngredients).push(ingredient);
  }
  const total = recipeIngredients.length || 1;
  const matchPercentage = Math.round((availableIngredients.length / total) * 100);
  return { availableIngredients, missingIngredients, matchPercentage };
}

function difficultyFromTime(totalMinutes) {
  if (totalMinutes <= 25) return 'Easy';
  if (totalMinutes <= 60) return 'Medium';
  return 'Hard';
}

// ---------- database fallback ----------

// Finds community recipes that use the user's ingredients. Used when the AI is
// not configured or fails. These are real recipes from MongoDB, not AI output.
export async function findDatabaseMatches({ ingredients, maxTime, difficulty }) {
  const searchWords = [...new Set(ingredients.flatMap(words))];
  if (!searchWords.length) return [];

  const candidates = await Recipe.find({
    'ingredients.name': { $in: searchWords.map((w) => new RegExp(escapeRegex(w), 'i')) },
  }).limit(200);

  return candidates
    .map((recipe) => {
      const recipeIngredients = recipe.ingredients.map((i) => ({ name: i.name, quantity: i.quantity }));
      const totalTime = recipe.prepTime + recipe.cookTime;
      return {
        id: recipe._id.toString(),
        recipeId: recipe._id.toString(),
        name: recipe.title,
        description: recipe.description,
        imageUrl: recipe.imageUrl,
        author: recipe.authorName,
        cuisine: '',
        difficulty: difficultyFromTime(totalTime),
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        steps: recipe.steps,
        ...splitIngredients(recipeIngredients, ingredients),
      };
    })
    .filter((s) => s.availableIngredients.length > 0)
    .filter((s) => !maxTime || s.prepTime + s.cookTime <= maxTime)
    .filter((s) => difficulty === 'any' || s.difficulty === difficulty)
    .sort((a, b) => b.matchPercentage - a.matchPercentage || a.missingIngredients.length - b.missingIngredients.length)
    .slice(0, 5);
}
