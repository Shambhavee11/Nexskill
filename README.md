# ⟡ NexSkill — Credit-Based Skill Exchange Platform
> Trade Skills, Not Money

A full-stack web application for cashless skill collaboration, built with React, Node.js, PostgreSQL & Socket.IO.

---

## 📁 Project Structure

```
nexskill/
├── frontend/              ← React (with Auth, Chat, Dashboard)
│   └── src/
│       ├── pages/         ← LandingPage, Dashboard, Explore, Requests, Chat, History, Profile
│       ├── components/    ← Navbar
│       ├── context/       ← AuthContext (global auth state)
│       ├── services/      ← api.js (axios with auto token refresh)
│       └── styles/        ← global.css
│
├── backend/               ← Node.js + Express + Socket.IO
│   └── src/
│       ├── server.js      ← Main server + Socket.IO
│       ├── config/        ← db.js, email.js
│       ├── middleware/    ← auth.js (JWT)
│       ├── controllers/   ← authController, usersController, requestsController
│       └── routes/        ← auth.js, users.js, requests.js
│
└── database/
    └── schema.sql         ← Full PostgreSQL schema + seed data
```

---

## 🛠️ Tech Stack

| Layer      | Technology                             |
|------------|----------------------------------------|
| Frontend   | React 18, React Router v6, Axios       |
| Styling    | Custom CSS (Syne + DM Sans fonts)      |
| Backend    | Node.js, Express.js                    |
| Real-time  | Socket.IO (WebSocket for chat)         |
| Database   | PostgreSQL                             |
| Auth       | JWT (Access + Refresh tokens), bcrypt  |
| Email      | Nodemailer (OTP verification)          |

---

## 🚀 Setup & Run

### 1. Database
```bash
# Create database
psql -U postgres -c "CREATE DATABASE nexskill_db;"

# Run schema
psql -U postgres -d nexskill_db -f database/schema.sql
```

### 2. Backend
```bash
cd backend
npm install

# Copy env file and configure
cp .env.example .env
# Edit .env with your DB credentials, JWT secrets, and email settings

npm run dev    # Development (nodemon)
# Runs on: http://localhost:5000
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
# Runs on: http://localhost:3000
```

---

## 🔑 Environment Variables (backend/.env)

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexskill_db
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

FRONTEND_URL=http://localhost:3000
SIGNUP_BONUS_CREDITS=100
```

---

## 🗄️ Database Tables

| Table                | Purpose                                         |
|----------------------|-------------------------------------------------|
| `users`              | User accounts, credits, ratings, premium status |
| `user_skills`        | Skills offered/needed per user                  |
| `portfolio_items`    | Portfolio showcase per user                     |
| `service_requests`   | Service exchange requests with credit amounts   |
| `credit_transactions`| Full credit ledger (earned, spent, bonuses)     |
| `reviews`            | Star ratings + detailed feedback per request    |
| `messages`           | Chat messages (1-to-1)                          |
| `conversations`      | Chat conversation threads                       |
| `notifications`      | System notifications                            |

---

## 🔐 Auth Flow

```
Register → OTP Email → Verify OTP → Access Token + Refresh Token
Login    → Check OTP verified → Access Token + Refresh Token
API Call → Bearer Token → Auto-refresh on expiry (via axios interceptor)
```

---

## 📡 API Endpoints

### Auth
| Method | Endpoint                  | Description           |
|--------|---------------------------|-----------------------|
| POST   | /api/auth/register        | Register user         |
| POST   | /api/auth/verify-otp      | Verify email OTP      |
| POST   | /api/auth/login           | Login                 |
| POST   | /api/auth/refresh-token   | Refresh access token  |
| POST   | /api/auth/logout          | Logout                |
| POST   | /api/auth/resend-otp      | Resend OTP            |

### Users
| Method | Endpoint                  | Description           |
|--------|---------------------------|-----------------------|
| GET    | /api/users/me             | Get my profile        |
| PUT    | /api/users/me             | Update my profile     |
| GET    | /api/users/me/credits     | Credit history        |
| GET    | /api/users/explore        | Explore creators      |
| GET    | /api/users/:userId        | Get user profile      |
| POST   | /api/users/me/skills      | Add a skill           |
| DELETE | /api/users/me/skills/:id  | Remove a skill        |

### Requests
| Method | Endpoint                       | Description          |
|--------|--------------------------------|----------------------|
| POST   | /api/requests                  | Create request       |
| GET    | /api/requests                  | List my requests     |
| PUT    | /api/requests/:id/accept       | Accept request       |
| PUT    | /api/requests/:id/complete     | Mark complete        |
| POST   | /api/requests/:id/review       | Submit review        |

### Chat & Other
| Method | Endpoint                  | Description           |
|--------|---------------------------|-----------------------|
| GET    | /api/conversations        | List conversations    |
| GET    | /api/messages/:userId     | Get chat messages     |
| GET    | /api/notifications        | Get notifications     |

---

## ⚡ Socket.IO Events

| Event           | Direction       | Description             |
|-----------------|-----------------|-------------------------|
| `send_message`  | Client → Server | Send a chat message     |
| `new_message`   | Server → Client | Receive a message       |
| `message_sent`  | Server → Client | Message sent confirmation|
| `typing`        | Client → Server | Start typing indicator  |
| `stop_typing`   | Client → Server | Stop typing indicator   |
| `user_typing`   | Server → Client | Other user is typing    |
| `user_online`   | Server → Client | User came online        |
| `user_offline`  | Server → Client | User went offline       |

---

## 🎯 Features Implemented

- ✅ User Registration with Email OTP Verification
- ✅ JWT Authentication (Access + Refresh tokens)
- ✅ Credit-based economy (earn/spend/transfer)
- ✅ Creator profiles with skills offered/needed
- ✅ Service request system (create/accept/complete)
- ✅ Real-time chat with Socket.IO
- ✅ Star ratings & detailed reviews
- ✅ Explore creators with filters (skill, category, rating)
- ✅ Credit transaction history
- ✅ Notifications system
- ✅ Rate limiting & security middleware

## 🔮 Future Work (as per project plan)
- [ ] ML Recommendation engine (collaborative filtering)
- [ ] Premium membership (3.5★ minimum)
- [ ] Credit-to-money conversion for premium users
- [ ] Webinar/workshop hosting
- [ ] Portfolio uploads with image storage
