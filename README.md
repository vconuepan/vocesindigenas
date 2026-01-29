# Actually Relevant

AI-curated news platform that evaluates article relevance to humanity using LLM analysis. Crawls news sources, assesses relevance with structured AI analysis, and publishes curated stories.

## Tech Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS
- **Backend:** Express + TypeScript + LangChain + OpenAI
- **Database:** PostgreSQL + pgvector (Prisma ORM)
- **Deployment:** Render.com

## Local Development

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+ (with pgvector extension)
- OpenAI API key

### Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd actually-relevant
   ```

2. Install dependencies:
   ```bash
   cd client && npm install
   cd ../server && npm install
   ```

3. Set up the database:
   ```bash
   # Create the database
   createdb actually_relevant

   # Enable pgvector extension (connect to DB first)
   psql actually_relevant -c 'CREATE EXTENSION IF NOT EXISTS vector;'
   ```

4. Configure environment variables:
   ```bash
   cp server/.env.sample server/.env
   # Edit server/.env with your DATABASE_URL, OPENAI_API_KEY, JWT_SECRET, and PUBLIC_API_KEY
   ```

5. Run database migrations:
   ```bash
   cd server && npx prisma migrate dev
   ```

6. Start development servers:
   ```bash
   # Terminal 1 — Frontend (localhost:5173)
   cd client && npm run dev

   # Terminal 2 — Backend (localhost:3001)
   cd server && npm run dev
   ```

## Deploying to Render.com

This project requires **three services** on Render:

### 1. PostgreSQL Database

1. Create a new PostgreSQL instance on Render
2. Note the connection string (Internal Database URL)
3. Enable pgvector: Connect and run `CREATE EXTENSION IF NOT EXISTS vector;`

### 2. Backend (Web Service)

| Field | Value |
|-------|-------|
| **Root Directory** | `server` |
| **Build Command** | `npm install && npx prisma generate && npm run build` |
| **Start Command** | `npm start` |

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string from step 1 |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `FRONTEND_URL` | Yes (prod) | Frontend URL for CORS |
| `PORT` | No | Defaults to 10000 (Render) / 3001 (local) |
| `JWT_SECRET` | Yes | Random string (32+ chars) for signing JWTs |
| `PUBLIC_API_KEY` | No | API key for public content access (mobile apps, etc.) |

### 3. Frontend (Static Site)

| Field | Value |
|-------|-------|
| **Root Directory** | `client` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes (prod) | Backend API URL |

After deploying the frontend, update the backend's `FRONTEND_URL` to match.

## Project Structure

```
actually-relevant/
├── client/          # React frontend
│   ├── src/         # Source code
│   ├── scripts/     # Build scripts (sitemap, images)
│   ├── dist/        # Built output (gitignored)
│   └── package.json
├── server/          # Express backend
│   ├── src/         # Source code
│   ├── prisma/      # Database schema and migrations
│   ├── dist/        # Built output (gitignored)
│   └── package.json
├── shared/          # Shared types and constants
└── README.md        # This file
```

## Troubleshooting

### Build Fails
Check the build logs. Common issues:
- Missing `Root Directory` setting on Render
- Node version mismatch — add `engines` to package.json if needed
- Missing `npx prisma generate` before server build

### API Calls Fail (CORS Error)
1. Verify `FRONTEND_URL` is set correctly on the backend
2. Ensure it matches exactly (including `https://`, no trailing slash)
3. Redeploy after changing environment variables

### Database Connection Fails
1. Verify `DATABASE_URL` is correct
2. Ensure pgvector extension is installed: `CREATE EXTENSION IF NOT EXISTS vector;`
3. Run migrations: `npx prisma migrate deploy`

### Health Check
```bash
curl https://your-api-url.onrender.com/health
# Should return: {"status":"ok"}
```
