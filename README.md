# 🎓 CampusBookShare — Student P2P Textbook Marketplace & Sharing Platform

CampusBookShare is a peer-to-peer (P2P) textbook marketplace and book-sharing web application built for college and university students. It empowers students to sell used semester textbooks directly to peers at fair prices (in ₹), lend books for free to juniors, write student course reviews, and coordinate safe handovers right on campus.

---

## 🌟 Key Features

### 1. 🔐 Student Authentication & Security
- **Student Registration & Login**: Validated student registration capturing Full Name, College/Institution, Mobile Phone, Email, and strong password.
- **JWT-Based Authentication**: Secure stateless authentication using JSON Web Tokens (JWT) stored in client `localStorage` for cross-domain hosting compatibility.
- **Forgot Password & Reset**: Automated 6-digit verification code and direct one-click reset links delivered to the student's email via Gmail SMTP or the Resend HTTPS API.

### 2. 📚 Marketplace & Search
- **Search & Discovery**: Real-time keyword search across book titles, authors, keywords, and campus locations.
- **Filter by Department**: Computer Science, IT, ECE, EEE, Mechanical, Civil, Basic Sciences & Maths, Literature & Humanities, Competitive Exams (GATE/CAT/GRE), and General.
- **Filter by Exchange Type**: Filter between **💰 For Sale** and **🤝 Free Lending**.

### 3. 💰 Book Selling & 🤝 Free Lending
- **Sell Used Textbooks**: Students can list semester books with their custom price in ₹, condition (Like New, Good, Fair), and notes.
- **Free Peer Lending**: Lend reference materials and syllabus books to peers at zero cost.
- **Zero Platform Fees**: 100% free for students with no commissions or hidden fees.

### 4. 📞 Direct Campus Handover
- **Instant Contact Details**: When a student confirms a buy or borrow request, they immediately receive the seller/lender's verified Mobile Number, Email, and College Campus.
- **Quick Actions**: One-click **Call Seller (`tel:`)**, **WhatsApp Chat (`wa.me`)**, and **Email (`mailto:`)** buttons to arrange a safe campus meetup (Library, Canteen, or Department).

### 5. ⭐ Textbook Reviews & Star Ratings
- **Interactive 5-Star Reviews**: Rate textbooks on a 1-to-5 star scale with animated star selectors.
- **Coursework Feedback**: Reviewers can leave comments on whether the book was helpful for semester exams, includes solved problems, or matches university syllabus.
- **Review Updates**: Students can update their existing review anytime.
- **Average Ratings & Badges**: Average rating score and review count displayed directly on marketplace cards.

### 6. 📊 Real-Time Student Dashboard (`home.html`)
- **Live Counter Metrics**:
  - 📚 Books Listed by You
  - 📬 Incoming Student Requests
  - 🤝 Your Outgoing Requests
  - ⭐ Reviews Written
- **3 Interactive Tabs**:
  1. **Books You Listed**: Toggle availability, view reviews, or delete listings.
  2. **Incoming Student Requests**: View which student requested your book, their contact number, campus, and email.
  3. **Your Outgoing Requests**: Keep track of books you requested, seller contacts, and cancel requests if needed.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Vanilla HTML5, Vanilla JavaScript (ES6+), Bootstrap 5.3, Custom CSS3 Design System with Inter typography |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas via Mongoose ODM |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`) & `bcryptjs` password hashing |
| **Email Delivery** | `nodemailer` (SMTP) + Resend API integration |
| **Backend Deployment** | Vercel Serverless (`@vercel/node`) |
| **Frontend Deployment**| Firebase Hosting (`book-sharer.web.app`) |

---

## 📂 Project Directory Structure

```text
Book-Sharing/
├── .env                     # Environment variables (DB, JWT, SMTP)
├── .firebaserc              # Firebase project configuration
├── .gitignore               # Git ignore rules
├── firebase.json            # Firebase Hosting configuration (cleanUrls enabled)
├── package.json             # Node dependencies and scripts
├── package-lock.json        # Dependency lockfile
├── server.js                # Express backend application & API routes
├── vercel.json              # Vercel serverless routing configuration
├── README.md                # Project documentation
└── public/                  # Frontend static files
    ├── add-book.html        # Post a textbook to sell or lend
    ├── auth.js              # Token and authorization header helpers
    ├── books.html           # Browse, filter, and search marketplace
    ├── borrow.html          # Free lending confirmation & lender contacts
    ├── config.js            # Dynamic API endpoint resolution (local vs production)
    ├── forgot-password.html # Password reset code request & verification
    ├── home.html            # Student dashboard with incoming & outgoing requests
    ├── index.html           # Landing page with feature overview
    ├── login.html           # Student login page
    ├── purchase.html        # Textbook purchase confirmation & seller contacts
    ├── register.html        # Student registration page
    ├── review.html          # Textbook ratings & peer review stream
    └── style.css            # Custom responsive CSS design system
