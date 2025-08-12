import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bookshare-token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (userData) => api.post('/register', userData),
  login: (credentials) => api.post('/login', credentials),
  logout: () => api.post('/logout'),
  getCurrentUser: () => api.get('/user'),
  getUserStats: () => api.get('/user-stats'),
};

// Books API
export const booksAPI = {
  getAllBooks: () => api.get('/books'),
  createBook: (bookData) => api.post('/books', bookData),
  searchBooks: (query) => api.get(`/search?q=${encodeURIComponent(query)}`),
  borrowBook: (bookId) => api.post(`/borrow/${bookId}`),
  purchaseBook: (bookId) => api.post(`/purchase/${bookId}`),
  returnBook: (bookId) => api.post(`/return/${bookId}`),
  makeBookAvailable: (bookId) => api.post(`/books/${bookId}/available`),
};

// Reviews API
export const reviewsAPI = {
  getBookReviews: (bookId) => api.get(`/reviews/${bookId}`),
  createReview: (bookId, reviewData) => api.post(`/reviews/${bookId}`, reviewData),
};

export default api;
