import { useState } from "react";
import "./App.css";
import { SITE_CONFIG } from "./config";

function App() {
  const [platform, setPlatform] = useState("youtube");
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

const handleGetVideo = async () => {
  const cleanUrl = url.trim();

  setError("");

  if (!cleanUrl) {
    alert(
      `Please paste a ${
        platform === "youtube" ? "YouTube" : "Instagram"
      } link.`
    );
    return;
  }

  if (platform === "youtube") {
    const isYouTube =
      cleanUrl.includes("youtube.com/") ||
      cleanUrl.includes("youtu.be/");

    if (!isYouTube) {
      alert("Please enter a valid YouTube video link.");
      return;
    }
  }

  if (platform === "instagram") {
    const isInstagram =
      cleanUrl.includes("instagram.com/");

    if (!isInstagram) {
      alert("Please enter a valid Instagram video link.");
      return;
    }
  }

  setLoading(true);

  try {
    const endpoint =
      platform === "youtube"
        ? "http://127.0.0.1:8000/download-youtube"
        : "http://127.0.0.1:8000/download-instagram";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: platform === "youtube" ? "YouTube" : "Instagram",
        url: cleanUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Unable to process the link.");
    }

    console.log("Backend Response:", data);

    setResult({
      platform: platform === "youtube" ? "YouTube" : "Instagram",
      url: cleanUrl,
      status: data.status || "Ready",
      title: data.title || "Video ready",
      fileName: data.file_name || "",
      downloadUrl: data.download_url || "",
      message: data.message || "Video ready",
    });
  } catch (error) {
    console.error(error);
    setError(
      error.message || "Backend connection failed. Please make sure the SAVEALL API is running."
    );
  } finally {
    setLoading(false);
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
              }}
            >
              <span className="youtube-icon">▶</span>
              YouTube
            </button>
            {result && (
  <div className="result-card">
    <div className="result-icon">
      ✓
    </div>

    <div className="result-content">
      <span className="result-platform">
        {result.platform}
      </span>

      <h3>Link Ready</h3>

      <p>{result.url}</p>

      <span className="result-status">
        ● {result.status}
      </span>
      <button
  className="download-button"
  onClick={async () => {
    try {
      const fileUrl = result.downloadUrl || `http://127.0.0.1:8000/download-file?filename=${encodeURIComponent(result.fileName || "")}`;

      if (!result.fileName && !result.downloadUrl) {
        throw new Error("No downloadable file was returned by the server.");
      }

      const response = await fetch(fileUrl);

      if (!response.ok) {
        throw new Error("Download failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName || "saveall-download.mp4";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      alert(result.message || "Download started.");
    } catch (error) {
      console.error(error);
      alert(
        error.message || "Download request failed. Please make sure the backend is running."
      );
    }
  }}
>
  Download
</button>
    </div>
  </div>
)}
{error && (
  <div className="error-message">
    ⚠️ {error}
  </div>
)}

            <button
              className={`tab ${platform === "instagram" ? "active instagram" : ""}`}
              onClick={() => {
                setPlatform("instagram");
                setUrl("");
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
                  : "Paste your Instagram video link below"}
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

            <button className="paste-button" onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                setUrl(text);
              } catch {
                alert("Please paste the link manually using Ctrl + V.");
              }
            }}>
              Paste
            </button>
          </div>

          {/* Get Video */}
          <button
  className="get-button"
  onClick={handleGetVideo}
  disabled={loading}
>
  {loading ? "Processing..." : "Get Video"}
  {!loading && <span>→</span>}
</button>

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

      <p>
        All-in-One Downloader
      </p>

      <div className="footer-tagline">
        Fast <span>•</span> Simple <span>•</span> Secure
      </div>
    </div>

    <div className="footer-divider"></div>

    {/* Creator */}
    <div className="creator-section">
      <p className="created-text">
        Created by
      </p>

      <div className="creator-name">
        {SITE_CONFIG.creatorName}
      </div>

      <div className="creator-brand">
        {SITE_CONFIG.brandName}
      </div>
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

      <p>
        © 2026 All-in-One Downloader. All rights reserved.
      </p>

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