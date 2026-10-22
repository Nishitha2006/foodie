import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link to="/" className="brand brand-light">
              <span className="brand-mark">
                <Icon name="chef" size={20} />
              </span>
              Forkful
            </Link>
            <p className="footer-tagline">
              Share the dishes you love, discover new favourites, and turn whatever is in your fridge into dinner.
            </p>
          </div>
          <div>
            <h4>Discover</h4>
            <ul>
              <li><Link to="/explore">All recipes</Link></li>
              <li><Link to="/explore?sort=popular">Most liked</Link></li>
              <li><Link to="/ai-finder">AI Recipe Finder</Link></li>
            </ul>
          </div>
          <div>
            <h4>Your kitchen</h4>
            <ul>
              <li><Link to="/recipes/new">Add a recipe</Link></li>
              <li><Link to="/saved">Saved recipes</Link></li>
              <li><Link to="/login">Log in</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Forkful · a portfolio project</span>
          <span>Built with React, Express and MongoDB</span>
        </div>
      </div>
    </footer>
  );
}
