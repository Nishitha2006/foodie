import { GoogleGenAI, ApiError } from '@google/genai';
import { splitIngredients } from './recipeMatcher.js';

// Every failure in this file becomes an AiServiceError with a friendly message.
// The controller catches it and falls back to database matches.
export class AiServiceError extends Error {}

export const isAiConfigured = () => Boolean(process.env.GEMINI_API_KEY);

const model = () => process.env.GEMINI_MODEL || 'gemini-3.8-flash';

let client;
function getClient() {
  // Created lazily so the key is read after dotenv has loaded .env.
  client ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: 60_000, baseUrl: process.env.GEMINI_BASE_URL || undefined },
  });
  return client;
}

// JSON Schema the model's answer must follow (Gemini structured output).
const SUGGESTIONS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions'],
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'description', 'cuisine', 'difficulty', 'prepTime', 'cookTime', 'servings', 'ingredients', 'steps'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          cuisine: { type: 'string' },
          difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard'] },
          prepTime: { type: 'integer' },
          cookTime: { type: 'integer' },
          servings: { type: 'integer' },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'quantity'],
              properties: { name: { type: 'string' }, quantity: { type: 'string' } },
            },
          },
          steps: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You suggest home-cooking recipes based on the ingredients a person already has at home.

Rules:
- Return 3 to 5 different recipes, best match first.
- Prefer recipes that use many of the person's ingredients and need few extra ones.
- In "ingredients", list EVERY ingredient the recipe needs, with a quantity, including basics such as salt, oil, butter, water and spices. Never leave out an ingredient just because the person did not list it.
- When a recipe uses one of the person's ingredients, write its name the way the person wrote it.
- A dietary preference is a hard requirement. Follow the cuisine, difficulty and maximum total time (prepTime + cookTime) when given.
- prepTime and cookTime are whole minutes. "description" is one or two sentences.
- "steps" are clear instructions in order, without numbering.`;

function buildUserPrompt({ ingredients, cuisine, diet, difficulty, maxTime }) {
  const lines = [`Ingredients I have: ${ingredients.join(', ')}`];
  if (cuisine) lines.push(`Cuisine: ${cuisine}`);
  if (diet !== 'none') lines.push(`Dietary preference: ${diet}`);
  if (difficulty !== 'any') lines.push(`Difficulty: ${difficulty}`);
  if (maxTime) lines.push(`Maximum total time: ${maxTime} minutes`);
  return lines.join('\n');
}

function describeApiError(error) {
  if (error instanceof ApiError) {
    const { status, message = '' } = error;
    if (status === 400 && /api key/i.test(message)) return 'The Gemini API key is invalid.';
    if (status === 401 || status === 403) return 'The Gemini API key is not allowed to use this model.';
    if (status === 404) return `The Gemini model "${model()}" was not found.`;
    if (status === 429) return 'The AI service is busy (rate limit or quota reached). Try again in a minute.';
    if (status === 400) return 'The AI service rejected the request.';
    if (status >= 500) return 'The AI service is having problems right now.';
  }
  if (error?.name === 'AbortError' || error instanceof TypeError) return 'Could not reach the AI service.';
  return 'The AI service failed unexpectedly.';
}

// ---------- validation of the model's answer ----------

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const minutes = (value) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1440) : null;
};

function normalizeSuggestion(raw, userIngredients, index) {
  if (!raw || typeof raw !== 'object') return null;

  const ingredients = (Array.isArray(raw.ingredients) ? raw.ingredients : [])
    .map((i) => ({ name: text(i?.name, 60).toLowerCase(), quantity: text(i?.quantity, 40) }))
    .filter((i) => i.name);
  const steps = (Array.isArray(raw.steps) ? raw.steps : []).map((s) => text(s, 1000)).filter(Boolean);

  const suggestion = {
    id: `ai-${index}`,
    name: text(raw.name, 120),
    description: text(raw.description, 500),
    cuisine: text(raw.cuisine, 40),
    difficulty: ['Easy', 'Medium', 'Hard'].includes(raw.difficulty) ? raw.difficulty : 'Medium',
    prepTime: minutes(raw.prepTime),
    cookTime: minutes(raw.cookTime),
    servings: Math.min(Math.max(Math.round(Number(raw.servings)) || 2, 1), 100),
    steps,
    imageUrl: '',
  };

  const complete = suggestion.name && suggestion.description && steps.length && ingredients.length
    && suggestion.prepTime !== null && suggestion.cookTime !== null;
  if (!complete) return null;

  // We do NOT trust the model to say which ingredients the user has.
  // Each ingredient is checked against what the user actually typed.
  return { ...suggestion, ...splitIngredients(ingredients, userIngredients) };
}

// ---------- main entry point ----------

export async function getAiSuggestions(input) {
  let response;
  try {
    response = await getClient().models.generateContent({
      model: model(),
      contents: buildUserPrompt(input),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseJsonSchema: SUGGESTIONS_SCHEMA,
        maxOutputTokens: 16000,
      },
    });
  } catch (error) {
    console.warn('[AI] request failed:', error.status ?? '', error.message);
    throw new AiServiceError(describeApiError(error));
  }

  if (response.promptFeedback?.blockReason) throw new AiServiceError('The AI declined this request.');
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') throw new AiServiceError('The AI response was cut off.');
  if (finishReason && finishReason !== 'STOP') throw new AiServiceError('The AI declined this request.');

  let data;
  try {
    data = JSON.parse(response.text ?? '');
  } catch {
    throw new AiServiceError('The AI returned a response we could not read.');
  }

  const suggestions = (Array.isArray(data?.suggestions) ? data.suggestions : [])
    .slice(0, 5)
    .map((raw, index) => normalizeSuggestion(raw, input.ingredients, index))
    .filter(Boolean)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);

  if (!suggestions.length) throw new AiServiceError('The AI did not return any usable recipes.');
  return suggestions;
}
