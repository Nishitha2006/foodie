// Fills the database with demo users and sample recipes.
// Run from the backend folder:  npm run seed
// Safe to run again: it only replaces recipes owned by the demo users.
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Recipe from './models/Recipe.js';

const image = (id) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

const DEMO_USERS = [
  { name: 'Demo Chef', email: 'demo@recipes.dev', password: 'demo1234' },
  { name: 'Priya Sharma', email: 'priya@recipes.dev', password: 'demo1234' },
];

// owner: index into DEMO_USERS. likedBy: indexes of demo users who like it.
const RECIPES = [
  {
    owner: 0, likedBy: [0, 1],
    title: 'Tomato Egg Fried Rice',
    description: 'A quick weeknight fried rice with soft scrambled eggs and juicy tomatoes.',
    image: image('1603133872878-684f208fb84b'),
    prepTime: 10, cookTime: 15, servings: 2,
    ingredients: [
      ['rice', '2 cups, cooked and cooled'], ['eggs', '2'], ['tomato', '2, chopped'], ['spring onion', '2 stalks'],
      ['soy sauce', '1 tbsp'], ['vegetable oil', '2 tbsp'], ['salt', 'to taste'],
    ],
    steps: [
      'Beat the eggs with a pinch of salt.',
      'Heat 1 tbsp oil in a wok and softly scramble the eggs. Set aside.',
      'Add the remaining oil, then the tomatoes, and cook for 2 minutes until they soften.',
      'Add the rice and soy sauce and stir-fry on high heat for 3–4 minutes.',
      'Fold the eggs back in, top with spring onion and serve.',
    ],
  },
  {
    owner: 1, likedBy: [0],
    title: 'Creamy Pumpkin Soup',
    description: 'Velvety roasted pumpkin soup with garlic, onion and a swirl of cream.',
    image: image('1476718406336-bb5a9690ee2a'),
    prepTime: 15, cookTime: 35, servings: 4,
    ingredients: [
      ['pumpkin', '1 kg, cubed'], ['onion', '1, diced'], ['garlic', '3 cloves'], ['vegetable stock', '750 ml'],
      ['cream', '100 ml'], ['olive oil', '2 tbsp'], ['salt', 'to taste'], ['black pepper', 'to taste'],
    ],
    steps: [
      'Roast the pumpkin with olive oil at 200°C for 25 minutes.',
      'Soften the onion and garlic in a large pot.',
      'Add the roasted pumpkin and stock, then simmer for 10 minutes.',
      'Blend until smooth, stir in the cream and season.',
    ],
  },
  {
    owner: 0, likedBy: [1],
    title: 'Blueberry Banana French Toast',
    description: 'Golden brioche French toast topped with fresh blueberries, banana and maple syrup.',
    image: image('1484723091739-30a097e8f929'),
    prepTime: 10, cookTime: 10, servings: 2,
    ingredients: [
      ['bread', '4 thick slices'], ['eggs', '2'], ['milk', '120 ml'], ['cinnamon', '1/2 tsp'],
      ['butter', '1 tbsp'], ['banana', '1, sliced'], ['blueberries', '1 handful'], ['maple syrup', 'to serve'],
    ],
    steps: [
      'Whisk the eggs, milk and cinnamon in a shallow dish.',
      'Dip each slice of bread in the mixture for a few seconds per side.',
      'Fry in butter over medium heat until golden, about 2–3 minutes per side.',
      'Top with banana, blueberries and maple syrup.',
    ],
  },
  {
    owner: 1, likedBy: [0, 1],
    title: 'Fluffy Pancakes',
    description: 'Tall, fluffy breakfast pancakes made with pantry staples.',
    image: image('1567620905732-2d1ec7ab7445'),
    prepTime: 10, cookTime: 15, servings: 4,
    ingredients: [
      ['flour', '200 g'], ['milk', '300 ml'], ['eggs', '1'], ['sugar', '2 tbsp'],
      ['baking powder', '2 tsp'], ['butter', '2 tbsp, melted'], ['salt', 'a pinch'],
    ],
    steps: [
      'Mix the flour, sugar, baking powder and salt in a bowl.',
      'Whisk in the milk, egg and melted butter until just combined.',
      'Cook ladlefuls on a hot greased pan until bubbles appear, then flip.',
      'Serve warm with your favourite toppings.',
    ],
  },
  {
    owner: 0, likedBy: [],
    title: 'Crispy Fried Egg Toast',
    description: 'A five-minute breakfast: crunchy toast, a runny fried egg and chilli flakes.',
    image: image('1525351484163-7529414344d8'),
    prepTime: 2, cookTime: 5, servings: 1,
    ingredients: [
      ['bread', '1 slice'], ['eggs', '1'], ['butter', '1 tsp'], ['chilli flakes', 'a pinch'], ['salt', 'a pinch'],
    ],
    steps: [
      'Toast the bread.',
      'Fry the egg in butter until the white is set and the edges are crisp.',
      'Place the egg on the toast and finish with salt and chilli flakes.',
    ],
  },
  {
    owner: 1, likedBy: [1],
    title: 'Rainbow Veggie Buddha Bowl',
    description: 'A colourful bowl of roasted chickpeas, fresh vegetables and a lemon tahini dressing.',
    image: image('1512621776951-a57141f2eefd'),
    prepTime: 15, cookTime: 20, servings: 2,
    ingredients: [
      ['chickpeas', '1 can, drained'], ['avocado', '1'], ['carrot', '1, grated'], ['red cabbage', '1 cup, shredded'],
      ['cherry tomatoes', '1 cup'], ['spinach', '2 handfuls'], ['tahini', '2 tbsp'], ['lemon', '1'], ['olive oil', '1 tbsp'],
    ],
    steps: [
      'Toss the chickpeas with olive oil and salt and roast at 200°C for 20 minutes.',
      'Whisk the tahini with lemon juice and a splash of water.',
      'Arrange the spinach, vegetables, avocado and chickpeas in bowls.',
      'Drizzle with the dressing and serve.',
    ],
  },
  {
    owner: 0, likedBy: [0],
    title: 'Grilled Chicken Salad Bowl',
    description: 'Juicy grilled chicken over crisp greens with tomatoes and a honey mustard dressing.',
    image: image('1546069901-ba9599a7e63c'),
    prepTime: 15, cookTime: 12, servings: 2,
    ingredients: [
      ['chicken breast', '2'], ['lettuce', '1 head'], ['cherry tomatoes', '1 cup'], ['cucumber', '1'],
      ['olive oil', '3 tbsp'], ['honey', '1 tsp'], ['mustard', '1 tsp'], ['lemon', '1/2'],
    ],
    steps: [
      'Season the chicken and grill for 5–6 minutes per side. Rest, then slice.',
      'Whisk the olive oil, honey, mustard and lemon juice.',
      'Toss the lettuce, tomatoes and cucumber with half the dressing.',
      'Top with the chicken and drizzle with the rest of the dressing.',
    ],
  },
  {
    owner: 1, likedBy: [0, 1],
    title: 'Veggie Supreme Pizza',
    description: 'Homemade pizza loaded with peppers, onions, mushrooms and melted mozzarella.',
    image: image('1565299624946-b28f40a0ae38'),
    prepTime: 20, cookTime: 15, servings: 4,
    ingredients: [
      ['pizza dough', '1 ball'], ['tomato sauce', '120 ml'], ['mozzarella cheese', '200 g'], ['bell pepper', '1'],
      ['onion', '1/2'], ['mushrooms', '100 g'], ['olive oil', '1 tbsp'], ['oregano', '1 tsp'],
    ],
    steps: [
      'Heat the oven to its highest setting.',
      'Stretch the dough onto a floured tray and spread the sauce on top.',
      'Add the cheese and vegetables, then sprinkle with oregano.',
      'Bake for 12–15 minutes until the crust is golden.',
    ],
  },
  {
    owner: 0, likedBy: [1],
    title: 'Garlic Shrimp Spaghetti',
    description: 'Spaghetti tossed with garlicky shrimp, cherry tomatoes and parsley.',
    image: image('1563379926898-05f4575a45d8'),
    prepTime: 10, cookTime: 15, servings: 2,
    ingredients: [
      ['spaghetti', '200 g'], ['shrimp', '250 g, peeled'], ['garlic', '4 cloves'], ['cherry tomatoes', '1 cup'],
      ['olive oil', '3 tbsp'], ['chilli flakes', '1/2 tsp'], ['parsley', '1 handful'], ['salt', 'to taste'],
    ],
    steps: [
      'Cook the spaghetti in salted water until al dente.',
      'Fry the garlic and chilli in olive oil for 1 minute.',
      'Add the shrimp and tomatoes and cook for 3–4 minutes.',
      'Toss in the spaghetti with a splash of pasta water and the parsley.',
    ],
  },
  {
    owner: 1, likedBy: [0],
    title: 'Penne Arrabbiata',
    description: 'A fiery Roman tomato pasta made with garlic and dried chilli.',
    image: image('1621996346565-e3dbc646d9a9'),
    prepTime: 5, cookTime: 20, servings: 2,
    ingredients: [
      ['penne', '200 g'], ['canned tomatoes', '400 g'], ['garlic', '3 cloves'], ['chilli flakes', '1 tsp'],
      ['olive oil', '2 tbsp'], ['basil', 'a few leaves'], ['salt', 'to taste'],
    ],
    steps: [
      'Cook the penne in salted water.',
      'Gently fry the garlic and chilli in olive oil.',
      'Add the tomatoes and simmer for 10 minutes.',
      'Toss with the pasta and top with basil.',
    ],
  },
  {
    owner: 0, likedBy: [],
    title: 'Cacio e Pepe',
    description: 'Three-ingredient Roman pasta with a silky pecorino and black pepper sauce.',
    image: image('1588013273468-315fd88ea34c'),
    prepTime: 5, cookTime: 12, servings: 2,
    ingredients: [['spaghetti', '200 g'], ['pecorino cheese', '80 g, finely grated'], ['black pepper', '2 tsp, freshly ground']],
    steps: [
      'Cook the spaghetti in lightly salted water. Keep a cup of the pasta water.',
      'Toast the pepper in a dry pan, then add a ladle of pasta water.',
      'Add the pasta, then the cheese, stirring quickly and adding water until creamy.',
    ],
  },
  {
    owner: 1, likedBy: [0, 1],
    title: 'Paneer Butter Masala',
    description: 'Soft paneer cubes in a rich, mildly spiced tomato and butter gravy.',
    image: image('1585937421612-70a008356fbe'),
    prepTime: 15, cookTime: 25, servings: 3,
    ingredients: [
      ['paneer', '250 g, cubed'], ['tomato', '3'], ['onion', '1'], ['butter', '2 tbsp'], ['cream', '60 ml'],
      ['garlic', '3 cloves'], ['ginger', '1 inch'], ['garam masala', '1 tsp'], ['chilli powder', '1 tsp'], ['salt', 'to taste'],
    ],
    steps: [
      'Cook the onion, tomatoes, garlic and ginger until soft, then blend smooth.',
      'Melt the butter, add the spices and the blended sauce, and simmer for 10 minutes.',
      'Stir in the paneer and cream and simmer for 5 more minutes.',
      'Serve with rice or naan.',
    ],
  },
  {
    owner: 0, likedBy: [1],
    title: 'Classic Cheeseburger',
    description: 'A juicy homemade beef burger with melted cheese, lettuce and tomato.',
    image: image('1568901346375-23c9450c58cd'),
    prepTime: 10, cookTime: 10, servings: 2,
    ingredients: [
      ['ground beef', '300 g'], ['burger buns', '2'], ['cheddar cheese', '2 slices'], ['lettuce', '2 leaves'],
      ['tomato', '1'], ['onion', '1/2'], ['salt', 'to taste'], ['black pepper', 'to taste'],
    ],
    steps: [
      'Shape the beef into two patties and season well.',
      'Cook in a hot pan for 3–4 minutes per side. Add the cheese for the last minute.',
      'Toast the buns and build the burgers with lettuce, tomato and onion.',
    ],
  },
  {
    owner: 1, likedBy: [],
    title: 'Coconut Fish Curry',
    description: 'Flaky white fish simmered in a fragrant coconut and tomato curry.',
    image: image('1574484284002-952d92456975'),
    prepTime: 15, cookTime: 20, servings: 3,
    ingredients: [
      ['white fish', '400 g'], ['coconut milk', '400 ml'], ['tomato', '2'], ['onion', '1'],
      ['garlic', '3 cloves'], ['curry powder', '2 tsp'], ['vegetable oil', '1 tbsp'], ['lime', '1'],
    ],
    steps: [
      'Fry the onion and garlic in oil until soft, then add the curry powder.',
      'Add the tomatoes and coconut milk and simmer for 10 minutes.',
      'Add the fish and cook gently for 6–8 minutes.',
      'Finish with lime juice and serve with rice.',
    ],
  },
  {
    owner: 0, likedBy: [0],
    title: 'Creamy Mushroom Tagliatelle',
    description: 'Ribbons of pasta in a garlicky mushroom and parmesan cream sauce.',
    image: image('1551183053-bf91a1d81141'),
    prepTime: 10, cookTime: 15, servings: 2,
    ingredients: [
      ['tagliatelle', '200 g'], ['mushrooms', '250 g, sliced'], ['garlic', '2 cloves'], ['cream', '150 ml'],
      ['parmesan cheese', '40 g'], ['butter', '1 tbsp'], ['parsley', 'to serve'],
    ],
    steps: [
      'Cook the tagliatelle in salted water.',
      'Brown the mushrooms in butter, then add the garlic.',
      'Pour in the cream and parmesan and simmer until slightly thick.',
      'Toss with the pasta and garnish with parsley.',
    ],
  },
];

