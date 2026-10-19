import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { recipeApi, getErrorMessage } from '../services/api';
import { formatDate, formatMinutes } from '../services/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import useFetch from '../hooks/useFetch';
import RecipeImage from '../components/RecipeImage';
import Icon from '../components/Icon';
import { Spinner, ErrorState } from '../components/Status';

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default function RecipeDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Refetch when the user changes so "liked"/"saved" reflect who is logged in.
  const { data: recipe, error, loading, reload, setData } = useFetch(() => recipeApi.get(id), `${id}:${user?.id ?? ''}`);
  const [checked, setChecked] = useState({});
  const [busy, setBusy] = useState('');

  if (loading) {
    return (
      <div className="container page">
        <Spinner label="Loading recipe…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="container page">
        <ErrorState message={error} onRetry={reload} />
        <p className="center">
          <Link to="/explore">← Back to all recipes</Link>
        </p>
      </div>
    );
  }

  const isOwner = user?.id === recipe.author.id;

  const askToLogin = (action) => {
    toast.info(`Log in to ${action} recipes`);
    navigate('/login', { state: { from: location.pathname } });
  };

  const handleLike = async () => {
    if (!user) return askToLogin('like');
    setBusy('like');
    try {
      const { liked, likesCount } = await recipeApi.toggleLike(id);
      setData((current) => ({ ...current, likedByMe: liked, likesCount }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const handleSave = async () => {
    if (!user) return askToLogin('save');
    setBusy('save');
    try {
      const { saved } = await recipeApi.toggleSave(id);
      setData((current) => ({ ...current, savedByMe: saved }));
      toast.success(saved ? 'Added to your saved recipes' : 'Removed from your saved recipes');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${recipe.title}"? This cannot be undone.`)) return;
    setBusy('delete');
    try {
      await recipeApi.remove(id);
      toast.success('Recipe deleted');
      navigate('/explore');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setBusy('');
    }
  };

  const toggleIngredient = (index) => setChecked((current) => ({ ...current, [index]: !current[index] }));

  return (
    <div className="container page">
      <Link to="/explore" className="back-link">
        <Icon name="arrow-left" size={16} /> All recipes
      </Link>

      <div className="details-hero">
        <div className="details-image">
          <RecipeImage src={recipe.imageUrl} alt={recipe.title} />
        </div>

        <div className="details-info">
          {recipe.aiGenerated && (
            <span className="tag">
              <Icon name="sparkles" size={14} /> Created with the AI Recipe Finder
            </span>
          )}
          <h1>{recipe.title}</h1>
          <p className="details-description">{recipe.description}</p>

          <div className="details-author">
            <span className="avatar">{recipe.author.name.charAt(0).toUpperCase()}</span>
            <span>
              by <strong>{recipe.author.name}</strong> · {formatDate(recipe.createdAt)}
            </span>
          </div>

          <div className="stats">
            <Stat label="Prep" value={formatMinutes(recipe.prepTime)} />
            <Stat label="Cook" value={formatMinutes(recipe.cookTime)} />
            <Stat label="Total" value={formatMinutes(recipe.prepTime + recipe.cookTime)} />
            <Stat label="Servings" value={recipe.servings} />
          </div>

          <div className="details-actions">
            <button
              type="button"
              className={`btn btn-outline${recipe.likedByMe ? ' active' : ''}`}
              onClick={handleLike}
              disabled={busy === 'like'}
              aria-pressed={recipe.likedByMe}
            >
              <Icon name="heart" filled={recipe.likedByMe} /> {recipe.likedByMe ? 'Liked' : 'Like'} · {recipe.likesCount}
            </button>
            <button
              type="button"
              className={`btn btn-outline${recipe.savedByMe ? ' active-green' : ''}`}
              onClick={handleSave}
              disabled={busy === 'save'}
              aria-pressed={recipe.savedByMe}
            >
              <Icon name="bookmark" filled={recipe.savedByMe} /> {recipe.savedByMe ? 'Saved' : 'Save recipe'}
            </button>
            {isOwner && (
              <>
                <Link to={`/recipes/${id}/edit`} className="btn btn-ghost">
                  <Icon name="edit" /> Edit
                </Link>
                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={busy === 'delete'}>
                  <Icon name="trash" /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="details-body">
        <section className="panel">
          <h2>Ingredients</h2>
          <p className="hint">Tick them off as you go.</p>
          <ul className="checklist">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index}>
                <label>
                  <input type="checkbox" checked={Boolean(checked[index])} onChange={() => toggleIngredient(index)} />
                  <span className={`ing-name${checked[index] ? ' done' : ''}`}>{ingredient.name}</span>
                  {ingredient.quantity && <span className="qty">{ingredient.quantity}</span>}
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Instructions</h2>
          <ol className="steps">
            {recipe.steps.map((step, index) => (
              <li key={index}>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
