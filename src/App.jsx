import { useCallback, useEffect, useMemo, useState } from "react";
import TwitterIcon from "./icons/twitter.svg";
import FBIcon from "./icons/facebook.svg";
import CopyIcon from "./icons/copy.svg";
import ShareIcon from "./icons/share.svg";
import TelegramIcon from "./icons/telegram.svg";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function formatGeoLocation(lastGeo) {
  if (!lastGeo || typeof lastGeo !== "object") {
    return "";
  }

  const parts = [lastGeo.city, lastGeo.region, lastGeo.country].filter(
    (value) => typeof value === "string" && value.trim(),
  );
  return parts.join(", ");
}

function CreatePage() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortenedUrl, setShortenedUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [myUrls, setMyUrls] = useState([]);
  const [isLoadingMyUrls, setIsLoadingMyUrls] = useState(false);

  const canShare = useMemo(
    () => typeof navigator !== "undefined" && !!navigator.share,
    [],
  );

  const loadMyUrls = useCallback(async () => {
    setIsLoadingMyUrls(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/urls`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load your URLs.");
      }

      const data = await response.json();
      setMyUrls(Array.isArray(data.items) ? data.items : []);
    } catch (requestError) {
      setError(requestError.message || "Failed to load your URLs.");
    } finally {
      setIsLoadingMyUrls(false);
    }
  }, []);

  useEffect(() => {
    void loadMyUrls();
  }, [loadMyUrls]);

  const handleShorten = async () => {
    if (!isValidHttpUrl(originalUrl)) {
      setError("Please enter a valid URL.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setIsCopied(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/short`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: originalUrl }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to shorten URL.");
      }

      const data = await response.json();
      setShortenedUrl(data.shortUrl);
      setOriginalUrl("");
      await loadMyUrls();
    } catch (requestError) {
      setError(requestError.message || "Failed to shorten URL.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!shortenedUrl) {
      return;
    }

    await navigator.clipboard.writeText(shortenedUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!canShare || !shortenedUrl) {
      return;
    }

    try {
      await navigator.share({ url: shortenedUrl });
    } catch (shareError) {
      setError(shareError.message || "Share failed.");
    }
  };

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Create Short URL
          </h1>
          <a
            href="/cdn-cgi/access/logout"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Logout
          </a>
        </div>

        <div className="mt-8 flex flex-col gap-4">
          <label
            className="text-sm font-semibold text-slate-700"
            htmlFor="url-input"
          >
            Original URL
          </label>
          <input
            id="url-input"
            value={originalUrl}
            type="url"
            placeholder="https://example.com"
            onChange={(event) => setOriginalUrl(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
          <button
            type="button"
            onClick={handleShorten}
            disabled={!originalUrl || isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Shortening..." : "Shorten"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {error}
          </p>
        )}

        {shortenedUrl && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <a
              className="break-all text-lg font-bold text-sky-700 hover:text-sky-800"
              href={shortenedUrl}
              target="_blank"
              rel="noreferrer"
            >
              {shortenedUrl}
            </a>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-100"
                aria-label="Copy shortened URL"
              >
                <img src={CopyIcon} alt="Copy" className="h-8 w-8" />
              </button>

              {canShare && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-100"
                  aria-label="Share shortened URL"
                >
                  <img src={ShareIcon} alt="Share" className="h-8 w-8" />
                </button>
              )}

              <a
                className="rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-100"
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shortenedUrl)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on Twitter"
              >
                <img src={TwitterIcon} alt="Twitter" className="h-8 w-8" />
              </a>

              <a
                className="rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-100"
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortenedUrl)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on Facebook"
              >
                <img src={FBIcon} alt="Facebook" className="h-8 w-8" />
              </a>

              <a
                className="rounded-lg border border-slate-200 bg-white p-2 transition hover:bg-slate-100"
                href={`https://t.me/share/url?url=${encodeURIComponent(shortenedUrl)}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Share on Telegram"
              >
                <img src={TelegramIcon} alt="Telegram" className="h-8 w-8" />
              </a>
            </div>

            {isCopied && (
              <p className="mt-3 text-center text-sm font-medium text-emerald-700">
                The shortened URL has been copied to your clipboard.
              </p>
            )}
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            My URLs
          </h2>

          {isLoadingMyUrls ? (
            <p className="mt-3 text-sm text-slate-600">Loading your URLs...</p>
          ) : myUrls.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              You have not created any URLs yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {myUrls.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-3"
                >
                  <a
                    href={item.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-sm font-semibold text-sky-700 hover:text-sky-800"
                  >
                    {item.shortUrl}
                  </a>
                  <p className="mt-1 break-all text-sm text-slate-600">
                    {item.destinationUrl}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                    <span>Clicks: {item.clickCount || 0}</span>
                    {item.topCountry && <span>Top Country: {item.topCountry}</span>}
                    {item.lastClickedAt && (
                      <span>
                        Last Click: {new Date(item.lastClickedAt).toLocaleString()}
                      </span>
                    )}
                    {formatGeoLocation(item.lastGeo) && (
                      <span>Last Geo: {formatGeoLocation(item.lastGeo)}</span>
                    )}
                  </div>
                  {item.createdAt && (
                    <p className="mt-1 text-xs text-slate-500">
                      Created: {new Date(item.createdAt).toLocaleString()}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="mt-5 text-center text-sm text-slate-500">
        <a
          href="https://github.com/LeeCH-OeO/short-url"
          className="hover:text-slate-700"
        >
          © {new Date().getFullYear()} LeeCH-OeO
        </a>
      </footer>
    </section>
  );
}

function PublicPage() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          Short URL
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Redirect links are public. URL creation is protected.
        </p>
        <a
          href="/create"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-sky-700"
        >
          Go to Create Page
        </a>
      </div>
    </section>
  );
}

function App() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const currentUrl = new URL(window.location.href);
    let hasCloudflareParams = false;

    for (const param of currentUrl.searchParams.keys()) {
      if (param.startsWith("__cf_")) {
        hasCloudflareParams = true;
        currentUrl.searchParams.delete(param);
      }
    }

    if (!hasCloudflareParams) {
      return;
    }

    const search = currentUrl.searchParams.toString();
    const cleanUrl = `${currentUrl.pathname}${search ? `?${search}` : ""}${currentUrl.hash}`;
    window.history.replaceState(null, "", cleanUrl);
  }, []);

  const path = typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {path === "/create" ? <CreatePage /> : <PublicPage />}
    </main>
  );
}

export default App;
