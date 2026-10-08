# TBI Program

SvelteKit site, statically built and deployed to GitHub Pages.

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build      # outputs to build/
npm run preview
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds with
`BASE_PATH=/tbi-program` and publishes `build/` to GitHub Pages.
