import { Link, useSearchParams } from 'react-router-dom';
import { recipeApi } from '../services/api';
import useFetch from '../hooks/useFetch';
import SearchBar from '../components/SearchBar';
import RecipeCard from '../components/RecipeCard';
import Pagination from '../components/Pagination';
import { Spinner, EmptyState, ErrorState } from '../components/Status';

const PAGE_SIZE = 9;

export default function Explore() {
  // search, sort and page live in the URL, e.g. /explore?search=tomato&page=2
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') === 'popular' ? 'popular' : 'newest';
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);

  const params = { search, sort, page, limit: PAGE_SIZE };
  const { data, error, loading, reload } = useFetch(() => recipeApi.list(params), JSON.stringify(params));

  const update = (changes) => {
    const next = { search, sort, page, ...changes };
    const query = {};
    if (next.search) query.search = next.search;
    if (next.sort !== 'newest') query.sort = next.sort;
    if (next.page > 1) query.page = String(next.page);
    setSearchParams(query);
  };

  const changePage = (newPage) => {
    update({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  let content;
  if (loading) {
    content = <Spinner label="Loading recipes…" />;
  } else if (error) {
    content = <ErrorState message={error} onRetry={reload} />;
  } else if (data.recipes.length === 0 && data.total > 0) {
    content = (
      <EmptyState
        title="This page is empty"
        text={`There are only ${data.totalPages} pages of results.`}
        action={<button type="button" className="btn btn-outline" onClick={() => update({ page: 1 })}>Go to page 1</button>}
      />
    );
  } else if (data.recipes.length === 0) {
    content = search ? (
      <EmptyState
        title="No recipes found"
        text={`Nothing matches "${search}". Try another dish or ingredient.`}
        action={<button type="button" className="btn btn-outline" onClick={() => update({ search: '', page: 1 })}>Clear search</button>}
      />
    ) : (
      <EmptyState
        title="No recipes yet"
        text="Be the first to share one!"
        action={<Link to="/recipes/new" className="btn btn-primary">Add a recipe</Link>}
      />
    );
  } else {
    content = (
      <>
        <p className="results-info">
          {data.total} recipe{data.total === 1 ? '' : 's'}
          {search && <> matching “{search}”</>} · page {data.page} of {data.totalPages}
        </p>
        <div className="recipe-grid">
          {data.recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
        <Pagination page={data.page} totalPages={data.totalPages} onChange={changePage} />
      </>
    );
  }

  return (
    <div className="container page">
      <div className="page-header">
        <h1>Explore recipes</h1>
        <p>Search by recipe name or by an ingredient you want to use up.</p>
      </div>

      <div className="toolbar">
        {/* key resets the input when the search changes from outside (e.g. "Clear search") */}
        <SearchBar key={search} initial={search} onSearch={(query) => update({ search: query, page: 1 })} />
        <select
          className="select select-inline"
          value={sort}
          onChange={(event) => update({ sort: event.target.value, page: 1 })}
          aria-label="Sort recipes"
        >
          <option value="newest">Newest first</option>
          <option value="popular">Most liked</option>
        </select>
      </div>

      {content}
    </div>
  );
}
