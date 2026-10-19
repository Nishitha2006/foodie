import { Link, useNavigate } from 'react-router-dom';
import { recipeApi } from '../services/api';
import useFetch from '../hooks/useFetch';
import SearchBar from '../components/SearchBar';
import RecipeCard from '../components/RecipeCard';
import Icon from '../components/Icon';
import { Spinner, EmptyState, ErrorState } from '../components/Status';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=80&auto=format&fit=crop';

function RecipeSection({ title, subtitle, params, linkTo }) {
  const { data, error, loading, reload } = useFetch(() => recipeApi.list(params), JSON.stringify(params));

  let content;
  if (loading) content = <Spinner label="Loading recipes…" />;
  else if (error) content = <ErrorState message={error} onRetry={reload} />;
  else if (data.recipes.length === 0) {
    content = (
      <EmptyState
        title="No recipes yet"
        text="Be the first to share a recipe with the community."
        action={<Link to="/recipes/new" className="btn btn-primary">Add a recipe</Link>}
      />
    );
  } else {
    content = (
      <div className="recipe-grid">
        {data.recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    );
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <Link to={linkTo} className="btn btn-ghost">
          See all →
        </Link>
      </div>
      {content}
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();

  const handleSearch = (query) => {
    navigate(query ? `/explore?search=${encodeURIComponent(query)}` : '/explore');
  };

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Home cooking, shared</span>
            <h1>
              Find your next <em>favourite</em> meal
            </h1>
            <p className="hero-lead">
              Browse recipes from home cooks, share your own, or tell our AI what is in your fridge and get dishes you
              can make tonight.
            </p>
            <SearchBar onSearch={handleSearch} />
            <div className="hero-actions">
              <Link to="/ai-finder" className="btn btn-accent btn-lg">
                <Icon name="sparkles" /> Try the AI Recipe Finder
              </Link>
              <Link to="/recipes/new" className="btn btn-outline btn-lg">
                Share a recipe
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <img src={HERO_IMAGE} alt="A colourful bowl of vegetables, chickpeas and greens" />
            <div className="hero-badge">
              <span className="hero-badge-icon">
                <Icon name="sparkles" />
              </span>
              <div>
                <strong>What can I cook?</strong>
                <small>Ask the AI with what you have</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <RecipeSection
          title="Most loved"
          subtitle="The community's favourite recipes right now"
          params={{ sort: 'popular', limit: 3 }}
          linkTo="/explore?sort=popular"
        />
        <RecipeSection
          title="Fresh from the kitchen"
          subtitle="Recently shared by home cooks"
          params={{ limit: 6 }}
          linkTo="/explore"
        />

        <section className="promo">
          <div>
            <h2>Got eggs, rice and a few tomatoes?</h2>
            <p>Tell the AI Recipe Finder what you have and get 3–5 ideas, with a clear list of anything else you need.</p>
          </div>
          <Link to="/ai-finder" className="btn btn-accent btn-lg">
            <Icon name="sparkles" /> Find recipes
          </Link>
        </section>
      </div>
    </>
  );
}
