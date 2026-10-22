import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { aiApi, recipeApi, getErrorMessage } from '../services/api';
import { formatMinutes } from '../services/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RecipeImage from '../components/RecipeImage';
import Icon from '../components/Icon';
import { ErrorState } from '../components/Status';

const QUICK_ADD = ['eggs', 'potatoes', 'onions', 'tomatoes', 'rice', 'cheese', 'chicken', 'garlic', 'pasta', 'spinach'];
const CUISINES = ['Any', 'Italian', 'Indian', 'Mexican', 'Chinese', 'Thai', 'Japanese', 'Mediterranean', 'Middle Eastern', 'American', 'French'];
const DIETS = [
  ['none', 'No preference'],
  ['vegetarian', 'Vegetarian'],
  ['vegan', 'Vegan'],
  ['gluten-free', 'Gluten-free'],
  ['dairy-free', 'Dairy-free'],
  ['keto', 'Keto'],
  ['high-protein', 'High protein'],
];
const TIMES = [
  ['', 'Any time'],
  ['15', '15 minutes'],
  ['30', '30 minutes'],
  ['45', '45 minutes'],
  ['60', '1 hour'],
  ['90', '1.5 hours'],
];
const DIFFICULTIES = ['any', 'Easy', 'Medium', 'Hard'];
const MAX_INGREDIENTS = 20;

