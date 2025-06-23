const express = require('express');
const session = require('express-session');
const path = require('path');
const mongoose = require('mongoose');
const app = express();
const PORT = 8080;

// Connect to MongoDB
mongoose.connect('mongodb+srv://santheesh:Santheesh%402006@cluster0.ok6mizb.mongodb.net/booksharing?retryWrites=true&w=majority', {
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
    phone: String // Add phone field
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
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'book-sharing-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 5 * 60 * 1000 }
}));

// Helpers
function requireLogin(req, res, next) {
    if (!req.session.userId) return res.redirect('/login.html');
    next();
}

function isStrongPassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Registration
app.post('/register', async (req, res) => {
    const { username, password, phone } = req.body;
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.send('Username already exists.');
    if (!isStrongPassword(password)) {
        return res.send('Password must be at least 8 characters long and include uppercase, lowercase, and a number.');
    }
    if (!phone || !/^\d{10}$/.test(phone)) {
        return res.send('Please enter a valid 10-digit phone number.');
    }
    const user = new User({ username, password, phone });
    await user.save();
    res.redirect('/login.html');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.send('Invalid credentials.');
    req.session.userId = user._id;
    res.redirect('/home.html');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login.html'));
});

app.get('/books', async (req, res) => {
    const books = await Book.find();
    // Fetch owner phone numbers
    const userIds = books.map(b => b.ownerId);
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = {};
    users.forEach(u => userMap[u._id] = u.phone);
    // Attach phone to each book
    const booksWithPhone = books.map(b => ({
        ...b.toObject(),
        ownerPhone: userMap[b.ownerId] || ''
    }));
    res.json(booksWithPhone);
});

app.post('/books', requireLogin, async (req, res) => {
    const { title, author, description, forSale, price } = req.body;
    const book = new Book({
        title,
        author,
        description,
        forSale: forSale === 'on',
        price: price ? Number(price) : null,
        ownerId: req.session.userId,
        available: true
    });
    await book.save();
    res.redirect('/home.html');
});

app.get('/search', async (req, res) => {
    const { q } = req.query;
    const results = await Book.find({
        $or: [
            { title: new RegExp(q, 'i') },
            { author: new RegExp(q, 'i') }
        ]
    });
    res.json(results);
});

// Borrow request (send owner phone in response)
app.post('/borrow/:bookId', requireLogin, async (req, res) => {
    const book = await Book.findById(req.params.bookId);
    if (!book || !book.available) return res.send('Book not available.');
    const borrow = new BorrowRequest({
        bookId: book._id,
        borrowerId: req.session.userId,
        status: 'pending'
    });
    await borrow.save();
    book.available = false;
    await book.save();
    // Find owner phone
    const owner = await User.findById(book.ownerId);
    res.send(`Borrow request submitted. Contact owner at: ${owner ? owner.phone : 'N/A'}`);
});

// Purchase request (send owner phone in response)
app.post('/purchase/:bookId', requireLogin, async (req, res) => {
    const book = await Book.findById(req.params.bookId);
    if (!book || !book.available || !book.forSale) return res.send('Book not available for sale.');
    book.available = false;
    await book.save();
    // Find owner phone
    const owner = await User.findById(book.ownerId);
    res.send(`Purchase request submitted. Contact owner at: ${owner ? owner.phone : 'N/A'}`);
});

app.post('/review/:bookId', requireLogin, async (req, res) => {
    const { rating, comment } = req.body;
    const bookId = req.params.bookId;

    if (!Types.ObjectId.isValid(bookId)) {
        return res.status(400).send('Invalid book ID.');
    }

    const review = new Review({
        bookId,
        userId: req.session.userId,
        rating: Number(rating),
        comment
    });
    await review.save();
    res.redirect('/home.html');
});

app.get('/reviews/:bookId', async (req, res) => {
    const bookId = req.params.bookId;
    if (!Types.ObjectId.isValid(bookId)) return res.status(400).send('Invalid book ID.');
    const reviews = await Review.find({ bookId });
    res.json(reviews);
});

app.post('/return/:bookId', requireLogin, async (req, res) => {
    const borrow = await BorrowRequest.findOne({
        bookId: req.params.bookId,
        borrowerId: req.session.userId,
        status: 'pending'
    });
    if (!borrow) return res.send('No active borrow found.');
    borrow.status = 'returned';
    await borrow.save();
    const book = await Book.findById(req.params.bookId);
    if (book) {
        book.available = true;
        await book.save();
    }
    res.send('Book returned.');
});

app.get('/api/user', async (req, res) => {
    if (!req.session.userId) return res.json({ loggedIn: false });
    const user = await User.findById(req.session.userId);
    if (!user) return res.json({ loggedIn: false });
    res.json({ loggedIn: true, username: user.username });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
