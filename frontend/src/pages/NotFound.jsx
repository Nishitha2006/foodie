import { Link } from 'react-router-dom';
import { EmptyState } from '../components/Status';

export default function NotFound() {
  return (
    <div className="container page">
      <EmptyState
        title="Page not found"
        text="The page you are looking for does not exist or was moved."
        action={<Link to="/" className="btn btn-primary">Back to home</Link>}
      />
    </div>
  );
}
