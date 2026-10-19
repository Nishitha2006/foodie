import { useState } from 'react';
import Icon from './Icon';

export default function SearchBar({ initial = '', onSearch }) {
  const [value, setValue] = useState(initial);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(value.trim());
  };

  return (
    <form className="search-bar" role="search" onSubmit={handleSubmit}>
      <Icon name="search" className="search-icon" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by recipe or ingredient, e.g. tomato"
        aria-label="Search recipes"
        maxLength={100}
      />
      <button type="submit" className="btn btn-primary">
        Search
      </button>
    </form>
  );
}
