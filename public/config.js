// CampusBookShare Global API Configuration
// Automatically detects local development vs production Vercel deployment

const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

// Supports local override if set in browser localStorage
const customApiUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('CUSTOM_API_URL') : null;

const API_BASE_URL = customApiUrl
    ? customApiUrl
    : (isLocalhost
        ? (window.location.port === '8080' ? window.location.origin : 'http://localhost:8080')
        : 'https://book-sharer.vercel.app');

// Provide API_BASE_URI alias for compatibility
const API_BASE_URI = API_BASE_URL;
window.API_BASE_URL = API_BASE_URL;
window.API_BASE_URI = API_BASE_URL;
