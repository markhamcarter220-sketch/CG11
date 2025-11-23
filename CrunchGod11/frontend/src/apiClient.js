const API_KEY = import.meta.env.VITE_BB_API_KEY;
const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export async function apiGet(path) {
  const url = path.startsWith('http') ? path : `${BACKEND_BASE}${path}`;

  const res = await fetch(url, {
    headers: {
      'x-betterbets-key': API_KEY,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}
