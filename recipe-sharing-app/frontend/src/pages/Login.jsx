import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="container page auth-card">
      <div className="form-card">
        <h1>Welcome back</h1>
        <p className="muted">Log in to share, like and save recipes.</p>

        {location.state?.message && <div className="notice notice-ai">{location.state.message}</div>}

        <div className="demo-hint">
          <span>
            Demo account: <strong>demo@recipes.dev</strong> / <strong>demo1234</strong>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setForm({ email: 'demo@recipes.dev', password: 'demo1234' })}
          >
            Use it
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit} noValidate>
          {error && <div className="form-alert" role="alert">{error}</div>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" value={form.email} onChange={update} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" value={form.password} onChange={update} autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="center muted">
          New here? <Link to="/register" state={location.state}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
