import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { recipeApi, getErrorMessage, imageSrc } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';
import { Spinner, ErrorState } from '../components/Status';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_MB = 5;

function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>
        {label} {hint && <span className="hint">{hint}</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

// Client-side checks so the user gets instant feedback. The server validates again.
function validate(fields, ingredients, steps) {
  const errors = {};
  const title = fields.title.trim();
  const description = fields.description.trim();

  if (!title) errors.title = 'Give your recipe a title';
  else if (title.length > 120) errors.title = 'Keep the title under 120 characters';

  if (!description) errors.description = 'Add a short description';
  else if (description.length > 500) errors.description = 'Keep the description under 500 characters';

  if (!ingredients.some((i) => i.name.trim())) errors.ingredients = 'Add at least one ingredient';
  if (!steps.some((s) => s.trim())) errors.steps = 'Add at least one cooking step';

  const numbers = [
    ['prepTime', 'Preparation time', 0],
    ['cookTime', 'Cooking time', 0],
    ['servings', 'Servings', 1],
  ];
  for (const [key, label, min] of numbers) {
    const value = fields[key];
    if (value === '') errors[key] = `${label} is required`;
    else if (!Number.isInteger(Number(value)) || Number(value) < min) {
      errors[key] = min === 1 ? 'Enter a whole number of at least 1' : 'Enter a whole number of minutes (0 or more)';
    }
  }
  return errors;
}

// Server errors use paths like "ingredients.0.name" — map them to our field names.
function mapServerErrors(serverErrors) {
  const errors = {};
  for (const [path, message] of Object.entries(serverErrors)) {
    const field = path.split('.')[0];
    errors[field] ??= message;
  }
  return errors;
}

export default function RecipeForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [fields, setFields] = useState({ title: '', description: '', prepTime: '', cookTime: '', servings: '' });
  const [ingredients, setIngredients] = useState([{ name: '', quantity: '' }]);
  const [steps, setSteps] = useState(['']);
  const [imageFile, setImageFile] = useState(null);
  const [existingImage, setExistingImage] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [errors, setErrors] = useState({});
  const [loadState, setLoadState] = useState(isEdit ? 'loading' : 'ready');
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Preview the chosen image before uploading. Free the memory when it changes.
  const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : ''), [imageFile]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Edit mode: load the existing recipe into the form.
  useEffect(() => {
    if (!isEdit) return;
    let ignore = false;
    recipeApi
      .get(id)
      .then((recipe) => {
        if (ignore) return;
        if (recipe.author.id !== user.id) {
          setLoadError('You can only edit recipes you created.');
          setLoadState('error');
          return;
        }
        setFields({
          title: recipe.title,
          description: recipe.description,
          prepTime: String(recipe.prepTime),
          cookTime: String(recipe.cookTime),
          servings: String(recipe.servings),
        });
        setIngredients(recipe.ingredients.map((i) => ({ name: i.name, quantity: i.quantity })));
        setSteps(recipe.steps);
        setExistingImage(recipe.imageUrl);
        setLoadState('ready');
      })
      .catch((error) => {
        if (ignore) return;
        setLoadError(getErrorMessage(error));
        setLoadState('error');
      });
    return () => {
      ignore = true;
    };
  }, [id, isEdit, user.id]);

  if (loadState === 'loading') return <div className="container page"><Spinner label="Loading recipe…" /></div>;
  if (loadState === 'error') {
    return (
      <div className="container page">
        <ErrorState message={loadError} />
        <p className="center"><Link to="/explore">← Back to recipes</Link></p>
      </div>
    );
  }

  // ---------- change handlers ----------
  const clearError = (key) => setErrors((current) => ({ ...current, [key]: undefined }));

  const updateField = (event) => {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
    clearError(name);
  };

  const updateIngredient = (index, key, value) => {
    setIngredients((current) => current.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
    clearError('ingredients');
  };
  const addIngredient = () => setIngredients((current) => [...current, { name: '', quantity: '' }]);
  const removeIngredient = (index) => setIngredients((current) => current.filter((_, i) => i !== index));

  const updateStep = (index, value) => {
    setSteps((current) => current.map((step, i) => (i === index ? value : step)));
    clearError('steps');
  };
  const addStep = () => setSteps((current) => [...current, '']);
  const removeStep = (index) => setSteps((current) => current.filter((_, i) => i !== index));

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow choosing the same file again later
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((current) => ({ ...current, image: 'Please choose a JPG, PNG, WEBP or GIF image' }));
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setErrors((current) => ({ ...current, image: `Image must be ${MAX_IMAGE_MB} MB or smaller` }));
      return;
    }
    setImageFile(file);
    clearError('image');
  };

  const clearImage = () => {
    setImageFile(null);
    if (existingImage) {
      setExistingImage('');
      setRemoveImage(true);
    }
  };

  // ---------- submit ----------
  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(fields, ingredients, steps);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    // FormData lets us send text fields and the image file in one request.
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value.trim()));
    formData.append('ingredients', JSON.stringify(ingredients.filter((i) => i.name.trim())));
    formData.append('steps', JSON.stringify(steps.filter((s) => s.trim())));
    if (imageFile) formData.append('image', imageFile);
    else if (removeImage) formData.append('removeImage', 'true');

    setSubmitting(true);
    try {
      const recipe = isEdit ? await recipeApi.update(id, formData) : await recipeApi.create(formData);
      toast.success(isEdit ? 'Recipe updated' : 'Recipe published!');
      navigate(`/recipes/${recipe.id}`);
    } catch (error) {
      const serverErrors = error.response?.data?.errors;
      if (serverErrors) setErrors(mapServerErrors(serverErrors));
      toast.error(getErrorMessage(error));
      setSubmitting(false);
    }
  };

  const shownImage = previewUrl || imageSrc(existingImage);

  return (
    <div className="container page form-layout">
      <div className="page-header">
        <h1>{isEdit ? 'Edit recipe' : 'Share a recipe'}</h1>
        <p>
          Publishing as <strong>{user.name}</strong>. Fields marked * are required.
        </p>
      </div>

      <form className="form-card form-grid" onSubmit={handleSubmit} noValidate>
        <Field label="Recipe title *" htmlFor="title" error={errors.title}>
          <input
            id="title"
            name="title"
            className={`input${errors.title ? ' invalid' : ''}`}
            value={fields.title}
            onChange={updateField}
            placeholder="e.g. Tomato Egg Fried Rice"
            maxLength={120}
          />
        </Field>

        <Field label="Short description *" hint="(max 500 characters)" htmlFor="description" error={errors.description}>
          <textarea
            id="description"
            name="description"
            className={`textarea${errors.description ? ' invalid' : ''}`}
            value={fields.description}
            onChange={updateField}
            placeholder="What makes this dish special?"
            maxLength={500}
            rows={3}
          />
        </Field>

        <div className="row-3">
          <Field label="Prep time (min) *" htmlFor="prepTime" error={errors.prepTime}>
            <input id="prepTime" name="prepTime" type="number" min="0" className={`input${errors.prepTime ? ' invalid' : ''}`} value={fields.prepTime} onChange={updateField} />
          </Field>
          <Field label="Cook time (min) *" htmlFor="cookTime" error={errors.cookTime}>
            <input id="cookTime" name="cookTime" type="number" min="0" className={`input${errors.cookTime ? ' invalid' : ''}`} value={fields.cookTime} onChange={updateField} />
          </Field>
          <Field label="Servings *" htmlFor="servings" error={errors.servings}>
            <input id="servings" name="servings" type="number" min="1" className={`input${errors.servings ? ' invalid' : ''}`} value={fields.servings} onChange={updateField} />
          </Field>
        </div>

        <fieldset className="field">
          <legend className="label">Ingredients *</legend>
          <div className="list-editor">
            {ingredients.map((ingredient, index) => (
              <div className="list-row" key={index}>
                <span className="num">{index + 1}</span>
                <input
                  className="input grow-2"
                  placeholder="Ingredient, e.g. rice"
                  value={ingredient.name}
                  onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                  aria-label={`Ingredient ${index + 1} name`}
                  maxLength={60}
                />
                <input
                  className="input grow-1"
                  placeholder="Amount, e.g. 2 cups"
                  value={ingredient.quantity}
                  onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                  aria-label={`Ingredient ${index + 1} amount`}
                  maxLength={40}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length === 1}
                  aria-label={`Remove ingredient ${index + 1}`}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
          {errors.ingredients && <p className="field-error">{errors.ingredients}</p>}
          <button type="button" className="btn btn-outline btn-sm add-row" onClick={addIngredient}>
            <Icon name="plus" size={16} /> Add ingredient
          </button>
        </fieldset>

        <fieldset className="field">
          <legend className="label">Cooking steps *</legend>
          <div className="list-editor">
            {steps.map((step, index) => (
              <div className="list-row" key={index}>
                <span className="num">{index + 1}</span>
                <textarea
                  className="textarea grow-2"
                  placeholder={`Describe step ${index + 1}`}
                  value={step}
                  onChange={(e) => updateStep(index, e.target.value)}
                  aria-label={`Step ${index + 1}`}
                  maxLength={1000}
                  rows={2}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => removeStep(index)}
                  disabled={steps.length === 1}
                  aria-label={`Remove step ${index + 1}`}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
          {errors.steps && <p className="field-error">{errors.steps}</p>}
          <button type="button" className="btn btn-outline btn-sm add-row" onClick={addStep}>
            <Icon name="plus" size={16} /> Add step
          </button>
        </fieldset>

        <div className="field">
          <span className="label">
            Photo <span className="hint">(optional · JPG, PNG, WEBP or GIF · max {MAX_IMAGE_MB} MB)</span>
          </span>
          <label className={`image-upload${errors.image ? ' invalid' : ''}`}>
            {shownImage ? (
              <>
                <img src={shownImage} alt="Recipe preview" className="image-preview" />
                <span className="hint">Click to choose a different photo</span>
              </>
            ) : (
              <span className="upload-empty">
                <Icon name="image" size={32} />
                <span>Click to choose a photo</span>
              </span>
            )}
            <input type="file" accept={IMAGE_TYPES.join(',')} onChange={handleImage} className="sr-only" />
          </label>
          {shownImage && (
            <button type="button" className="btn btn-ghost btn-sm align-start" onClick={clearImage}>
              <Icon name="x" size={16} /> Remove photo
            </button>
          )}
          {errors.image && <p className="field-error">{errors.image}</p>}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Publish recipe'}
          </button>
        </div>
      </form>
    </div>
  );
}