async function seed() {
  await connectDB();

  const users = [];
  for (const demo of DEMO_USERS) {
    let user = await User.findOne({ email: demo.email });
    if (!user) user = await User.create(demo);
    users.push(user);
  }

  const { deletedCount } = await Recipe.deleteMany({ author: { $in: users.map((u) => u._id) } });

  // Insert one at a time with a small time gap so "newest first" has a stable order.
  const now = Date.now();
  for (const [index, r] of RECIPES.entries()) {
    const owner = users[r.owner];
    const likes = r.likedBy.map((i) => users[i]._id);
    const createdAt = new Date(now - (RECIPES.length - index) * 60 * 60 * 1000);
    await Recipe.create({
      title: r.title,
      description: r.description,
      imageUrl: r.image,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      servings: r.servings,
      ingredients: r.ingredients.map(([name, quantity]) => ({ name, quantity })),
      steps: r.steps,
      author: owner._id,
      authorName: owner.name,
      likes,
      likesCount: likes.length,
      createdAt,
      updatedAt: createdAt,
    });
  }

  console.log(`🌱 Removed ${deletedCount} old demo recipes, added ${RECIPES.length} new ones.`);
  console.log('   Demo logins: demo@recipes.dev / demo1234  and  priya@recipes.dev / demo1234');
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('❌ Seeding failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
