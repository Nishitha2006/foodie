# Forkful — Recipe Sharing App with AI Recipe Suggestions

A full-stack recipe sharing website. Users can publish recipes with photos, browse and search the community's recipes, like and save favourites, and use an **AI Recipe Finder** that suggests dishes based on the ingredients they already have at home.

Built as a portfolio project with **React (Vite)**, **Node.js / Express**, **MongoDB (Mongoose)** and the **Google Gemini API**.

---

## Features

- **Accounts** – register and log in (passwords hashed with bcrypt, JWT tokens).
- **Recipes** – create, view, edit and delete your own recipes, with ingredients, numbered steps, prep/cook time, servings and an optional photo.
- **Search & pagination** – search by recipe title **or** ingredient (`?search=tomato`), sort by newest or most liked, 9 recipes per page.
- **Likes & saves** – one like and one save per user per recipe (enforced in MongoDB with atomic updates). Saved recipes appear on a personal "Saved" page.
- **Image uploads** – Multer stores images in `backend/uploads/`. Only JPG/PNG/WEBP/GIF up to 5 MB are accepted.
- **AI Recipe Finder** – enter your ingredients plus optional cuisine, diet, max time and difficulty, and get 3–5 suggestions. Each one shows:
  - the ingredients you **have** and the ones you **still need**,
  - prep and cook time, difficulty, servings,
  - step-by-step instructions,
  - an ingredient-match percentage.

  Any suggestion can be saved to your account.
- **Honest fallback** – if no AI key is configured, or the AI service fails, the app matches your ingredients against real recipes in the database. It clearly labels these as community recipes; they are never passed off as AI output.

---

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios, plain CSS |
| Backend | Node.js 20+, Express 5, Mongoose, Multer, bcryptjs, jsonwebtoken |
| Database | MongoDB (local or MongoDB Atlas) |
| AI | Google Gemini API via `@google/genai` (structured JSON output) |

---

## Project structure

```
recipe-sharing-app/
├── backend/
│   ├── config/db.js              MongoDB connection
│   ├── controllers/              Request handlers (auth, recipes, AI)
│   ├── middleware/               auth (JWT), upload (Multer), rateLimit
│   ├── models/                   User and Recipe Mongoose models
│   ├── routes/                   Express routers
│   ├── services/
│   │   ├── aiService.js          Calls Gemini, validates the JSON answer
│   │   └── recipeMatcher.js      Ingredient matching + database fallback
│   ├── utils/http.js             httpError + escapeRegex helpers
│   ├── uploads/                  Uploaded images (git-ignored)
│   ├── seed.js                   Sample users and recipes
│   ├── server.js                 Express app entry point
│   └── .env.example
├── frontend/
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── components/           Navbar, Footer, RecipeCard, Pagination, …
│   │   ├── context/              AuthContext (login state), ToastContext
│   │   ├── hooks/useFetch.js     Small data-loading hook
│   │   ├── pages/                Home, Explore, RecipeDetails, RecipeForm,
│   │   │                         SavedRecipes, AiFinder, Login, Register
│   │   ├── services/api.js       Axios client + one function per endpoint
│   │   ├── App.jsx  main.jsx  index.css
│   └── .env.example
├── .gitignore
└── README.md
```

---

## Setup

### 1. Prerequisites

- **Node.js 20 or newer**. Check with `node -v`.
- **MongoDB**. Pick one of these:
  - **MongoDB Atlas (cloud, free).** Create an M0 cluster at <https://www.mongodb.com/atlas>, add a database user, allow your IP, then copy the connection string.
  - **Local MongoDB on macOS with Homebrew:**
    ```bash
    brew tap mongodb/brew
    brew install mongodb-community
    brew services start mongodb-community
    ```
  - **Local MongoDB without Homebrew.** Download the server `.tgz` from <https://www.mongodb.com/try/download/community>, unpack it, and run:
    ```bash
    mkdir -p ~/mongodb/data
    <unpacked-folder>/bin/mongod --dbpath ~/mongodb/data --bind_ip 127.0.0.1 --fork --logpath ~/mongodb/mongod.log
    ```

### 2. Install dependencies

```bash
# terminal, inside recipe-sharing-app/backend
npm install

# terminal, inside recipe-sharing-app/frontend
npm install
```

### 3. Environment variables

```bash
# inside backend/
cp .env.example .env

# inside frontend/
cp .env.example .env
```

