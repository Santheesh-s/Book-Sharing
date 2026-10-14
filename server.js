const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'campus-book-share-secret';

// Mailer for sending password reset codes
const smtpPass = (process.env.SMTP_PASSWORD || '').replace(/\s+/g, '').replace(/^["']|["']$/g, '');
const smtpPort = Number(process.env.SMTP_PORT) || 465;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
        user: (process.env.SMTP_MAIL || '').trim(),
        pass: smtpPass
    },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 6000
});

async function sendResetEmail({ toEmail, resetCode, resetLink }) {
    const fromAddress = `"CampusBookShare" <${process.env.SMTP_MAIL || 'no-reply@campusbookshare.com'}>`;
    const subject = 'CampusBookShare - Password Reset Code & Direct Link';
    const textContent = `Your 6-Digit Password Reset Code is: ${resetCode}\n\nOr click this direct link to reset your password:\n${resetLink}\n\nThis code expires in 1 hour.`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #0d6efd; margin: 0;">🎓 CampusBookShare</h2>
                <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Student P2P Book Selling & Lending</p>
            </div>
            
            <p style="font-size: 15px; color: #334155;">Hello,</p>
            <p style="font-size: 15px; color: #334155;">We received a request to reset the password for your student account (<strong>${toEmail}</strong>).</p>

            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 18px; text-align: center; margin: 25px 0;">
                <div style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">Your 6-Digit Reset Code</div>
                <div style="color: #0f172a; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 10px 0;">${resetCode}</div>
                <div style="color: #ef4444; font-size: 12px;">Valid for 1 hour</div>
            </div>

            <div style="text-align: center; margin: 25px 0;">
                <a href="${resetLink}" style="background-color: #0d6efd; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
                    Reset Password Directly →
                </a>
            </div>

            <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 30px;">
                If you did not request this password reset, please ignore this email.
            </p>
        </div>
    `;

    // 1. If RESEND_API_KEY is configured (HTTPS Port 443, never blocked by firewalls)
    if (process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: process.env.RESEND_FROM || 'CampusBookShare <onboarding@resend.dev>',
                to: [toEmail],
                subject: subject,
                text: textContent,
                html: htmlContent
            })
        });
        const resData = await response.json();
        if (!response.ok) {
            throw new Error(resData.message || 'Resend API error');
        }
        return resData;
    }

    // 2. Default: Nodemailer SMTP
    const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: subject,
        text: textContent,
        html: htmlContent
    });
    return info;
}

// Database connection management (Serverless & Local friendly)
let cachedDbPromise = null;

async function connectToDatabase() {
    if (mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    if (!process.env.MONGODB_URI) {
        console.warn('Warning: MONGODB_URI environment variable is not defined.');
        return null;
    }

    if (!cachedDbPromise) {
        cachedDbPromise = mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
        }).then((m) => {
            console.log('MongoDB connected successfully');
            return m;
        }).catch((err) => {
            cachedDbPromise = null;
            console.error('MongoDB connection error:', err);
            throw err;
        });
    }

    return cachedDbPromise;
}

// Trigger initial connection in background
connectToDatabase().catch(err => {
    console.error('Initial DB connection attempt failed:', err.message);
});

// Mongoose Schemas (Explicitly define ALL fields so Mongoose saves them)
const { Schema, model, Types } = mongoose;

const userSchema = new Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    collegeName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    password: { type: String, required: true },
    resetCode: String,
    resetCodeExpires: Date,
    createdAt: { type: Date, default: Date.now }
});

const bookSchema = new Schema({
    title: { type: String, required: true, trim: true },
    author: { type: String, required: true, trim: true },
    department: { type: String, default: 'General' },
    collegeName: { type: String, required: true, trim: true },
    listingType: { type: String, enum: ['Sale', 'Lend'], default: 'Lend' },
    price: { type: Number, default: 0 },
    condition: { type: String, default: 'Good' },
    description: String,
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    available: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const reviewSchema = new Schema({
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
    createdAt: { type: Date, default: Date.now }
});

const requestSchema = new Schema({
    bookId: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    buyerBorrowerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Buy', 'Lend'], default: 'Lend' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || model('User', userSchema);
const Book = mongoose.models.Book || model('Book', bookSchema);
const Review = mongoose.models.Review || model('Review', reviewSchema);
const BookRequest = mongoose.models.BookRequest || model('BookRequest', requestSchema);

// CORS Configuration (Supports Firebase Hosting, Vercel, Localhost, and custom domains)
const allowedOrigins = [
    'https://book-sharer.web.app',
    'https://book-sharer.firebaseapp.com',
    'https://book-sharer.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        if (
            origin.endsWith('.web.app') ||
            origin.endsWith('.firebaseapp.com') ||
            origin.endsWith('.vercel.app') ||
            allowedOrigins.includes(origin) ||
            (process.env.CLIENT_URL && origin === process.env.CLIENT_URL)
        ) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.options('*', cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Prevent Browser Back Button Form Caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Middleware to ensure Database Connection before handling DB routes
app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        console.error('Database connection middleware error:', err);
        if (req.path.startsWith('/api') || req.path === '/books' || req.path === '/search' || req.method === 'POST') {
            return res.status(500).json({ error: 'Database connection failed. Please check MONGODB_URI.' });
        }
        next();
    }
});

// Serve frontend static files when running locally
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
function getRedirectUrl(req) {
    if (process.env.CLIENT_URL) return process.env.CLIENT_URL;
    const origin = req.get('origin');
    if (origin && (origin === 'https://book-sharer.web.app' || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
        return origin;
    }
    return 'https://book-sharer.web.app';
}

// Reads the "Authorization: Bearer <token>" header and returns the userId inside it, or null
function getUserIdFromToken(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.userId;
    } catch (err) {
        return null;
    }
}

// Middleware for routes that require login
function requireLogin(req, res, next) {
    const userId = getUserIdFromToken(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized. Please login.' });
    }
    req.userId = userId;
    next();
}

function isStrongPassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

// Enrich Books with Owner Details and Reviews
async function enrichBooksData(books) {
    if (!books || books.length === 0) return [];
    
    const userIds = books.map(b => b.ownerId).filter(Boolean);
    const bookIds = books.map(b => b._id).filter(Boolean);

    const [users, reviews] = await Promise.all([
        User.find({ _id: { $in: userIds } }),
        Review.find({ bookId: { $in: bookIds } })
    ]);

    const userMap = {};
    users.forEach(u => {
        const name = u.fullName || (u.email ? u.email.split('@')[0] : 'Student');
        userMap[u._id.toString()] = {
            fullName: name,
            phone: u.phone || 'N/A',
            email: u.email || 'N/A',
            collegeName: u.collegeName || 'Campus'
        };
    });

    const reviewStatsMap = {};
    reviews.forEach(r => {
        const bId = r.bookId.toString();
        if (!reviewStatsMap[bId]) {
            reviewStatsMap[bId] = { totalRating: 0, count: 0 };
        }
        reviewStatsMap[bId].totalRating += r.rating;
        reviewStatsMap[bId].count += 1;
    });

    return books.map(b => {
        const bObj = b.toObject ? b.toObject() : b;
        const bId = b._id ? b._id.toString() : '';
        const owner = userMap[b.ownerId ? b.ownerId.toString() : ''] || {};
        const stats = reviewStatsMap[bId] || { totalRating: 0, count: 0 };
        const avgRating = stats.count > 0 ? (stats.totalRating / stats.count).toFixed(1) : null;

        return {
            ...bObj,
            ownerName: owner.fullName,
            ownerPhone: owner.phone,
            ownerEmail: owner.email,
            ownerCollege: owner.collegeName || b.collegeName,
            avgRating: avgRating,
            reviewCount: stats.count
        };
    });
}

// Health Check API route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'CampusBookShare API is running',
        dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Registration Route (Stores ALL Student details)
app.post('/register', async (req, res) => {
    try {
        const { fullName, email, collegeName, phone, password } = req.body;

        const normalizedEmail = (email || '').toLowerCase().trim();
        const cleanName = (fullName || '').trim();
        const cleanCollege = (collegeName || '').trim();
        const cleanPhone = (phone || '').trim();

        if (!cleanName) return res.status(400).json({ error: 'Please enter your full name.' });
        if (!normalizedEmail || !normalizedEmail.includes('@')) return res.status(400).json({ error: 'Please enter a valid email address.' });
        if (!cleanCollege) return res.status(400).json({ error: 'Please enter your college name.' });
        if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
        if (!isStrongPassword(password)) return res.status(400).json({ error: 'Password must be 8+ characters with uppercase, lowercase, and a number.' });

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) return res.status(400).json({ error: 'A student account with this email already exists.' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            fullName: cleanName,
            email: normalizedEmail,
            collegeName: cleanCollege,
            phone: cleanPhone,
            password: hashedPassword
        });

        await user.save();

        res.json({ success: true });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration error: ' + err.message });
    }
});

// Login Route (issues a JWT instead of a cookie session, since frontend and backend are on different domains)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = (email || '').toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) return res.status(400).json({ error: 'Invalid student email or password.' });

        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (user.password === password);
        }

        if (!isMatch) return res.status(400).json({ error: 'Invalid student email or password.' });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, fullName: user.fullName });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login error.' });
    }
});

// Forgot Password Request Code
app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = (email || '').toLowerCase().trim();
        const isJsonReq = req.is('application/json') || (req.headers.accept && req.headers.accept.includes('application/json'));

        if (!normalizedEmail) {
            if (isJsonReq) return res.status(400).json({ error: 'Please enter a valid student email address.' });
            return res.send('Please enter a valid student email address.');
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            if (isJsonReq) return res.status(404).json({ error: 'No account found with this student email.' });
            return res.send('No account found with this student email.');
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetCode = resetCode;
        user.resetCodeExpires = Date.now() + 3600000;
        await user.save();

        const clientUrl = getRedirectUrl(req);
        const resetLink = `${clientUrl}/forgot-password.html?step=2&email=${encodeURIComponent(normalizedEmail)}&code=${resetCode}`;

        try {
            await sendResetEmail({
                toEmail: normalizedEmail,
                resetCode,
                resetLink
            });
            console.log(`Password reset email successfully sent to ${normalizedEmail}`);
        } catch (mailErr) {
            console.error('Email send error:', mailErr.message);
            if (isJsonReq) {
                let userFriendlyError = 'Could not send reset email. Please verify SMTP / Email settings.';
                if (mailErr.code === 'ETIMEDOUT' || mailErr.message?.includes('timeout') || mailErr.message?.includes('ECONNREFUSED') || mailErr.message?.includes('CONN')) {
                    userFriendlyError = 'SMTP connection timed out. Note: College/Campus Wi-Fi blocks mail ports 465 & 587. Please switch your laptop to Mobile Hotspot or deploy to Vercel to send real emails.';
                }
                return res.status(500).json({ error: userFriendlyError });
            }
            return res.send('Could not send reset email. Please try again later.');
        }

        if (isJsonReq) {
            return res.json({
                success: true,
                email: normalizedEmail,
                message: 'Password reset code and direct link have been sent to your student email.'
            });
        }

        res.redirect(getRedirectUrl(req) + `/forgot-password.html?step=2&email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err) {
        console.error('Forgot password error:', err);
        if (req.is('application/json')) return res.status(500).json({ error: 'Error requesting password reset.' });
        res.status(500).send('Error requesting password reset.');
    }
});

