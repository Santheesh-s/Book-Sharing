# Book Sharing Platform - React + Go

A modern book sharing platform built with React frontend and Go backend, allowing users to list, borrow, and purchase used books.

## 🚀 Tech Stack

**Frontend:**
- React 18
- Vite
- React Router
- Axios
- Bootstrap 5

**Backend:**
- Go 1.21+
- Gin web framework
- MongoDB with Mongo Driver
- Session-based authentication

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **Go** (v1.21 or higher)
- **MongoDB** (local installation or MongoDB Atlas)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd book-sharing
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` file with your MongoDB connection string:

```env
MONGODB_URI=mongodb://localhost:27017/booksharing
PORT=8080
NODE_ENV=development
```

### 3. Install Dependencies

Install all dependencies (both frontend and backend):

```bash
npm run install-all
```

Or install separately:

```bash
# Install Go dependencies
npm run install-backend

# Install frontend dependencies  
npm run install-frontend
```

### 4. Run the Application

#### Development Mode (Recommended)

Run both frontend and backend concurrently:

```bash
npm run dev
```

This will start:
- Go backend server on `http://localhost:8080`
- React frontend development server on `http://localhost:3000`

#### Run Separately

**Backend only:**
```bash
npm run dev-backend
# or
go run main.go
```

**Frontend only:**
```bash
npm run dev-frontend
# or
cd frontend && npm run dev
```

### 5. Build for Production

Build the frontend for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## 🗂️ Project Structure

```
book-sharing/
├── main.go                 # Go backend entry point
├── go.mod                  # Go dependencies
├── go.sum                  # Go dependency checksums
├── package.json            # Main package.json with scripts
├── .env.example           # Environment variables template
├── README.md              # This file
└── frontend/              # React frontend
    ├── index.html         # HTML template
    ├── package.json       # Frontend dependencies
    ├── vite.config.js     # Vite configuration
    └── src/
        ├── main.jsx       # React entry point
        ├── App.jsx        # Main App component
        ├── index.css      # Global styles
        ├── components/    # React components
        │   ├── Navbar.jsx
        │   ├── Home.jsx
        │   ├── Login.jsx
        │   ├── Register.jsx
        │   ├── Dashboard.jsx
        │   ├── BookList.jsx
        │   ├── AddBook.jsx
        │   └── ProtectedRoute.jsx
        ├── context/       # React Context
        │   └── AuthContext.jsx
        └── services/      # API services
            └── api.js
```

## 🔌 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user info
- `GET /api/user-stats` - Get user statistics

### Books
- `GET /api/books` - Get all books
- `POST /api/books` - Create new book (auth required)
- `GET /api/search?q=query` - Search books
- `POST /api/borrow/:id` - Borrow a book (auth required)
- `POST /api/purchase/:id` - Purchase a book (auth required)
- `POST /api/return/:id` - Return a borrowed book (auth required)
- `POST /api/books/:id/available` - Make book available again (auth required)

### Reviews
- `GET /api/reviews/:id` - Get reviews for a book
- `POST /api/reviews/:id` - Add review for a book (auth required)

## 🎯 Features

### Current Features
- ✅ User registration and authentication
- ✅ Book listing and browsing
- ✅ Book search functionality
- ✅ Borrow and purchase requests
- ✅ User dashboard with statistics
- ✅ Responsive design with Bootstrap
- ✅ Session-based authentication
- ✅ Book availability management

### Planned Features
- 🔄 Book reviews and ratings
- 🔄 User profiles
- 🔄 Advanced search filters
- 🔄 Email notifications
- 🔄 Image upload for books
- 🔄 Messaging system

## 🔧 Development Scripts

```bash
# Install all dependencies
npm run install-all

# Run development servers (both frontend and backend)
npm run dev

# Run only backend
npm run dev-backend

# Run only frontend  
npm run dev-frontend

# Build frontend for production
npm run build

# Start production server
npm start

# Clean build artifacts and node_modules
npm clean
```

## 🌐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | Required |
| `PORT` | Server port | 8080 |
| `NODE_ENV` | Environment mode | development |

## 🚀 Deployment

### Using Docker (Coming Soon)

### Manual Deployment

1. Set up MongoDB on your server
2. Configure environment variables
3. Build the frontend: `npm run build`
4. Run the Go server: `go run main.go`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Issues:**
- Ensure MongoDB is running
- Check your connection string in `.env`
- Verify network connectivity

**Port Already in Use:**
- Change the PORT in `.env` file
- Kill existing processes using the port

**Build Issues:**
- Clear node_modules: `rm -rf frontend/node_modules`
- Reinstall dependencies: `npm run install-frontend`

**CORS Issues:**
- Ensure frontend URL is included in CORS origins in `main.go`

## 📞 Support

If you encounter any issues or have questions, please create an issue in the repository.
