const isLocalFrontend =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE_URL = isLocalFrontend
  ? 'http://localhost:3000'
  : '/api';
