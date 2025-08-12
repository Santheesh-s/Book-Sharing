import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { booksAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AddBook = () => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    forSale: false,
    price: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();
  const { refreshUserStats } = useAuth();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }
    
    if (formData.forSale && (!formData.price || formData.price <= 0)) {
      newErrors.price = 'Price must be greater than 0 for books marked for sale';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const bookData = {
        ...formData,
        price: formData.forSale ? parseFloat(formData.price) : 0
      };
      
      await booksAPI.createBook(bookData);
      refreshUserStats();
      navigate('/dashboard');
    } catch (error) {
      setErrors({ 
        general: error.response?.data?.error || 'Failed to add book' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow-sm">
              <div className="card-body">
                <h2 className="card-title mb-4">List a Book</h2>
                
                {errors.general && (
                  <div className="alert alert-danger">
                    {errors.general}
                  </div>
                )}
                
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="title" className="form-label">
                      Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      required
                    />
                    {errors.title && (
                      <div className="error-message">{errors.title}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="author" className="form-label">
                      Author <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.author ? 'is-invalid' : ''}`}
                      id="author"
                      name="author"
                      value={formData.author}
                      onChange={handleChange}
                      required
                    />
                    {errors.author && (
                      <div className="error-message">{errors.author}</div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      id="description"
                      name="description"
                      rows="4"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Brief description of the book condition, genre, etc."
                    />
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="forSale"
                        name="forSale"
                        checked={formData.forSale}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="forSale">
                        For Sale
                      </label>
                    </div>
                    <small className="form-text text-muted">
                      Check this if you want to sell the book instead of lending it
                    </small>
                  </div>

                  {formData.forSale && (
                    <div className="mb-3">
                      <label htmlFor="price" className="form-label">
                        Price (USD) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                      />
                      {errors.price && (
                        <div className="error-message">{errors.price}</div>
                      )}
                    </div>
                  )}

                  <div className="d-flex justify-content-between">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => navigate('/dashboard')}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-success"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="loading-spinner me-2"></span>
                          Adding Book...
                        </>
                      ) : (
                        'Add Book'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBook;
