import { useState } from "react";
import "./App.css";
import { SITE_CONFIG } from "./config";

// Resolve API Base URL:
// 1. Check VITE_API_URL or VITE_API_BASE_URL
// 2. In production, default to canonical deployed Render backend: https://saveall-api.onrender.com
// 3. In local development, default to /api (proxied by Vite to http://127.0.0.1:8000)
const envApiUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL)?.trim();
const API_BASE_URL = (
  envApiUrl ||
  (import.meta.env.PROD ? "https://saveall-api.onrender.com" : "/api")
).replace(/\/$/, "");

function getApiConfigurationError() {
  if (!import.meta.env.PROD) {
    return "";
  }

  try {
    const parsed = new URL(API_BASE_URL, window.location.origin);
    if (parsed.protocol === "http:" && window.location.protocol === "https:") {
      return "Production API must use HTTPS to prevent browser mixed content blocking.";
    }
    if (["localhost", "127.0.0.1"].includes(parsed.hostname)) {
      return "Production API cannot use localhost. Set VITE_API_URL to the deployed HTTPS Render backend URL.";
    }
  } catch {
    return "API URL configuration is invalid. Please verify VITE_API_URL.";
  }

  return "";
}

async function readApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  const text = await response.text();
  return text ? { detail: text.slice(0, 240), error: text.slice(0, 240) } : {};
}

function isValidYouTubeUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      (host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com")) &&
      parsed.pathname !== "/"
    );
  } catch {
    return false;
  }
}

function isValidInstagramUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      (host === "instagram.com" || host.endsWith(".instagram.com") || host === "instagr.am" || host.endsWith(".instagr.am")) &&
      parsed.pathname.length > 2
    );
  } catch {
    return false;
  }
}