```

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the root directory (or configure these in your Vercel Dashboard):

```env
# MongoDB Atlas Connection URI
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority"

# Frontend Client URL (for CORS and reset email links)
CLIENT_URL="https://book-sharer.web.app"

# JWT Secret for signing student authentication tokens
JWT_SECRET="your-super-secret-jwt-key"

# Local Server Port (default 8080)
PORT=8080

# Email Delivery Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_MAIL=your-email@gmail.com
SMTP_PASSWORD="your-google-app-password"

# Optional: Resend API Key (Bypasses college Wi-Fi SMTP port blocking)
# RESEND_API_KEY="re_xxxxxxxxxxxx"
# RESEND_FROM="CampusBookShare <onboarding@resend.dev>"
```

> **Tip for Campus Wi-Fi**: Many university networks block SMTP ports 465 and 587. If running locally on a campus Wi-Fi, you can either switch to a mobile hotspot or set `RESEND_API_KEY` to send emails over HTTPS port 443.

---

## 🚀 Running Locally

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)
- **MongoDB Atlas** database account or local MongoDB instance

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/book-sharing.git
cd book-sharing

# Install dependencies
npm install
```

### 3. Start the Server
```bash
npm start
# or for development
npm run dev
```

### 4. Open in Browser
Open [http://localhost:8080](http://localhost:8080) in your web browser.

---

## 📡 API Reference

### 🔑 Authentication & Users
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/register` | Register a new student account | No |
| `POST` | `/login` | Authenticate student & return JWT | No |
| `POST` | `/forgot-password` | Send 6-digit reset code & direct reset link | No |
| `POST` | `/reset-password` | Verify reset code and update password | No |
| `GET` | `/api/user` | Fetch current logged-in student details | Optional |
| `GET` | `/api/user-stats` | Fetch aggregated dashboard counts | Optional |
| `GET` | `/api/my-activity` | Fetch posted books, incoming requests, & outgoing requests | **Yes (JWT)** |

### 📖 Marketplace & Books
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/books` | List books (supports `department` and `listingType` query params) | No |
| `GET` | `/books/:bookId` | Retrieve single book details with owner info & rating | No |
| `GET` | `/search` | Search books by keyword (`?q=...`) | No |
| `POST` | `/books` | Post a new textbook for sale or lend | **Yes (JWT)** |
| `POST` | `/books/:bookId/available` | Mark a reserved book as available again | **Yes (Owner)** |
| `DELETE` | `/books/:bookId` | Delete a book listing and related records | **Yes (Owner)** |

### 🤝 Requests & Exchanges
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `POST` | `/request-book/:bookId` | Request to buy or borrow a book; reveals contact details | **Yes (JWT)** |
| `DELETE` | `/requests/:requestId` | Cancel request and return book to available status | **Yes (JWT)** |

### ⭐ Reviews & Ratings
| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/books/:bookId/reviews` | Fetch all reviews and star ratings for a book | No |
| `POST` | `/review/:bookId` | Submit or update a 1–5 star rating and comment | **Yes (JWT)** |

---

## ☁️ Deployment Guide

### Deploy Backend to Vercel
1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Link and deploy from the project root:
   ```bash
   vercel
   ```
3. Set your environment variables in the Vercel Project Settings:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLIENT_URL` (`https://book-sharer.web.app`)
   - `SMTP_MAIL` / `SMTP_PASSWORD` or `RESEND_API_KEY`
4. Deploy to production:
   ```bash
   vercel --prod
   ```

### Deploy Frontend to Firebase Hosting
1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Login to Firebase:
   ```bash
   firebase login
   ```
3. Deploy the `public/` directory:
   ```bash
   firebase deploy --only hosting
   ```

---

## 🛡️ Campus Safety Guidelines for Students
1. **Public Meetup**: Always arrange book handovers in well-lit public campus locations such as the college library, department entrance, or cafeteria.
2. **Inspect First**: Check the textbook condition, edition year, and markings before finalizing payment or exchange.
3. **P2P Payments**: Use direct UPI (Google Pay, PhonePe, Paytm) or cash upon physical handover.
4. **Return on Time**: For borrowed books, treat peer textbooks with care and return them promptly after exams.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
