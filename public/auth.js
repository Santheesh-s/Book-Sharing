// Small helper so every page can attach the login token to its API calls,
// since we use a JWT (stored in localStorage) instead of cookies.
// This is needed because our frontend (Firebase) and backend (Vercel) are
// on different domains, and browsers increasingly block cross-site cookies.

function authHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}