// Reset Password
app.post('/reset-password', async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;
        const normalizedEmail = (email || '').toLowerCase().trim();
        const cleanCode = (resetCode || '').trim();
        const isJsonReq = req.is('application/json') || (req.headers.accept && req.headers.accept.includes('application/json'));

        const user = await User.findOne({
            email: normalizedEmail,
            resetCode: cleanCode,
            resetCodeExpires: { $gt: Date.now() }
        });

        if (!user) {
            if (isJsonReq) return res.status(400).json({ error: 'Invalid or expired reset code.' });
            return res.send('Invalid or expired reset code.');
        }

        if (!isStrongPassword(newPassword)) {
            if (isJsonReq) return res.status(400).json({ error: 'Password must be 8+ characters with uppercase, lowercase, and a number.' });
            return res.send('Password must be 8+ characters with uppercase, lowercase, and a number.');
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetCode = undefined;
        user.resetCodeExpires = undefined;
        await user.save();

        if (isJsonReq) {
            return res.json({ success: true, message: 'Password reset successfully.' });
        }

        res.redirect(getRedirectUrl(req) + '/login.html?reset=success');
    } catch (err) {
        console.error('Reset password error:', err);
        if (req.is('application/json')) return res.status(500).json({ error: 'Error resetting password.' });
        res.status(500).send('Error resetting password.');
    }
});

