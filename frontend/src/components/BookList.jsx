import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { booksAPI } from '../services/api';

const BookList = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const { user, refreshUserStats } = useAuth();

  const fetchBooks = async (query = '') => {
    try {
      setLoading(true);
      let response;
      if (query.trim()) {
        response = await booksAPI.searchBooks(query);
      } else {
        response = await booksAPI.getAllBooks();
      }
      setBooks(response.data);
    } catch (error) {
      console.error('Failed to fetch books:', error);
      showMessage('Failed to fetch books', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchBooks(searchQuery);
  };

  const handleBorrow = async (bookId) => {
    try {
      const response = await booksAPI.borrowBook(bookId);
      showMessage(`Borrow request submitted. ${response.data.ownerPhone ? `Contact owner at: ${response.data.ownerPhone}` : ''}`, 'success');
      fetchBooks(searchQuery);
      refreshUserStats();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to submit borrow request', 'error');
    }
  };

  const handlePurchase = async (bookId) => {
    try {
      const response = await booksAPI.purchaseBook(bookId);
      showMessage(`Purchase request submitted. ${response.data.ownerPhone ? `Contact owner at: ${response.data.ownerPhone}` : ''}`, 'success');
      fetchBooks(searchQuery);
      refreshUserStats();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to submit purchase request', 'error');
    }
  };

  const handleMakeAvailable = async (bookId) => {
    if (window.confirm('Make this book available again?')) {
      try {
        await booksAPI.makeBookAvailable(bookId);
        showMessage('Book is now available', 'success');
        fetchBooks(searchQuery);
        refreshUserStats();
      } catch (error) {
        showMessage(error.response?.data?.error || 'Failed to make book available', 'error');
      }
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  if (loading) {
    return (
      <div className="main-container">
        <div className="container text-center">
          <div className="loading-spinner"></div>
          <p>Loading books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <div className="container">
        <h2 className="mb-4">Browse Books</h2>
        
        {message && (
          <div className={`alert alert-${messageType === 'error' ? 'danger' : 'success'} alert-dismissible fade show`}>
            {message}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setMessage('')}
            ></button>
          </div>
        )}

        <form onSubmit={handleSearch} className="search-form">
          <div className="input-group mb-4">
            <input
              type="text"
              className="form-control"
              placeholder="Search for books by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
            {searchQuery && (
              <button 
                type="button" 
                className="btn btn-outline-secondary"
                onClick={() => {
                  setSearchQuery('');
                  fetchBooks();
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>

        <div className="row">
          {books.length === 0 ? (
            <div className="col-12">
              <div className="text-center py-5">
                <h4>No books found</h4>
                <p className="text-muted">
                  {searchQuery ? 'Try adjusting your search terms' : 'Be the first to add a book!'}
                </p>
              </div>
            </div>
          ) : (
            books.map(book => (
              <div key={book.id} className="col-md-6 col-lg-4 mb-4">
                <div className="card book-card h-100">
                  <div className="card-body">
                    <h5 className="card-title">
                      {book.title}
                      <small className="text-muted d-block">{book.author}</small>
                    </h5>
                    
                    {book.description && (
                      <p className="card-text">{book.description}</p>
                    )}
                    
                    <div className="mb-2">
                      {book.forSale ? (
                        <span className="badge bg-success">
                          For Sale: ${book.price}
                        </span>
                      ) : (
                        <span className="badge bg-primary">
                          Available to Borrow
                        </span>
                      )}
                    </div>
                    
                    {book.ownerPhone && (
                      <p className="card-text">
                        <strong>Owner Phone:</strong> {book.ownerPhone}
                      </p>
                    )}
                    
                    <div className="mt-auto">
                      {book.available ? (
                        <div>
                          <button
                            className={`btn btn-${book.forSale ? 'warning' : 'success'} me-2`}
                            onClick={() => book.forSale ? handlePurchase(book.id) : handleBorrow(book.id)}
                          >
                            {book.forSale ? 'Purchase' : 'Borrow'}
                          </button>
                        </div>
                      ) : (
                        <span className="badge bg-secondary">Not Available</span>
                      )}
                      
                      {user && user.userId === book.ownerId && !book.available && (
                        <button
                          className="btn btn-outline-success ms-2"
                          onClick={() => handleMakeAvailable(book.id)}
                        >
                          Make Available
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BookList;
