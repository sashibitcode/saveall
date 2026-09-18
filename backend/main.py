from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from urllib.parse import quote, urlparse

import mimetypes
import os
import shutil
import tempfile
import yt_dlp
from imageio_ffmpeg import get_ffmpeg_exe

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:5175").rstrip("/")
PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "http://127.0.0.1:8000").rstrip("/")


def resolve_executable(name: str):
    if shutil.which(name):
        return shutil.which(name)
    if shutil.which(name + ".exe"):
        return shutil.which(name + ".exe")
    root = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages")
    if os.path.isdir(root):
        for dirpath, _, filenames in os.walk(root):
            if name in filenames or (name + ".exe") in filenames:
                candidate = os.path.join(dirpath, name if name in filenames else name + ".exe")
                if os.path.isfile(candidate):
                    return candidate
    return None


FFMPEG_PATH = resolve_executable("ffmpeg.exe") or resolve_executable("ffmpeg") or get_ffmpeg_exe()
FFPROBE_PATH = resolve_executable("ffprobe.exe") or resolve_executable("ffprobe")
NODE_PATH = resolve_executable("node.exe") or resolve_executable("node")
FFMPEG_DIR = os.path.dirname(FFMPEG_PATH) if FFMPEG_PATH else None

if FFMPEG_PATH:
    os.environ["PATH"] = f"{FFMPEG_DIR}{os.pathsep}{os.environ.get('PATH', '')}"
    os.environ["FFMPEG_PATH"] = FFMPEG_PATH
if FFPROBE_PATH:
    os.environ["FFPROBE_PATH"] = FFPROBE_PATH
if NODE_PATH:
    os.environ["NODE_PATH"] = NODE_PATH

app = FastAPI(
    title="SAVEALL API",
    description="Backend API for SAVEALL",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        FRONTEND_ORIGIN,
    ] if origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
DOWNLOAD_DIR = os.getenv(
    "DOWNLOAD_DIR",
    os.path.join(tempfile.gettempdir(), "saveall-downloads"),
)

os.makedirs(DOWNLOAD_DIR, exist_ok=True)

@app.get("/")
def home():
    return {
        "message": "SAVEALL API is running!",
        "status": "success",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

    


class DownloadRequest(BaseModel):
    platform: str
    url: str


@app.post("/download")
def download_video(request: DownloadRequest):
    if request.platform not in ["YouTube", "Instagram"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported platform."
        )

    if not request.url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL."
        )

        return {
        "status": "ready",
        "message": "Authorized download request received.",
        "platform": request.platform,
        "url": request.url,
    }


@app.get("/download-folder")
def download_folder():
    return {
        "folder": DOWNLOAD_DIR,
        "exists": os.path.exists(DOWNLOAD_DIR),
    }


def find_downloaded_file(title: str = None):
    valid_ext = {".mp4", ".webm", ".mkv", ".avi", ".flv", ".m4v", ".mov", ".mp3", ".m4a"}
    candidates = []

    for entry in os.scandir(DOWNLOAD_DIR):
        if not entry.is_file():
            continue
        if entry.name.endswith(".part"):
            continue

        name = entry.name.lower()
        ext = os.path.splitext(name)[1]
        if ext not in valid_ext:
            continue

        if title is not None:
            title_lower = title.lower()
            if title_lower in name:
                candidates.append(entry.path)
            elif "".join(ch for ch in title_lower if ch.isalnum() or ch in " -_.") in "".join(ch for ch in name if ch.isalnum() or ch in " -_."):
                candidates.append(entry.path)
        else:
            candidates.append(entry.path)

    if not candidates:
        return None

    return max(candidates, key=os.path.getmtime)


@app.get("/download-file")
def download_file(filename: str):
    safe_name = os.path.basename(filename)
    file_path = os.path.join(DOWNLOAD_DIR, safe_name)

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found.")

    media_type, _ = mimetypes.guess_type(file_path)
    return FileResponse(file_path, media_type=media_type or "application/octet-stream", filename=safe_name)


def is_valid_youtube_url(url: str) -> bool:
    parsed = urlparse(url.strip())
    host = (parsed.netloc or "").lower()
    if not parsed.scheme or not parsed.netloc:
        return False
    if parsed.scheme not in {"http", "https"}:
        return False
    allowed_hosts = {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be",
    }
    return host in allowed_hosts or host.endswith(".youtube.com")