// Get Current Logged-In User
app.get('/api/user', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) return res.json({ loggedIn: false });

        const user = await User.findById(userId);
        if (!user) return res.json({ loggedIn: false });

        res.json({
            loggedIn: true,
            fullName: user.fullName,
            email: user.email,
            collegeName: user.collegeName,
            phone: user.phone,
            userId: String(user._id)
        });
    } catch (err) {
        console.error('Get user error:', err);
        res.json({ loggedIn: false });
    }
});

// Book Routes
app.get('/books', async (req, res) => {
    try {
        const { department, listingType } = req.query;
        let filter = {};

        if (department && department !== 'All') filter.department = department;
        if (listingType && listingType !== 'All') filter.listingType = listingType;

        const books = await Book.find(filter).sort({ createdAt: -1 });
        const enrichedBooks = await enrichBooksData(books);
        res.json(enrichedBooks);
    } catch (err) {
        console.error('Get books error:', err);
        res.status(500).json({ error: 'Failed to fetch books.' });
    }
});

// Get single book by ID
app.get('/books/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        if (!Types.ObjectId.isValid(bookId)) {
            return res.status(400).json({ error: 'Invalid book ID.' });
        }
        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ error: 'Book not found.' });

        const enriched = await enrichBooksData([book]);
        res.json(enriched[0]);
    } catch (err) {
        console.error('Get single book error:', err);
        res.status(500).json({ error: 'Failed to fetch book.' });
    }
});

