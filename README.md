# League'd Up

One scoreboard for all your fantasy football leagues. This is the Next.js
project shell, currently running on mock data. Real Sleeper, ESPN, and Yahoo
connections are the next step.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: LeagueUp app shell"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/leaguedup.git
git push -u origin main
```

(Create the empty repo on GitHub first, don't let it auto-generate a
README or .gitignore there, it'll conflict with the ones already in this
project.)

## Deploy to Vercel

1. Go to vercel.com, sign in with your GitHub account
2. Click "Add New Project" and select the `leaguedup` repo
3. Vercel auto-detects Next.js, no config changes needed
4. Click Deploy

You'll get a live URL immediately (something like `leaguedup.vercel.app`).
Every push to `main` from here on auto-deploys.

## Project structure

```
leaguedup-app/
  app/
    layout.js       - root HTML shell
    page.js         - renders the app
  components/
    LeagueUpApp.jsx - the whole app (Scoreboard, Help Me Root, Add Leagues)
  package.json
  next.config.js
```

## What's next (not done yet)

- `rawLeagues` in LeagueUpApp.jsx is hardcoded mock data. Real leagues need
  API routes under `app/api/` to fetch from Sleeper, ESPN, and Yahoo, plus a
  database (Supabase) to store which leagues each user has linked.
- The "Synced Xs ago" counter is currently just a fake timer, not tied to a
  real refresh.
- The 4 league slots on the Add Leagues page are fixed. Supporting more than
  4 leagues means making that list dynamic.
