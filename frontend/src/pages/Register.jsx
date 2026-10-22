import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../services/api';

function validate({ name, email, password }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Enter your name';
  else if (name.trim().length > 50) errors.name = 'Name must be 50 characters or fewer';
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address';
  if (password.length < 6) errors.password = 'Password must be at least 6 characters';
  return errors;
}

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmitting(true);
    setServerError('');
    try {
      const user = await register(form.name.trim(), form.email.trim(), form.password);
      toast.success(`Welcome to Forkful, ${user.name}!`);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  const input = (name, label, type, autoComplete) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        className={`input${errors[name] ? ' invalid' : ''}`}
        value={form[name]}
        onChange={update}
        autoComplete={autoComplete}
      />
      {errors[name] && <p className="field-error">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="container page auth-card">
      <div className="form-card">
        <h1>Create your account</h1>
        <p className="muted">Share your recipes and keep a cookbook of your favourites.</p>

        <form className="form-grid" onSubmit={handleSubmit} noValidate>
          {serverError && <div className="form-alert" role="alert">{serverError}</div>}
          {input('name', 'Name', 'text', 'name')}
          {input('email', 'Email', 'email', 'email')}
          {input('password', 'Password (at least 6 characters)', 'password', 'new-password')}
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="center muted">
          Already have an account? <Link to="/login" state={location.state}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
