declare const __APP_BACKEND_URL__: string;

declare global {
  interface Window {
    __FRIDGE_CHEF_API_URL__?: string;
  }
}

function getFallbackBackendBase(): string {
  if (typeof window !== 'undefined' && window.__FRIDGE_CHEF_API_URL__) {
    return window.__FRIDGE_CHEF_API_URL__.replace(/\/+$/, '');
  }
  if (typeof __APP_BACKEND_URL__ === 'string' && __APP_BACKEND_URL__.startsWith('http')) {
    return __APP_BACKEND_URL__.replace(/\/+$/, '');
  }
  return '';
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const isLocalFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
  const fallbackBase = getFallbackBackendBase();

  if (isLocalFile && fallbackBase) {
    return fetch(`${fallbackBase}${normalizedPath}`, init);
  }

  const res = await fetch(normalizedPath, init);
  if ((res.status === 404 || res.status === 405) && fallbackBase) {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    if (currentOrigin !== fallbackBase) {
      return fetch(`${fallbackBase}${normalizedPath}`, init);
    }
  }
  return res;
}
