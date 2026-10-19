import { useState } from 'react';
import { Link } from 'react-router-dom';
import { recipeApi, getErrorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import useFetch from '../hooks/useFetch';
import RecipeCard from '../components/RecipeCard';
import Icon from '../components/Icon';
import { Spinner, EmptyState, ErrorState } from '../components/Status';

export default function SavedRecipes() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useFetch(() => recipeApi.saved(), 'saved');
  const [removingId, setRemovingId] = useState(null);

  const handleRemove = async (recipe) => {
    setRemovingId(recipe.id);
    try {
      // The endpoint toggles. If it says "saved", it was already removed elsewhere, so toggle back.
      const { saved } = await recipeApi.toggleSave(recipe.id);
      if (saved) await recipeApi.toggleSave(recipe.id);
      setData((current) => ({ ...current, recipes: current.recipes.filter((r) => r.id !== recipe.id) }));
      toast.success(`Removed "${recipe.title}" from your saved recipes`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRemovingId(null);
    }
  };

  let content;
  if (loading) content = <Spinner label="Loading your saved recipes…" />;
  else if (error) content = <ErrorState message={error} onRetry={reload} />;
  else if (data.recipes.length === 0) {
    content = (
      <EmptyState
        title="No saved recipes yet"
        text="Tap “Save recipe” on any recipe, or save a suggestion from the AI Recipe Finder."
        action={<Link to="/explore" className="btn btn-primary">Explore recipes</Link>}
      />
    );
  } else {
    content = (
      <div className="recipe-grid">
        {data.recipes.map((recipe) => (
          <div className="card-wrapper" key={recipe.id}>
            <RecipeCard recipe={recipe} />
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => handleRemove(recipe)}
              disabled={removingId === recipe.id}
            >
              <Icon name="x" size={16} /> {removingId === recipe.id ? 'Removing…' : 'Remove from saved'}
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="container page">
      <div className="page-header">
        <h1>Saved recipes</h1>
        <p>Your personal cookbook.</p>
      </div>
      {content}
    </div>
  );
}