function App() {
  const [platform, setPlatform] = useState("youtube");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState("");

  const handleGetVideo = async () => {
    const cleanUrl = url.trim();

    setError("");
    setResult(null);

    if (!cleanUrl) {
      alert(
        `Please paste a ${
          platform === "youtube" ? "YouTube" : "Instagram"
        } link.`
      );
      return;
    }

    if (platform === "youtube") {
      if (!isValidYouTubeUrl(cleanUrl)) {
        alert("Please enter a valid YouTube video link.");
        return;
      }
    }

    if (platform === "instagram") {
      if (!isValidInstagramUrl(cleanUrl)) {
        alert("Please enter a valid Instagram reel or post link.");
        return;
      }
    }

    setLoading(true);
    setLoadingMessage("Processing video link...");

    // Abort controller with 70s timeout to accommodate Render free tier cold starts
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => {
      setLoadingMessage("Server is waking up from sleep, please allow a few more seconds...");
    }, 15000);

    const abortTimer = setTimeout(() => {
      controller.abort();
    }, 70000);

    try {
      const configurationError = getApiConfigurationError();
      if (configurationError) {
        throw new Error(configurationError);
      }

      const endpoint = `${API_BASE_URL}/download`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          platform: platform === "youtube" ? "YouTube" : "Instagram",
          url: cleanUrl,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutTimer);
      clearTimeout(abortTimer);

      const data = await readApiResponse(response);

      if (!response.ok) {
        const errorMsg =
          data.error ||
          data.detail ||
          (response.status === 400
            ? "Invalid URL or request format."
            : response.status === 404
            ? "API endpoint was not found on the server."
            : response.status === 502 || response.status === 503
            ? "Backend server is temporarily unavailable. Please try again shortly."
            : "Server returned an error while processing the link.");
        throw new Error(errorMsg);
      }

      if (import.meta.env.DEV) {
        console.log("Backend Response:", data);
      }

      setResult({
        platform: data.platform || (platform === "youtube" ? "YouTube" : "Instagram"),
        url: cleanUrl,
        status: data.status || "Ready",
        title: data.title || "Video ready",
        fileName: data.file_name || "",
        downloadUrl: data.download_url || "",
        message: data.message || "Video is ready for download.",
      });
    } catch (err) {
      clearTimeout(timeoutTimer);
      clearTimeout(abortTimer);

      if (import.meta.env.DEV) {
        console.error("Downloader request error:", err);
      }

      if (err.name === "AbortError") {
        setError(
          "Request timed out. The backend server may be waking up from sleep. Please wait a moment and try again."
        );
      } else if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
        setError(
          "Backend server is unavailable or blocked by network/CORS. Please verify the Render backend service is running."
        );
      } else {
        setError(err.message || "Download could not be completed.");
      }
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const handleDownloadFile = () => {
    try {
      if (!result) {
        return;
      }

      let fileUrl = result.downloadUrl;
      if (!fileUrl && result.fileName) {
        fileUrl = `${API_BASE_URL}/download-file?filename=${encodeURIComponent(result.fileName)}`;
      }

      if (!fileUrl) {
        throw new Error("No downloadable file was returned by the server.");
      }

      // Upgrade HTTP to HTTPS if the frontend is loaded over HTTPS to prevent mixed-content blocks
      if (window.location.protocol === "https:" && fileUrl.startsWith("http://")) {
        fileUrl = fileUrl.replace(/^http:\/\//, "https://");
      }

      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = result.fileName || "saveall-download.mp4";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert(err.message || "Download request failed. Please make sure the backend is reachable.");
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">
          <span>S</span> SAVEALL
        </div>

        <div className="nav-badge">VIDEO DOWNLOADER</div>
      </nav>

      <main className="hero">
        <div className="badge">⚡ FAST • SIMPLE • EASY</div>

        <h1>
          Save Your Content,
          <br />
          <span>Your Way.</span>
        </h1>

        <p className="subtitle">
          Paste your video link and get started in seconds.
        </p>

        <div className="download-card">
          {/* Platform Tabs */}
          <div className="tabs">
            <button
              className={`tab ${platform === "youtube" ? "active youtube" : ""}`}
              onClick={() => {
                setPlatform("youtube");
                setUrl("");
                setResult(null);
                setError("");
              }}
            >
              <span className="youtube-icon">▶</span>
              YouTube
            </button>

            <button
              className={`tab ${platform === "instagram" ? "active instagram" : ""}`}
              onClick={() => {
                setPlatform("instagram");
                setUrl("");
                setResult(null);
                setError("");
              }}
            >
              <span className="instagram-icon">◎</span>
              Instagram
            </button>
          </div>

          {/* Selected Platform */}
          <div className="selected-platform">
            <div className="platform-icon">
              {platform === "youtube" ? "▶" : "◎"}
            </div>

            <div>
              <h2>
                {platform === "youtube"
                  ? "YouTube Video Downloader"
                  : "Instagram Video Downloader"}
              </h2>

              <p>
                {platform === "youtube"
                  ? "Paste your YouTube video link below"
                  : "Paste your Instagram reel or post link below"}
              </p>
            </div>
          </div>

          {/* URL Input */}
          <div className="input-area">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                platform === "youtube"
                  ? "https://youtube.com/watch?v=..."
                  : "https://instagram.com/reel/..."
              }
            />

            <button
              className="paste-button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setUrl(text);
                } catch {
                  alert("Please paste the link manually using Ctrl + V.");
                }
              }}
            >
              Paste
            </button>
          </div>

          {/* Get Video */}
          <button
            className="get-button"
            onClick={handleGetVideo}
            disabled={loading}
          >
            {loading ? (loadingMessage || "Processing...") : "Get Video"}
            {!loading && <span>→</span>}
          </button>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div className="result-card">
              <div className="result-icon">✓</div>

              <div className="result-content">
                <span className="result-platform">{result.platform}</span>

                <h3>{result.title}</h3>

                <p>{result.url}</p>

                <span className="result-status">● {result.status}</span>

                <button
                  className="download-button"
                  onClick={handleDownloadFile}
                >
                  Download File
                </button>
              </div>
            </div>
          )}

          <p className="note">
            🔒 Use only content you own or have permission to download.
          </p>
        </div>

        {/* Features */}
        <div className="features">
          <div className="feature">
            <div>⚡</div>
            <span>Fast & Simple</span>
          </div>

          <div className="feature">
            <div>🔒</div>
            <span>Privacy Focused</span>
          </div>

          <div className="feature">
            <div>📱</div>
            <span>Mobile Friendly</span>
          </div>
        </div>
      </main>

      <footer className="site-footer">
        <div className="footer-container">
          {/* Footer Brand */}
          <div className="footer-brand">
            <div className="footer-logo">
              <span>S</span>
              SAVEALL
            </div>

            <p>All-in-One Downloader</p>

            <div className="footer-tagline">
              Fast <span>•</span> Simple <span>•</span> Secure
            </div>
          </div>

          <div className="footer-divider"></div>

          {/* Creator */}
          <div className="creator-section">
            <p className="created-text">Created by</p>

            <div className="creator-name">{SITE_CONFIG.creatorName}</div>

            <div className="creator-brand">{SITE_CONFIG.brandName}</div>
          </div>

          {/* Social Links */}
          <div className="social-links">
            {/* Instagram */}
            <a
              href={SITE_CONFIG.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
              aria-label="Instagram"
              title="Instagram"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" className="fill-dot" />
              </svg>
              <span className="tooltip">Instagram</span>
            </a>

            {/* LinkedIn */}
            <a
              href={SITE_CONFIG.social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
              aria-label="LinkedIn"
              title="LinkedIn"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 8v10" />
                <path d="M6 5.5v.1" />
                <path d="M10 18v-6" />
                <path d="M10 15c0-2.5 1.2-4 3.4-4 2.1 0 3.6 1.4 3.6 4v3" />
                <path d="M17 18v-3" />
              </svg>
              <span className="tooltip">LinkedIn</span>
            </a>

            {/* Gmail */}
            <a
              href={`mailto:${SITE_CONFIG.social.email}`}
              className="social-icon"
              aria-label="Gmail"
              title="Gmail"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M4 7l8 6 8-6" />
              </svg>
              <span className="tooltip">Gmail</span>
            </a>

            {/* GitHub */}
            <a
              href={SITE_CONFIG.social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="social-icon"
              aria-label="GitHub"
              title="GitHub"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 19c-4 1.2-4-2-5.5-2.5M15 19v-3.1c0-.9.3-1.5.8-2C18.4 13.6 21 12.3 21 8.2c0-1.1-.4-2.1-1-2.9.1-.3.4-1.5-.1-2.9 0 0-1.2-.4-3.1 1.1-.9-.3-1.9-.4-2.8-.4s-1.9.1-2.8.4C9.3 2 8.1 2.4 8.1 2.4c-.5 1.4-.2 2.6-.1 2.9-.6.8-1 1.8-1 2.9 0 4.1 2.6 5.4 5.2 5.7.3.3.5.8.5 1.5V19" />
              </svg>
              <span className="tooltip">GitHub</span>
            </a>
          </div>

          {/* Copyright */}
          <div className="footer-bottom">
            <p>© 2026 All-in-One Downloader. All rights reserved.</p>

            <p className="creator-credit">
              Created with <span>♥</span> by{" "}
              <strong>{SITE_CONFIG.creatorName}</strong>
              {" · "}
              <strong>{SITE_CONFIG.brandName}</strong>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;