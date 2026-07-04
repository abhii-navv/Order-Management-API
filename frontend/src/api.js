import axios from 'axios';

// ── Base Instance ──────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 15000, // 15-second timeout to surface slow responses early
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ────────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Attach a timestamp so the response interceptor can measure latency
    config.metadata = { startTime: Date.now() };
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ───────────────────────────────────────────────────────

/**
 * Retry configuration for transient network errors.
 * We retry up to MAX_RETRIES times with exponential back-off.
 */
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => {
    // Log response latency in development for performance awareness
    if (import.meta.env.DEV && response.config.metadata) {
      const ms = Date.now() - response.config.metadata.startTime;
      console.debug(`[API] ${response.config.method?.toUpperCase()} ${response.config.url} — ${ms}ms`);
    }
    return response;
  },
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;

    // ── Authentication failure: clear session and redirect to login ────────────
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Avoid redirect loops if already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // ── Server errors & network timeouts: retry with exponential back-off ──────
    const isNetworkError  = !error.response; // no response = connection/timeout issue
    const isServerError   = status >= 500 && status < 600;
    const isRetryable     = isNetworkError || isServerError;
    const retryCount      = config._retryCount || 0;

    if (isRetryable && retryCount < MAX_RETRIES) {
      config._retryCount = retryCount + 1;
      const delay = RETRY_DELAY_MS * Math.pow(2, retryCount); // 500ms, 1000ms
      console.warn(
        `[API] Retrying (${config._retryCount}/${MAX_RETRIES}) ${config.method?.toUpperCase()} ` +
        `${config.url} after ${delay}ms — ${isNetworkError ? 'network error' : `HTTP ${status}`}`
      );
      await sleep(delay);
      return api(config); // re-issue the same request
    }

    // ── Normalise error message for consistent UI consumption ─────────────────
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      null;

    const friendlyMessage =
      serverMessage ||
      (isNetworkError
        ? 'Network error — please check your connection and try again.'
        : `Request failed with status ${status}.`);

    // Attach a normalised message so every component can do `err.friendlyMessage`
    error.friendlyMessage = friendlyMessage;

    return Promise.reject(error);
  }
);

export default api;
