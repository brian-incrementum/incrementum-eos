# eos-incrementum

Next.js 16 app router project that integrates Supabase-authenticated dashboards.

## Development

Install dependencies and start the local dev server.

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm test
```

## Production with Docker Compose

1. Duplicate `.env.production.example` to `.env.production` and provide the required Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Build the image and launch the container:

```bash
docker compose up --build -d
```

3. The web service listens on port `3000` by default. Adjust the mapped port in `docker-compose.yaml` if you need to expose a different port on your VPS.

Rebuild the image whenever dependencies change or when you pull new application code.