// Keep the search across a login redirect (sessionStorage = this tab only).
const STORAGE_KEY = 'ai-finder-state';
function loadSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function SuggestionCard({ suggestion: s, source }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [savedId, setSavedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const isAi = source === 'ai';

  // Turn an AI suggestion into a real recipe in the user's account and save it.
  const handleSave = async () => {
    if (!user) {
      toast.info('Log in to save recipes');
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setSaving(true);
    try {
      const recipe = await recipeApi.create({
        title: s.name,
        description: s.description,
        ingredients: [...s.availableIngredients, ...s.missingIngredients],
        steps: s.steps,
        prepTime: s.prepTime,
        cookTime: s.cookTime,
        servings: s.servings,
        aiGenerated: true,
      });
      await recipeApi.toggleSave(recipe.id);
      setSavedId(recipe.id);
      toast.success(`"${s.name}" was added to your saved recipes`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="suggestion">
      <div className="suggestion-media">
        <RecipeImage src={s.imageUrl} alt={s.name} />
      </div>
      <div className="suggestion-body">
        <div className="suggestion-top">
          <div>
            <h3>{s.name}</h3>
            {!isAi && s.author && <p className="hint">Community recipe by {s.author}</p>}
          </div>
          <div className="match" aria-label={`${s.matchPercentage}% ingredient match`}>
            <span className="match-value">{s.matchPercentage}%</span>
            <span className="match-label">ingredient match</span>
            <div className="match-bar">
              <span style={{ width: `${s.matchPercentage}%` }} />
            </div>
          </div>
        </div>

        <p className="suggestion-desc">{s.description}</p>

        <div className="meta-row">
          <span className="pill"><Icon name="clock" size={14} /> Prep {formatMinutes(s.prepTime)}</span>
          <span className="pill"><Icon name="clock" size={14} /> Cook {formatMinutes(s.cookTime)}</span>
          <span className="pill"><Icon name="flame" size={14} /> {s.difficulty}</span>
          <span className="pill"><Icon name="users" size={14} /> Serves {s.servings}</span>
          {s.cuisine && <span className="pill">{s.cuisine}</span>}
        </div>

        <div className="ingredient-columns">
          <div className="ing-box have">
            <h4><Icon name="check" size={16} /> You have ({s.availableIngredients.length})</h4>
            <ul>
              {s.availableIngredients.map((i) => (
                <li key={i.name}>
                  {i.name}
                  {i.quantity && <span className="qty-inline"> · {i.quantity}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="ing-box need">
            <h4><Icon name="cart" size={16} /> You also need ({s.missingIngredients.length})</h4>
            {s.missingIngredients.length ? (
              <ul>
                {s.missingIngredients.map((i) => (
                  <li key={i.name}>
                    {i.name}
                    {i.quantity && <span className="qty-inline"> · {i.quantity}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nothing else — you have every ingredient.</p>
            )}
          </div>
        </div>

        <details className="steps-toggle">
          <summary>Show {s.steps.length} cooking steps</summary>
          <ol className="ai-steps">
            {s.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </details>

        <div className="suggestion-actions">
          {!isAi ? (
            <Link to={`/recipes/${s.recipeId}`} className="btn btn-primary">
              View full recipe
            </Link>
          ) : savedId ? (
            <Link to={`/recipes/${savedId}`} className="btn btn-primary">
              <Icon name="check" /> Saved · view recipe
            </Link>
          ) : (
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Icon name="bookmark" /> {saving ? 'Saving…' : 'Save to my recipes'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AiFinder() {
  const toast = useToast();
  const [saved] = useState(loadSaved);
  const [ingredients, setIngredients] = useState(saved.ingredients || []);
  const [input, setInput] = useState('');
  const [prefs, setPrefs] = useState(saved.prefs || { cuisine: 'Any', diet: 'none', maxTime: '', difficulty: 'any' });
  const [result, setResult] = useState(saved.result || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ingredients, prefs, result }));
    } catch {
      // storage unavailable: nothing to persist
    }
  }, [ingredients, prefs, result]);

  const addIngredients = (text) => {
    const items = text
      .split(',')
      .map((item) => item.trim().toLowerCase().slice(0, 40))
      .filter(Boolean);
    const next = [...ingredients];
    for (const item of items) {
      if (!next.includes(item) && next.length < MAX_INGREDIENTS) next.push(item);
    }
    if (next.length === MAX_INGREDIENTS && items.some((item) => !next.includes(item))) {
      toast.info(`You can add up to ${MAX_INGREDIENTS} ingredients`);
    }
    setIngredients(next);
    setError('');
  };

  const handleAdd = (event) => {
    event.preventDefault();
    addIngredients(input);
    setInput('');
  };

  const removeIngredient = (item) => setIngredients((current) => current.filter((i) => i !== item));
  const updatePref = (event) => setPrefs((current) => ({ ...current, [event.target.name]: event.target.value }));

  const findRecipes = async () => {
    if (!ingredients.length) {
      setError('Add at least one ingredient first.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await aiApi.suggest({
        ingredients,
        cuisine: prefs.cuisine === 'Any' ? '' : prefs.cuisine,
        diet: prefs.diet,
        difficulty: prefs.difficulty,
        maxTime: prefs.maxTime ? Number(prefs.maxTime) : undefined,
      });
      setResult(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => {
    setIngredients([]);
    setResult(null);
    setError('');
  };

  let results;
  if (loading) {
    results = (
      <div className="status" role="status">
        <div className="spinner" />
        <h3>Finding recipes for your ingredients…</h3>
        <p>This usually takes a few seconds.</p>
      </div>
    );
  } else if (error) {
    results = <ErrorState message={error} onRetry={ingredients.length ? findRecipes : undefined} />;
  } else if (result) {
    results = (
      <>
        {result.source === 'ai' ? (
          <div className="notice notice-ai">
            <Icon name="sparkles" />
            <span>
              <strong>AI-generated suggestions.</strong> Double-check quantities, cooking times and allergens before you
              cook.
            </span>
          </div>
        ) : (
          <div className="notice notice-warning">
            <Icon name="info" />
            <span>{result.notice}</span>
          </div>
        )}
        {result.suggestions.length ? (
          <div className="suggestions">
            {result.suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} source={result.source} />
            ))}
          </div>
        ) : (
          <div className="status">
            <h3>No matching recipes found</h3>
            <p>Try adding more ingredients or relaxing your preferences.</p>
          </div>
        )}
      </>
    );
  } else {
    results = (
      <div className="status ai-placeholder">
        <div className="status-icon">
          <Icon name="sparkles" size={40} />
        </div>
        <h3>Your recipe ideas will appear here</h3>
        <p>Add what you have at home, pick any preferences, then press “Find Recipes”.</p>
      </div>
    );
  }

  return (
    <div className="container page">
      <section className="ai-hero">
        <span className="eyebrow eyebrow-light">
          <Icon name="sparkles" size={14} /> AI Recipe Finder
        </span>
        <h1>What can I cook with what I have?</h1>
        <p>
          List the ingredients in your kitchen and get 3–5 recipe ideas. Each one shows what you already have and what
          you would still need to buy.
        </p>
      </section>

      <div className="ai-layout">
        <aside className="form-card ai-form">
          <h2 className="form-title">1. Your ingredients</h2>
          <form className="chip-input" onSubmit={handleAdd}>
            <input
              className="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. eggs, rice, tomatoes"
              aria-label="Add an ingredient"
              maxLength={200}
            />
            <button type="submit" className="btn btn-primary" disabled={!input.trim()}>
              <Icon name="plus" size={16} /> Add
            </button>
          </form>
          <p className="hint">Press Enter to add. Separate several with commas.</p>

          {ingredients.length > 0 && (
            <ul className="chips" aria-label="Your ingredients">
              {ingredients.map((item) => (
                <li className="chip" key={item}>
                  {item}
                  <button type="button" onClick={() => removeIngredient(item)} aria-label={`Remove ${item}`}>
                    <Icon name="x" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="quick-add">
            <span className="hint">Quick add:</span>
            {QUICK_ADD.filter((item) => !ingredients.includes(item)).map((item) => (
              <button type="button" key={item} className="quick-chip" onClick={() => addIngredients(item)}>
                + {item}
              </button>
            ))}
          </div>

          <h2 className="form-title">2. Preferences <span className="hint">(optional)</span></h2>
          <div className="prefs">
            <label className="field">
              <span className="label-sm">Cuisine</span>
              <select name="cuisine" className="select" value={prefs.cuisine} onChange={updatePref}>
                {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label-sm">Diet</span>
              <select name="diet" className="select" value={prefs.diet} onChange={updatePref}>
                {DIETS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label-sm">Max total time</span>
              <select name="maxTime" className="select" value={prefs.maxTime} onChange={updatePref}>
                {TIMES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="label-sm">Difficulty</span>
              <select name="difficulty" className="select" value={prefs.difficulty} onChange={updatePref}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d === 'any' ? 'Any' : d}</option>)}
              </select>
            </label>
          </div>

          <button type="button" className="btn btn-accent btn-lg btn-block" onClick={findRecipes} disabled={loading}>
            <Icon name="sparkles" /> {loading ? 'Finding recipes…' : 'Find Recipes'}
          </button>
          {ingredients.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={clearAll} disabled={loading}>
              Clear all
            </button>
          )}
        </aside>

        <section className="ai-results" aria-live="polite">
          {results}
        </section>
      </div>
    </div>
  );
}
