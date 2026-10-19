import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Icon from './Icon';

const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const handleLogout = () => {
    logout();
    close();
    toast.info('You have been logged out');
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" onClick={close}>
          <span className="brand-mark">
            <Icon name="chef" size={20} />
          </span>
          Forkful
        </Link>

        <button
          type="button"
          className="nav-toggle"
          onClick={() => setOpen((value) => !value)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <Icon name={open ? 'x' : 'menu'} size={24} />
        </button>

        <div className={`nav-menu${open ? ' open' : ''}`}>
          <nav className="nav-links" aria-label="Main">
            <NavLink to="/" end className={linkClass} onClick={close}>
              Home
            </NavLink>
            <NavLink to="/explore" className={linkClass} onClick={close}>
              Explore Recipes
            </NavLink>
            <NavLink to="/recipes/new" className={linkClass} onClick={close}>
              Add Recipe
            </NavLink>
            <NavLink to="/ai-finder" className={(state) => `${linkClass(state)} nav-link-ai`} onClick={close}>
              <Icon name="sparkles" size={16} /> AI Recipe Finder
            </NavLink>
            {user && (
              <NavLink to="/saved" className={linkClass} onClick={close}>
                Saved
              </NavLink>
            )}
          </nav>

          <div className="nav-auth">
            {user ? (
              <>
                <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm" onClick={close}>
                  Log in
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
