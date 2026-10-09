# Reps

[![CI](https://github.com/GianSegura/reps/actions/workflows/ci.yml/badge.svg)](https://github.com/GianSegura/reps/actions/workflows/ci.yml)

**Log your sets. Next time, you'll know what you lifted.**

Reps is a tiny workout logger. Pick today's day, and every exercise is
pre-filled with the weight and reps from last time. No ads, no account, no
subscription, no tracking — your data stays on your device.

**Open it:** https://giansegura.github.io/reps/

> The interface is in Spanish for now.

## Install on your phone

Reps is a web app that installs like a native one and works offline.

- **iPhone (Safari):** Share → Add to Home Screen
- **Android (Chrome):** menu ⋮ → Install app

Installing it also protects your data: on iPhone, Safari may clear the data
of websites you haven't opened in a while, but installed apps are exempt.

## Your data

- Everything is stored in your browser (`localStorage`). There is no server.
- The app makes no requests to third parties — fonts and icons are bundled.
- **Back up regularly:** Plans → *Exportar copia* saves a JSON file;
  *Importar copia* restores it (replacing current data). Use it to move to a
  new phone too.

## Features

- Several training plans, one active at a time.
- Plans you can duplicate; days and exercises you can edit and reorder.
- Each workout is pre-filled from your last session of that day.
- Notes per exercise, carried over to the next session.
- An unfinished workout is kept if you close the app.

## Development

Requires Node 22 (`nvm use`).

```bash
npm install
npm run dev      # http://localhost:5173/reps/
npm test         # unit and component tests (Vitest)
npm run test:e2e # end-to-end tests (Playwright); first run: npx playwright install chromium
npm run lint
npm run build && npm run preview
```

Pushing to `main` deploys to GitHub Pages.

## Contributing

Issues and pull requests are welcome.

- `main` is protected: changes go through pull requests, which are
  squash-merged.
- PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat: …`, `fix: …`, `docs: …`), because the title becomes the commit
  message on `main`.
- CI runs lint, unit tests, the build and end-to-end tests on every PR; a
  failing check blocks the merge and the deploy.
- Report security issues privately — see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
