const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// In-memory database (temporary solution until MongoDB is available)
const inMemoryDB = {
    users: [],
    books: [],
    reviews: [],
    borrowRequests: [],
    nextId: 1
};

// Helper function to generate IDs
function generateId() {
    return (inMemoryDB.nextId++).toString();
}

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'book-sharing-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 5 * 60 * 1000 }
}));

// Helpers
function requireLogin(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'Authentication required' });
    next();
}

function isStrongPassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

function isValidPhone(phone) {
    return /^\d{10}$/.test(phone);
}

// API Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, phone } = req.body;
        
        // Check if username exists
        const existingUser = inMemoryDB.users.find(u => u.username === username);
        if (existingUser) return res.status(400).json({ error: 'Username already exists' });
        
        // Validate password
        if (!isStrongPassword(password)) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long and include uppercase, lowercase, and a number' });
        }
        
        // Validate phone
        if (!isValidPhone(phone)) {
            return res.status(400).json({ error: 'Please enter a valid 10-digit phone number' });
        }
        
        // Create user
        const user = {
            id: generateId(),
            username,
            password,
            phone
        };
        
        inMemoryDB.users.push(user);
        res.status(201).json({ id: user.id, message: 'User created successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = inMemoryDB.users.find(u => u.username === username && u.password === password);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        req.session.userId = user.id;
        res.json({ message: 'Login successful', username: user.username, userId: user.id });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ message: 'Logout successful' }));
});

app.get('/api/user', async (req, res) => {
    try {
        if (!req.session.userId) return res.json({ loggedIn: false });
        const user = inMemoryDB.users.find(u => u.id === req.session.userId);
        if (!user) return res.json({ loggedIn: false });
        res.json({ loggedIn: true, username: user.username, userId: user.id });
    } catch (error) {
        console.error('Get user error:', error);
        res.json({ loggedIn: false });
    }
});

app.get('/api/user-stats', async (req, res) => {
    try {
        if (!req.session.userId) return res.json({ booksListed: 0, booksBorrowed: 0, booksSold: 0, reviewsGiven: 0 });
        const userId = req.session.userId;
        
        const booksListed = inMemoryDB.books.filter(b => b.ownerId === userId).length;
        const booksBorrowed = inMemoryDB.borrowRequests.filter(br => br.borrowerId === userId).length;
        const booksSold = inMemoryDB.books.filter(b => b.ownerId === userId && b.forSale && !b.available).length;
        const reviewsGiven = inMemoryDB.reviews.filter(r => r.userId === userId).length;
        
        res.json({ booksListed, booksBorrowed, booksSold, reviewsGiven });
    } catch (error) {
        console.error('User stats error:', error);
        res.json({ booksListed: 0, booksBorrowed: 0, booksSold: 0, reviewsGiven: 0 });
    }
});

app.get('/api/books', async (req, res) => {
    try {
        const booksWithPhone = inMemoryDB.books.map(book => {
            const owner = inMemoryDB.users.find(u => u.id === book.ownerId);
            return {
                ...book,
                ownerPhone: owner ? owner.phone : ''
            };
        });
        res.json(booksWithPhone);
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ error: 'Failed to fetch books' });
    }
});

app.post('/api/books', requireLogin, async (req, res) => {
    try {
        const { title, author, description, forSale, price } = req.body;
        const book = {
            id: generateId(),
            title,
            author,
            description,
            forSale,
            price: price || 0,
            ownerId: req.session.userId,
            available: true
        };
        inMemoryDB.books.push(book);
        res.status(201).json({ id: book.id, message: 'Book created successfully' });
    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({ error: 'Failed to create book' });
    }
});

app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        const results = inMemoryDB.books.filter(book => 
            book.title.toLowerCase().includes(q.toLowerCase()) ||
            book.author.toLowerCase().includes(q.toLowerCase())
        );
        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

app.post('/api/borrow/:id', requireLogin, async (req, res) => {
    try {
        const book = inMemoryDB.books.find(b => b.id === req.params.id);
        if (!book || !book.available) return res.status(400).json({ error: 'Book not available' });
        
        const borrow = {
            id: generateId(),
            bookId: book.id,
            borrowerId: req.session.userId,
            status: 'pending'
        };
        inMemoryDB.borrowRequests.push(borrow);
        book.available = false;
        
        const owner = inMemoryDB.users.find(u => u.id === book.ownerId);
        res.json({ message: 'Borrow request submitted', ownerPhone: owner ? owner.phone : 'N/A' });
    } catch (error) {
        console.error('Borrow error:', error);
        res.status(500).json({ error: 'Failed to submit borrow request' });
    }
});

app.post('/api/purchase/:id', requireLogin, async (req, res) => {
    try {
        const book = inMemoryDB.books.find(b => b.id === req.params.id);
        if (!book || !book.available || !book.forSale) return res.status(400).json({ error: 'Book not available for sale' });
        
        book.available = false;
        const owner = inMemoryDB.users.find(u => u.id === book.ownerId);
        res.json({ message: 'Purchase request submitted', ownerPhone: owner ? owner.phone : 'N/A' });
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(500).json({ error: 'Failed to submit purchase request' });
    }
});

app.post('/api/return/:id', requireLogin, async (req, res) => {
    try {
        const borrow = inMemoryDB.borrowRequests.find(br => 
            br.bookId === req.params.id && 
            br.borrowerId === req.session.userId && 
            br.status === 'pending'
        );
        if (!borrow) return res.status(400).json({ error: 'No active borrow found' });
        
        borrow.status = 'returned';
        const book = inMemoryDB.books.find(b => b.id === req.params.id);
        if (book) {
            book.available = true;
        }
        res.json({ message: 'Book returned successfully' });
    } catch (error) {
        console.error('Return error:', error);
        res.status(500).json({ error: 'Failed to return book' });
    }
});

app.post('/api/books/:id/available', requireLogin, async (req, res) => {
    try {
        const bookId = req.params.id;
        const book = inMemoryDB.books.find(b => b.id === bookId);
        if (!book) return res.status(404).json({ error: 'Book not found' });
        if (book.ownerId !== req.session.userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Remove all borrow requests for this book
        inMemoryDB.borrowRequests = inMemoryDB.borrowRequests.filter(br => br.bookId !== bookId);
        book.available = true;
        res.json({ message: 'Book is now available' });
    } catch (error) {
        console.error('Make available error:', error);
        res.status(500).json({ error: 'Failed to make book available' });
    }
});

app.post('/api/reviews/:id', requireLogin, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const review = {
            id: generateId(),
            bookId: req.params.id,
            userId: req.session.userId,
            rating: Number(rating),
            comment
        };
        inMemoryDB.reviews.push(review);
        res.status(201).json({ id: review.id, message: 'Review created successfully' });
    } catch (error) {
        console.error('Review error:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});

app.get('/api/reviews/:id', async (req, res) => {
    try {
        const reviews = inMemoryDB.reviews.filter(r => r.bookId === req.params.id);
        res.json(reviews);
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// Serve React app
app.use(express.static(path.join(__dirname, 'frontend/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

console.log('✅ Using in-memory database (temporary solution)');
console.log('📝 Note: Data will be lost when server restarts');

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('🚀 BookShare app is ready!');
});
