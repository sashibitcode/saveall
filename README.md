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

Set these Render environment variables (optional/recommended):

- `FRONTEND_ORIGIN`: the primary deployed Vercel URL (e.g. `https://saveall.vercel.app`)
- `FRONTEND_ORIGINS`: optional comma-separated list of all deployed Vercel/custom frontend URLs
- `PUBLIC_API_URL`: canonical public HTTPS URL of the backend (e.g. `https://saveall-api.onrender.com`)
- `INSTAGRAM_COOKIES_B64`: optional base64-encoded `cookies.txt` for restricted Instagram content; public links do not need it
- `YOUTUBE_COOKIES_B64`: optional base64-encoded `cookies.txt` for YouTube access when YouTube blocks datacenter IPs

Set this Vercel environment variable for Production (optional, defaults to `https://saveall-api.onrender.com`):

- `VITE_API_URL` (or `VITE_API_BASE_URL`): the deployed Render service URL

See [.env.example](.env.example) for details.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
