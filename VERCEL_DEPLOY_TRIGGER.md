# Vercel production deployment

This repository is deployed from the connected GitHub `main` branch.

The previous failed Vercel build was not caused by the Vite application code: that deployment received only one deployment file and did not clone the Git repository, so Vite had no `index.html` entry point. Production deployments must therefore be created from the Git-connected `main` branch so the complete application source is present.

The current Vite build is expected to run with `npm run build` and produce `dist/` for Vercel.