app.get('/search', async (req, res) => {
    try {
        const { q, department, listingType } = req.query;
        const searchRegex = new RegExp(q || '', 'i');

        let filter = {
            $or: [
                { title: searchRegex },
                { author: searchRegex },
                { department: searchRegex },
                { collegeName: searchRegex },
                { description: searchRegex }
            ]
        };

        if (department && department !== 'All') filter.department = department;
        if (listingType && listingType !== 'All') filter.listingType = listingType;

        const books = await Book.find(filter).sort({ createdAt: -1 });
        const enrichedBooks = await enrichBooksData(books);
        res.json(enrichedBooks);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Search failed.' });
    }
});

app.post('/books', requireLogin, async (req, res) => {
    try {
        const { title, author, department, listingType, price, collegeName, condition, description } = req.body;
        const user = await User.findById(req.userId);

        const isSale = (listingType === 'Sale');
        const numPrice = isSale && price ? Number(price) : 0;

        const book = new Book({
            title: title.trim(),
            author: author.trim(),
            department: department || 'General',
            listingType: isSale ? 'Sale' : 'Lend',
            price: numPrice,
            collegeName: collegeName ? collegeName.trim() : (user.collegeName || 'Campus'),
            condition: condition || 'Good',
            description,
            ownerId: req.userId,
            available: true
        });
        await book.save();
        res.json({ success: true });
    } catch (err) {
        console.error('Add book error:', err);
        res.status(500).json({ error: 'Failed to list book.' });
    }
});

