import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Each ingredient needs a name'],
      trim: true,
      lowercase: true,
      maxlength: [60, 'Ingredient names must be 60 characters or fewer'],
    },
    quantity: {
      type: String,
      trim: true,
      maxlength: [40, 'Quantities must be 40 characters or fewer'],
      default: '',
    },
  },
  { _id: false }
);

const nonEmptyList = (message) => ({
  validator: (list) => Array.isArray(list) && list.length > 0,
  message,
});

const minutes = (label) => ({
  type: Number,
  required: [true, `${label} is required`],
  min: [0, `${label} cannot be negative`],
  max: [1440, `${label} must be 1440 minutes (24 hours) or less`],
});

const recipeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title must be 120 characters or fewer'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [500, 'Description must be 500 characters or fewer'],
    },
    ingredients: {
      type: [ingredientSchema],
      validate: nonEmptyList('Add at least one ingredient'),
    },
    steps: {
      type: [{ type: String, trim: true, maxlength: [1000, 'Each step must be 1000 characters or fewer'] }],
      validate: nonEmptyList('Add at least one cooking step'),
    },
    prepTime: minutes('Preparation time'),
    cookTime: minutes('Cooking time'),
    servings: {
      type: Number,
      required: [true, 'Servings is required'],
      min: [1, 'Servings must be at least 1'],
      max: [100, 'Servings must be 100 or fewer'],
    },
    // Either "/uploads/<file>" (uploaded with Multer) or a full https:// URL (seed data).
    imageUrl: { type: String, default: '' },

    author: { type: ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true, trim: true },

    // User IDs. $addToSet in the controller guarantees no duplicates.
    likes: [{ type: ObjectId, ref: 'User' }],
    likesCount: { type: Number, default: 0 },
    savedBy: [{ type: ObjectId, ref: 'User' }],

    aiGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

recipeSchema.index({ createdAt: -1 });
recipeSchema.index({ likesCount: -1 });
recipeSchema.index({ 'ingredients.name': 1 });
recipeSchema.index({ savedBy: 1 });

export default mongoose.model('Recipe', recipeSchema);