**backend/.env**

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | no | API port. Default `5050`. Avoid 5000 on macOS, because AirPlay Receiver uses it. |
| `CLIENT_URL` | no | Frontend URL allowed by CORS. Default `http://localhost:5173`. |
| `MONGO_URI` | yes | e.g. `mongodb://127.0.0.1:27017/recipe-sharing-app`, or your Atlas URI. |
| `JWT_SECRET` | yes | Long random string. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GEMINI_API_KEY` | no | Turns on real AI suggestions. Leave empty to use the database fallback. |
| `GEMINI_MODEL` | no | Default `gemini-3.8-flash`. Use `gemini-3.5-flash-lite` for a cheaper option. |

**frontend/.env**

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend URL, e.g. `http://localhost:5050`. Everything prefixed `VITE_` is visible in the browser, so **never put secrets here**. |

### 4. Seed sample data (optional, recommended)

```bash
# inside backend/
npm run seed
```

This creates 15 recipes and two demo accounts. Running it again only replaces the demo recipes.

| Email | Password |
| --- | --- |
| demo@recipes.dev | demo1234 |
| priya@recipes.dev | demo1234 |

### 5. Run the app (two terminals)

```bash
# Terminal 1, inside backend/  (auto-restarts on file changes)
npm run dev
# expected output:
# ✅ MongoDB connected: 127.0.0.1/recipe-sharing-app
# 🚀 Server running at http://localhost:5050

# Terminal 2, inside frontend/
npm run dev
# open http://localhost:5173
```

Check that the backend is healthy: <http://localhost:5050/api/health>. It should return `{"status":"ok","database":"connected","aiConfigured":false,...}`.

### 6. Turn on AI suggestions

1. Create a free API key in Google AI Studio: <https://aistudio.google.com/apikey>.
2. Paste it into `backend/.env` as `GEMINI_API_KEY=...`.
3. Restart the backend. `/api/health` should now show `"aiConfigured": true`.

The key is only read by the backend. The browser calls `/api/ai/recipe-suggestions` on your server, never Google directly.

---

## API documentation

Base URL: `http://localhost:5050/api`. Every error response looks like `{ "message": "..." }`.
Routes marked 🔒 need the header `Authorization: Bearer <token>`.

### Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Server, database and AI status |

### Auth

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ name, email, password }` | `201 { token, user }` · `409` if the email is taken |
| POST | `/auth/login` | `{ email, password }` | `200 { token, user }` · `401` if the credentials are wrong |
| GET 🔒 | `/auth/me` | – | `{ user }` |

Register and login allow 20 attempts per IP every 15 minutes.

### Recipes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/recipes?search=&page=1&limit=9&sort=newest\|popular` | List recipes. Search matches the title or any ingredient name. Returns `{ recipes, page, limit, total, totalPages }`. |
| GET | `/recipes/:id` | One recipe. `404` if it does not exist. |
| POST 🔒 | `/recipes` | Create a recipe (`201`). Send `multipart/form-data` (see below) or JSON. |
| PUT 🔒 | `/recipes/:id` | Update your own recipe. Send only the fields you want to change. `403` if you are not the author. |
| DELETE 🔒 | `/recipes/:id` | Delete your own recipe and its uploaded image. |
| POST 🔒 | `/recipes/:id/like` | Toggle your like → `{ liked, likesCount }` |
| POST 🔒 | `/recipes/:id/save` | Toggle your save → `{ saved }` |
| GET 🔒 | `/recipes/saved` | Your saved recipes → `{ recipes }` |
| GET 🔒 | `/recipes/saved/:userId` | Same as above. `403` unless `:userId` is your own id. |

**Create / update fields**

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | required, max 120 |
| `description` | string | required, max 500 |
| `ingredients` | `[{ name, quantity }]` | at least 1. In multipart requests, send it as a JSON string. |
| `steps` | `string[]` | at least 1. In multipart requests, send it as a JSON string. |
| `prepTime`, `cookTime` | number | minutes, 0–1440 |
| `servings` | number | 1–100 |
| `image` | file | optional. JPG/PNG/WEBP/GIF, max 5 MB. |
| `removeImage` | `"true"` | PUT only. Removes the current photo. |

Validation errors return `400` with per-field messages:

```json
{ "message": "Please fix the highlighted fields", "errors": { "title": "Title is required" } }
```

**Example recipe response**

```json
{
  "id": "6ad6…",
  "title": "Tomato Egg Fried Rice",
  "description": "A quick weeknight fried rice…",
  "ingredients": [{ "name": "rice", "quantity": "2 cups" }],
  "steps": ["Beat the eggs…"],
  "prepTime": 10, "cookTime": 15, "servings": 2,
  "imageUrl": "/uploads/1792410970389-f1d33f9d5a5f.jpg",
  "aiGenerated": false,
  "author": { "id": "6ad5…", "name": "Demo Chef" },
  "likesCount": 2, "likedByMe": true, "savedByMe": false,
  "createdAt": "2026-10-19T11:00:00.000Z", "updatedAt": "…"
}
```

### AI