app.post('/books/:bookId/available', requireLogin, async (req, res) => {
    try {
        const bookId = req.params.bookId;
        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ error: 'Book not found.' });

        if (String(book.ownerId) !== String(req.userId)) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        book.available = true;
        await book.save();
        res.json({ success: true });
    } catch (err) {
        console.error('Make available error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

app.post('/request-book/:bookId', requireLogin, async (req, res) => {
    try {
        const book = await Book.findById(req.params.bookId);
        if (!book || !book.available) return res.status(400).json({ error: 'Book is currently unavailable.' });

        if (String(book.ownerId) === String(req.userId)) {
            return res.status(400).json({ error: 'You cannot request your own book listing.' });
        }

        const isSale = (book.listingType === 'Sale');

        const request = new BookRequest({
            bookId: book._id,
            buyerBorrowerId: req.userId,
            type: isSale ? 'Buy' : 'Lend'
        });
        await request.save();

        book.available = false;
        await book.save();

        const owner = await User.findById(book.ownerId);
        const ownerName = owner ? (owner.fullName || 'Student') : 'Owner';
        const ownerPhone = owner ? owner.phone : 'N/A';
        const ownerEmail = owner ? owner.email : 'N/A';
        const ownerCollege = owner ? owner.collegeName : book.collegeName;

        const message = isSale
            ? `Purchase request confirmed for ₹${book.price}! Please contact seller student ${ownerName}: Mobile: ${ownerPhone}, Email: ${ownerEmail}, College: ${ownerCollege}`
            : `Lend request confirmed! Please contact lender student ${ownerName}: Mobile: ${ownerPhone}, Email: ${ownerEmail}, College: ${ownerCollege}`;

        res.json({
            success: true,
            message,
            owner: {
                fullName: ownerName,
                phone: ownerPhone,
                email: ownerEmail,
                collegeName: ownerCollege
            }
        });
    } catch (err) {
        console.error('Book request error:', err);
        res.status(500).json({ error: 'Failed to process request.' });
    }
});

// Fetch all reviews for a book
app.get('/books/:bookId/reviews', async (req, res) => {
    try {
        const { bookId } = req.params;
        if (!Types.ObjectId.isValid(bookId)) return res.status(400).json({ error: 'Invalid book ID.' });

        const reviews = await Review.find({ bookId }).sort({ createdAt: -1 });
        const userIds = reviews.map(r => r.userId);
        const users = await User.find({ _id: { $in: userIds } });
        const userMap = {};
        users.forEach(u => {
            userMap[u._id.toString()] = {
                fullName: u.fullName || 'Student',
                collegeName: u.collegeName || ''
            };
        });

        const formatted = reviews.map(r => {
            const u = userMap[r.userId.toString()] || { fullName: 'Student', collegeName: '' };
            return {
                _id: r._id,
                rating: r.rating,
                comment: r.comment,
                createdAt: r.createdAt,
                reviewerName: u.fullName,
                reviewerCollege: u.collegeName,
                userId: String(r.userId)
            };
        });

        res.json(formatted);
    } catch (err) {
        console.error('Get reviews error:', err);
        res.status(500).json({ error: 'Failed to fetch reviews.' });
    }
});

// Submit or update a review
app.post('/review/:bookId', requireLogin, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const bookId = req.params.bookId;

        if (!Types.ObjectId.isValid(bookId)) return res.status(400).json({ error: 'Invalid book ID.' });

        const numRating = Number(rating);
        if (!numRating || numRating < 1 || numRating > 5) {
            return res.status(400).json({ error: 'Please select a rating between 1 and 5 stars.' });
        }

        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ error: 'Book not found.' });

        const existingReview = await Review.findOne({ bookId, userId: req.userId });
        if (existingReview) {
            existingReview.rating = numRating;
            existingReview.comment = (comment || '').trim();
            existingReview.createdAt = new Date();
            await existingReview.save();
            return res.json({ success: true, message: 'Review updated successfully!' });
        }

        const review = new Review({
            bookId,
            userId: req.userId,
            rating: numRating,
            comment: (comment || '').trim()
        });
        await review.save();
        res.json({ success: true, message: 'Review submitted successfully!' });
    } catch (err) {
        console.error('Review error:', err);
        res.status(500).json({ error: 'Failed to submit review.' });
    }
});

