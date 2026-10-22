import { Link } from 'react-router-dom';
import { formatMinutes } from '../services/format';
import RecipeImage from './RecipeImage';
import Icon from './Icon';

export default function RecipeCard({ recipe }) {
  return (
    <Link to={`/recipes/${recipe.id}`} className="recipe-card">
      <div className="recipe-card-media">
        <RecipeImage src={recipe.imageUrl} alt={recipe.title} />
        {recipe.aiGenerated && (
          <span className="badge">
            <Icon name="sparkles" size={12} /> AI recipe
          </span>
        )}
      </div>
      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{recipe.title}</h3>
        <p className="recipe-card-author">by {recipe.author.name}</p>
        <div className="recipe-card-meta">
          <span className="meta-item">
            <Icon name="clock" size={16} /> {formatMinutes(recipe.prepTime + recipe.cookTime)}
          </span>
          <span className="meta-item likes" aria-label={`${recipe.likesCount} likes`}>
            <Icon name="heart" size={16} filled={recipe.likedByMe} /> {recipe.likesCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
