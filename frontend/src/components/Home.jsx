import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="main-container">
      <div className="container">
        <div className="p-4 mb-4 bg-light rounded-3 shadow-sm">
          <h1 className="display-5 fw-bold text-primary">Welcome to Book Sharing!</h1>
          {isAuthenticated && (
            <div className="mb-3">
              <h2 className="text-success">Hello, {user?.username}!</h2>
            </div>
          )}
          <p className="lead">Promote book reuse, save money, and join a community of readers!</p>
          <div className="alert alert-info mt-3">
            <strong>New!</strong> Now you can rate and review every book you borrow or buy. Help others discover great reads!
          </div>
          
          <div className="row mt-4">
            <div className="col-md-4">
              <div className="card text-center shadow-sm">
                <div className="card-body">
                  <div className="feature-icon">🌱</div>
                  <h5 className="card-title">Eco Impact</h5>
                  <p className="card-text">Over <strong>500</strong> books reused, saving trees and reducing waste.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center shadow-sm">
                <div className="card-body">
                  <div className="feature-icon">👥</div>
                  <h5 className="card-title">Community</h5>
                  <p className="card-text">Join <strong>200+</strong> active readers and book lovers in your area.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center shadow-sm">
                <div className="card-body">
                  <div className="feature-icon">💸</div>
                  <h5 className="card-title">Savings</h5>
                  <p className="card-text">Members have saved over <strong>$2,000</strong> by borrowing and buying used books.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title h4">Why Use Book Sharing?</h2>
                <ul className="list-group list-group-flush">
                  <li className="list-group-item"><strong>Save Money:</strong> Borrow books for free or buy used books at low prices.</li>
                  <li className="list-group-item"><strong>Eco-Friendly:</strong> Reduce waste and promote sustainability by reusing books.</li>
                  <li className="list-group-item"><strong>Community:</strong> Connect with local readers and share your favorite books.</li>
                  <li className="list-group-item"><strong>Easy to Use:</strong> Simple interface for listing, searching, borrowing, and reviewing books.</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100 shadow-sm">
              <div className="card-body">
                <h2 className="card-title h4">How It Works</h2>
                <ol className="list-group list-group-numbered">
                  <li className="list-group-item"><strong>Register</strong> for a free account.</li>
                  <li className="list-group-item"><strong>Browse</strong> or <strong>search</strong> for books you want to borrow or buy.</li>
                  <li className="list-group-item"><strong>List</strong> your own books for others to borrow or purchase.</li>
                  <li className="list-group-item"><strong>Request</strong> to borrow or buy, and leave reviews after reading.</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div className="card mt-4 shadow-sm">
          <div className="card-body">
            <h2 className="card-title h4">Featured Categories</h2>
            <div className="d-flex flex-wrap gap-2">
              <span className="badge bg-primary">Fiction & Literature</span>
              <span className="badge bg-secondary">Academic & Textbooks</span>
              <span className="badge bg-success">Children's Books</span>
              <span className="badge bg-info text-dark">Non-fiction & Biographies</span>
              <span className="badge bg-warning text-dark">Comics & Graphic Novels</span>
            </div>
          </div>
        </div>

        <div className="card mt-4 shadow-sm">
          <div className="card-body">
            <h2 className="card-title h4">What Our Users Say</h2>
            <div className="testimonial">
              <p>"I found rare books and made new friends. BookShare is a game changer!"</p>
              <footer className="text-muted">— Priya, Chennai</footer>
            </div>
            <div className="testimonial">
              <p>"Borrowing textbooks saved me a lot of money this semester."</p>
              <footer className="text-muted">— Rahul, Bangalore</footer>
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <h4>Ready to start your reading journey?</h4>
          {!isAuthenticated ? (
            <Link to="/register" className="btn btn-primary btn-lg mt-2">Join Now</Link>
          ) : (
            <Link to="/books" className="btn btn-primary btn-lg mt-2">Browse Books</Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