// Delete a book listing (Owner only)
app.delete('/books/:bookId', requireLogin, async (req, res) => {
    try {
        const { bookId } = req.params;
        if (!Types.ObjectId.isValid(bookId)) return res.status(400).json({ error: 'Invalid book ID.' });

        const book = await Book.findById(bookId);
        if (!book) return res.status(404).json({ error: 'Book not found.' });

        if (String(book.ownerId) !== String(req.userId)) {
            return res.status(403).json({ error: 'Unauthorized to delete this listing.' });
        }

        await Book.findByIdAndDelete(bookId);
        await BookRequest.deleteMany({ bookId });
        await Review.deleteMany({ bookId });

        res.json({ success: true, message: 'Book listing deleted successfully.' });
    } catch (err) {
        console.error('Delete book error:', err);
        res.status(500).json({ error: 'Failed to delete book.' });
    }
});

// Cancel a request (Requester or Owner)
app.delete('/requests/:requestId', requireLogin, async (req, res) => {
    try {
        const { requestId } = req.params;
        if (!Types.ObjectId.isValid(requestId)) return res.status(400).json({ error: 'Invalid request ID.' });

        const request = await BookRequest.findById(requestId).populate('bookId');
        if (!request) return res.status(404).json({ error: 'Request not found.' });

        const isRequester = String(request.buyerBorrowerId) === String(req.userId);
        const isOwner = request.bookId && String(request.bookId.ownerId) === String(req.userId);

        if (!isRequester && !isOwner) {
            return res.status(403).json({ error: 'Unauthorized to cancel this request.' });
        }

        if (request.bookId) {
            request.bookId.available = true;
            await request.bookId.save();
        }

        await BookRequest.findByIdAndDelete(requestId);
        res.json({ success: true, message: 'Request cancelled and book marked available.' });
    } catch (err) {
        console.error('Cancel request error:', err);
        res.status(500).json({ error: 'Failed to cancel request.' });
    }
});

// Aggregated user dashboard statistics
app.get('/api/user-stats', async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        if (!userId) return res.json({ booksListed: 0, booksBorrowed: 0, incomingRequests: 0, reviewsGiven: 0 });

        const myBooks = await Book.find({ ownerId: userId }).select('_id');
        const myBookIds = myBooks.map(b => b._id);

        const [booksListed, booksBorrowed, incomingRequests, reviewsGiven] = await Promise.all([
            myBooks.length,
            BookRequest.countDocuments({ buyerBorrowerId: userId }),
            BookRequest.countDocuments({ bookId: { $in: myBookIds } }),
            Review.countDocuments({ userId: userId })
        ]);

        res.json({ booksListed, booksBorrowed, incomingRequests, reviewsGiven });
    } catch (err) {
        console.error('User stats error:', err);
        res.json({ booksListed: 0, booksBorrowed: 0, incomingRequests: 0, reviewsGiven: 0 });
    }
});

// User activity with myBooks, myRequests, and incomingRequests
app.get('/api/my-activity', requireLogin, async (req, res) => {
    try {
        const userId = req.userId;
        const myBooks = await Book.find({ ownerId: userId }).sort({ createdAt: -1 });
        const myBookIds = myBooks.map(b => b._id);

        const [myRequests, incomingRequests] = await Promise.all([
            BookRequest.find({ buyerBorrowerId: userId })
                .populate({
                    path: 'bookId',
                    populate: { path: 'ownerId', select: 'fullName email phone collegeName' }
                })
                .sort({ createdAt: -1 }),
            BookRequest.find({ bookId: { $in: myBookIds } })
                .populate('bookId')
                .populate('buyerBorrowerId', 'fullName email phone collegeName')
                .sort({ createdAt: -1 })
        ]);

        res.json({ myBooks, myRequests, incomingRequests });
    } catch (err) {
        console.error('Activity error:', err);
        res.status(500).json({ error: 'Failed to fetch activity.' });
    }
});

// Start local server if run directly (node server.js or npm start)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Student Marketplace & Sharing Server running at http://localhost:${PORT}`);
    });
}

// Export for Vercel Serverless Function
module.exports = app;