def is_valid_instagram_url(url: str) -> bool:
    parsed = urlparse(url.strip())
    host = (parsed.netloc or "").lower()
    if not parsed.scheme or not parsed.netloc:
        return False
    if parsed.scheme not in {"http", "https"}:
        return False
    if host not in {"instagram.com", "www.instagram.com", "m.instagram.com", "www.instagram.com"}:
        return False
    path = parsed.path.lower()
    return any(segment in path for segment in ["/reel/", "/p/", "/tv/"])


@app.post("/download-youtube")
def download_youtube(request: DownloadRequest):
    if request.platform != "YouTube":
        raise HTTPException(
            status_code=400,
            detail="This endpoint is only for YouTube."
        )

    youtube_url = request.url.strip()
    if not is_valid_youtube_url(youtube_url):
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL."
        )

    try:
        output_template = os.path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s")
        ydl_options = {
            "format": "18/best[ext=mp4]/best",
            "outtmpl": output_template,
            "noplaylist": True,
            "merge_output_format": "mp4",
            "ffmpeg_location": FFMPEG_DIR,
            "quiet": False,
            "no_warnings": False,
            "skip_download": False,
            "restrictfilenames": False,
            "nocheckcertificate": True,
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            "extractor_args": {
                "youtube": {
                    "player_client": ["android_vr"],
                }
            },
            "paths": {"home": DOWNLOAD_DIR},
        }
        if NODE_PATH:
            ydl_options["js_runtimes"] = {"node": {"executable": NODE_PATH}}

        with yt_dlp.YoutubeDL(ydl_options) as ydl:
            info = ydl.extract_info(youtube_url, download=True)

        if not info:
            raise HTTPException(
                status_code=500,
                detail="YouTube metadata extraction returned no results."
            )

        title = info.get("title") or "youtube-video"
        downloaded_file = find_downloaded_file(title) or find_downloaded_file()
        file_name = os.path.basename(downloaded_file) if downloaded_file else None

        if not file_name:
            raise HTTPException(
                status_code=500,
                detail="YouTube file was not saved successfully."
            )

        return {
            "status": "ready",
            "message": "YouTube video is ready to download.",
            "title": title,
            "url": youtube_url,
            "file_name": file_name,
            "download_url": f"{PUBLIC_API_URL}/download-file?filename={quote(file_name)}",
        }

    except HTTPException:
        raise
    except Exception as error:
        print("YT-DLP ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail=f"Unable to process YouTube URL: {error}"
        )


@app.post("/download-instagram")
def download_instagram(request: DownloadRequest):
    if request.platform != "Instagram":
        raise HTTPException(
            status_code=400,
            detail="This endpoint is only for Instagram."
        )

    instagram_url = request.url.strip()
    if not is_valid_instagram_url(instagram_url):
        raise HTTPException(
            status_code=400,
            detail="Invalid Instagram URL."
        )

    try:
        output_template = os.path.join(DOWNLOAD_DIR, "%(title)s.%(ext)s")
        node_path = NODE_PATH

        ydl_options = {
            "format": "bestvideo+bestaudio/best",
            "outtmpl": output_template,
            "noplaylist": True,
            "merge_output_format": "mp4",
            "ffmpeg_location": FFMPEG_DIR,
            "quiet": False,
            "no_warnings": False,
            "skip_download": False,
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9",
            },
            "cookiesfrombrowser": ("chrome", "edge", "brave"),
        }
        if node_path:
            ydl_options["js_runtimes"] = {"node": {"executable": node_path}}

        with yt_dlp.YoutubeDL(ydl_options) as ydl:
            info = ydl.extract_info(instagram_url, download=True)

        if not info:
            raise HTTPException(
                status_code=500,
                detail="Instagram metadata extraction returned no results."
            )

        title = info.get("title") or "instagram-video"
        downloaded_file = find_downloaded_file(title) or find_downloaded_file()
        file_name = os.path.basename(downloaded_file) if downloaded_file else None

        if not file_name:
            raise HTTPException(
                status_code=500,
                detail="Instagram file was not saved successfully."
            )

        return {
            "status": "ready",
            "message": "Instagram video is ready to download.",
            "title": title,
            "url": instagram_url,
            "file_name": file_name,
            "download_url": f"{PUBLIC_API_URL}/download-file?filename={quote(file_name)}",
        }

    except HTTPException:
        raise
    except Exception as error:
        message = str(error)
        if "empty media response" in message.lower() or "logged-in" in message.lower() or "cookies" in message.lower():
            detail = "Instagram content is not public or is blocked without browser cookies. Use a public Instagram Reel/Post link or log in with browser cookies."
        else:
            detail = f"Unable to process Instagram URL: {error}"
        print("INSTAGRAM YT-DLP ERROR:", repr(error))
        raise HTTPException(
            status_code=500,
            detail=detail
        )