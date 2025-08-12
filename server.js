const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3001;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/booksharing',{
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Mongoose Models
const { Schema, model, Types } = mongoose;

const User = model('User', new Schema({
    username: String,
    password: String,
    phone: String
}));

const Book = model('Book', new Schema({
    title: String,
    author: String,
    description: String,
    forSale: Boolean,
    price: Number,
    ownerId: Schema.Types.ObjectId,
    available: Boolean
}));

const Review = model('Review', new Schema({
    bookId: Schema.Types.ObjectId,
    userId: Schema.Types.ObjectId,
    rating: Number,
    comment: String
}));

const BorrowRequest = model('BorrowRequest', new Schema({
    bookId: Schema.Types.ObjectId,
    borrowerId: Schema.Types.ObjectId,
    status: String
}));

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
    const { username, password, phone } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });
    if (!isStrongPassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long and include uppercase, lowercase, and a number' });
    }
    if (!isValidPhone(phone)) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit phone number' });
    }
    const user = new User({ username, password, phone });
    const result = await user.save();
    res.status(201).json({ id: result._id, message: 'User created successfully' });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.userId = user._id;
    res.json({ message: 'Login successful', username: user.username, userId: user._id });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ message: 'Logout successful' }));
});

app.get('/api/user', async (req, res) => {
    if (!req.session.userId) return res.json({ loggedIn: false });
    const user = await User.findById(req.session.userId);
    if (!user) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, username: user.username, userId: String(user._id) });
});

app.get('/api/user-stats', async (req, res) => {
    if (!req.session.userId) return res.json({ booksListed: 0, booksBorrowed: 0, booksSold: 0, reviewsGiven: 0 });
    const userId = req.session.userId;
    const [booksListed, booksBorrowed, booksSold, reviewsGiven] = await Promise.all([
        Book.countDocuments({ ownerId: userId }),
        BorrowRequest.countDocuments({ borrowerId: userId }),
        Book.countDocuments({ ownerId: userId, forSale: true, available: false }),
        Review.countDocuments({ userId: userId })
    ]);
    res.json({ booksListed, booksBorrowed, booksSold, reviewsGiven });
});

app.get('/api/books', async (req, res) => {
    const books = await Book.find();
    const userIds = books.map(b => b.ownerId);
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = {};
    users.forEach(u => userMap[u._id] = u.phone);
    const booksWithPhone = books.map(b => ({
        ...b.toObject(),
        id: b._id,
        ownerPhone: userMap[b.ownerId] || ''
    }));
    res.json(booksWithPhone);
});

app.post('/api/books', requireLogin, async (req, res) => {
    const { title, author, description, forSale, price } = req.body;
    const book = new Book({
        title,
        author,
        description,
        forSale,
        price: price || 0,
        ownerId: req.session.userId,
        available: true
    });
    const result = await book.save();
    res.status(201).json({ id: result._id, message: 'Book created successfully' });
});

app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    const results = await Book.find({
        $or: [
            { title: new RegExp(q, 'i') },
            { author: new RegExp(q, 'i') }
        ]
    });
    res.json(results.map(b => ({ ...b.toObject(), id: b._id })));
});

app.post('/api/borrow/:id', requireLogin, async (req, res) => {
    const book = await Book.findById(req.params.id);
    if (!book || !book.available) return res.status(400).json({ error: 'Book not available' });
    const borrow = new BorrowRequest({
        bookId: book._id,
        borrowerId: req.session.userId,
        status: 'pending'
    });
    await borrow.save();
    book.available = false;
    await book.save();
    const owner = await User.findById(book.ownerId);
    res.json({ message: 'Borrow request submitted', ownerPhone: owner ? owner.phone : 'N/A' });
});

app.post('/api/purchase/:id', requireLogin, async (req, res) => {
    const book = await Book.findById(req.params.id);
    if (!book || !book.available || !book.forSale) return res.status(400).json({ error: 'Book not available for sale' });
    book.available = false;
    await book.save();
    const owner = await User.findById(book.ownerId);
    res.json({ message: 'Purchase request submitted', ownerPhone: owner ? owner.phone : 'N/A' });
});

app.post('/api/return/:id', requireLogin, async (req, res) => {
    const borrow = await BorrowRequest.findOne({
        bookId: req.params.id,
        borrowerId: req.session.userId,
        status: 'pending'
    });
    if (!borrow) return res.status(400).json({ error: 'No active borrow found' });
    borrow.status = 'returned';
    await borrow.save();
    const book = await Book.findById(req.params.id);
    if (book) {
        book.available = true;
        await book.save();
    }
    res.json({ message: 'Book returned successfully' });
});

app.post('/api/books/:id/available', requireLogin, async (req, res) => {
    const bookId = req.params.id;
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (String(book.ownerId) !== String(req.session.userId)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    await BorrowRequest.deleteMany({ bookId: bookId });
    book.available = true;
    await book.save();
    res.json({ message: 'Book is now available' });
});

app.post('/api/reviews/:id', requireLogin, async (req, res) => {
    const { rating, comment } = req.body;
    const bookId = req.params.id;
    if (!Types.ObjectId.isValid(bookId)) {
        return res.status(400).json({ error: 'Invalid book ID' });
    }
    const review = new Review({
        bookId,
        userId: req.session.userId,
        rating: Number(rating),
        comment
    });
    const result = await review.save();
    res.status(201).json({ id: result._id, message: 'Review created successfully' });
});

app.get('/api/reviews/:id', async (req, res) => {
    const bookId = req.params.id;
    if (!Types.ObjectId.isValid(bookId)) return res.status(400).json({ error: 'Invalid book ID' });
    const reviews = await Review.find({ bookId });
    res.json(reviews);
});

// Serve React app
app.use(express.static(path.join(__dirname, 'frontend/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
