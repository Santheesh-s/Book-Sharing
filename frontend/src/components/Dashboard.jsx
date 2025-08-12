import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, userStats, refreshUserStats } = useAuth();

  useEffect(() => {
    refreshUserStats();
  }, []);

  return (
    <div className="main-container">
      <div className="container">
        <div className="p-4 mb-4 bg-light rounded-3 shadow-sm">
          <h1 className="display-5 fw-bold text-primary">Your Book Sharing Dashboard</h1>
          <div className="mb-3">
            <h2 className="text-success">Hello, {user?.username}!</h2>
          </div>
          <p className="lead">Manage your books, requests, and connect with fellow readers.</p>
          
          <div className="row mt-4">
            <div className="col-md-3">
              <div className="stats-card card text-center shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Books Listed</h6>
                  <p className="stats-number">{userStats.booksListed}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stats-card card text-center shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Books Borrowed</h6>
                  <p className="stats-number">{userStats.booksBorrowed}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stats-card card text-center shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Books Sold</h6>
                  <p className="stats-number">{userStats.booksSold}</p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stats-card card text-center shadow-sm">
                <div className="card-body">
                  <h6 className="card-title">Reviews Given</h6>
                  <p className="stats-number">{userStats.reviewsGiven}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="alert alert-success mt-4">
          <strong>Tip:</strong> List more books to earn badges and help the community grow!
        </div>

        <div className="card mt-4 shadow-sm">
          <div className="card-body">
            <h2 className="card-title h4">Quick Actions</h2>
            <div className="quick-actions">
              <Link to="/add-book" className="btn btn-success m-2">Add a New Book</Link>
              <Link to="/books" className="btn btn-primary m-2">Browse All Books</Link>
              <Link to="/books" className="btn btn-outline-info m-2">Search for Books</Link>
            </div>
          </div>
        </div>

        <div className="card mt-4 shadow-sm">
          <div className="card-body">
            <h2 className="card-title h4">Your Activity</h2>
            <ul className="list-unstyled">
              <li className="mb-2">
                <i className="bi bi-book"></i> Books you have listed: <strong>{userStats.booksListed}</strong>
              </li>
              <li className="mb-2">
                <i className="bi bi-bookmark"></i> Books you have borrowed: <strong>{userStats.booksBorrowed}</strong>
              </li>
              <li className="mb-2">
                <i className="bi bi-cash"></i> Books you have sold: <strong>{userStats.booksSold}</strong>
              </li>
              <li className="mb-2">
                <i className="bi bi-star"></i> Reviews you have given: <strong>{userStats.reviewsGiven}</strong>
              </li>
            </ul>
            <p className="text-muted mt-3">
              <em>More personalized stats and features coming soon!</em>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