| Method | Path | Body |
| --- | --- | --- |
| POST | `/ai/recipe-suggestions` | `{ ingredients: string[], cuisine?, diet?, difficulty?, maxTime? }` |

- `ingredients`: 1–20 items, each up to 40 characters.
- `diet`: one of `none`, `vegetarian`, `vegan`, `gluten-free`, `dairy-free`, `keto`, `high-protein`.
- `difficulty`: one of `any`, `Easy`, `Medium`, `Hard`.
- `maxTime`: total minutes.
- Rate limit: 10 requests per IP per minute.

Response:

```json
{
  "source": "ai",
  "notice": "only present when source is \"database\"",
  "suggestions": [
    {
      "id": "ai-0",
      "name": "Shakshuka",
      "description": "Eggs poached in a spiced tomato sauce.",
      "cuisine": "Middle Eastern",
      "difficulty": "Easy",
      "prepTime": 10, "cookTime": 20, "servings": 2,
      "availableIngredients": [{ "name": "eggs", "quantity": "4" }],
      "missingIngredients": [{ "name": "cumin", "quantity": "1 tsp" }],
      "matchPercentage": 50,
      "steps": ["…"],
      "imageUrl": "",
      "recipeId": "only for database matches"
    }
  ]
}
```

---

## How the AI Recipe Finder works

1. **Request.** The React page sends your ingredients and preferences to `POST /api/ai/recipe-suggestions`.
2. **Input validation.** `aiController.js` checks the input: it must be a list of 1–20 ingredients, and unknown preference values are dropped.
3. **Calling Gemini.** `aiService.js` calls Gemini with *structured output* (`responseMimeType: 'application/json'` plus `responseJsonSchema`), so the reply is JSON with predictable fields. The prompt asks for **every** ingredient a recipe needs, including salt and oil.
4. **Checking the reply.** The server never trusts the model's claims:
   - Incomplete suggestions are dropped.
   - Times and difficulty are normalised.
   - Every ingredient is compared against what you typed (`recipeMatcher.js`) to decide whether you **have** it or **need** it.
   - The match percentage is calculated on the server.
5. **Fallback when Gemini is unavailable.** If the key is missing, invalid, rate-limited or the response is unusable, the server falls back to `findDatabaseMatches()`. That function searches real community recipes and returns them with `source: "database"` and a notice explaining why. The UI shows a yellow banner instead of the AI banner.

---

## Switching image storage to Cloudinary (optional)

Local uploads are fine for development. Hosting platforms such as Render or Railway have temporary disks, so use Cloudinary in production:

1. Install the packages:
   ```bash
   # inside backend/
   npm install cloudinary multer-storage-cloudinary
   ```
2. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` to `backend/.env`.
3. In `middleware/upload.js`, replace `multer.diskStorage(...)` with:
   ```js
   import { v2 as cloudinary } from 'cloudinary';
   import { CloudinaryStorage } from 'multer-storage-cloudinary';
   cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET,
   });
   const storage = new CloudinaryStorage({
     cloudinary,
     params: { folder: 'recipes', allowed_formats: ['jpg', 'png', 'webp', 'gif'] },
   });
   ```
4. In `recipeController.js`, save `req.file.path` (the full Cloudinary URL) instead of `/uploads/${req.file.filename}`.
5. To delete images, store `req.file.filename` (the Cloudinary public id) and call `cloudinary.uploader.destroy(publicId)` in `deleteUploadedFile`.

The frontend needs no changes: `imageSrc()` already passes full `https://` URLs through unchanged.

---

## Putting the project on GitHub

1. Create an **empty** repository on GitHub, without a README or .gitignore.
2. Run the following from `recipe-sharing-app/`:

```bash
git init          # skip if already a repository
git add .
git status        # check: no .env files, no node_modules, no uploads
git commit -m "feat: recipe sharing app with AI recipe finder"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

`.gitignore` already excludes `node_modules/`, `.env` files, uploaded images and build output. **Never commit `backend/.env`.** If a key ever ends up on GitHub, revoke it in Google AI Studio immediately.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `MongoDB connection failed: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running. Start it (see Setup step 1) or use an Atlas URI. |
| `/api/health` returns 403 / `Server: AirTunes` | macOS AirPlay Receiver uses port 5000. Keep `PORT=5050`, or turn off AirPlay Receiver in System Settings. |
| Frontend says "Cannot reach the server" | The backend is not running, or `VITE_API_URL` is wrong. Restart Vite after changing `.env`. |
| CORS error in the browser console | `CLIENT_URL` in `backend/.env` must match the frontend URL exactly. |
| AI page always shows "community recipes" | `GEMINI_API_KEY` is missing or invalid. The yellow banner explains which. The backend logs `[AI] request failed: …`. |
