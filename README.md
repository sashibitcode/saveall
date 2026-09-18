# SAVEALL

SAVEALL is a React/Vite frontend with a FastAPI download API.

## Local development

```powershell
npm install
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
npm run dev
```

The Vite dev server proxies `/api` to the local FastAPI server.

## Production deployment

The backend is configured for Render through [render.yaml](render.yaml). FFmpeg is supplied by the Python `imageio-ffmpeg` dependency, then FastAPI starts on Render's `$PORT`.

Set these Render environment variables:

- `FRONTEND_ORIGIN`: the deployed Vercel URL
- `PUBLIC_API_URL`: the deployed Render service URL

Set this Vercel environment variable for Production and redeploy:

- `VITE_API_BASE_URL`: the deployed Render service URL

See [.env.example](.env.example) for the required variable names.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
