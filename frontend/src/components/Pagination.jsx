// Prev / page numbers / Next. Shows at most 5 page numbers around the current page.
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = [];
  for (let p = start; p <= end; p += 1) pages.push(p);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" className="page-btn" onClick={() => onChange(page - 1)} disabled={page <= 1}>
        ‹ Prev
      </button>
      {pages.map((p) => (
        <button
          type="button"
          key={p}
          className={`page-btn${p === page ? ' current' : ''}`}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <button type="button" className="page-btn" onClick={() => onChange(page + 1)} disabled={page >= totalPages}>
        Next ›
      </button>
    </nav>
  );
}
