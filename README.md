# 🍳 Hunter's Kitchen — Cloud Kitchen Operations Platform

A modern, high-performance Cloud Kitchen management and food ordering platform built with **React 19**, **TypeScript**, **Tailwind CSS**, and an enterprise **Express.js** backend engine.

---

## 🌟 Key Features & Multi-Role Architecture

Hunter's Kitchen features a 4-tier Role-Based Access Control (RBAC) system:

### 👑 1. Owner & Restaurant Administrator
- **Executive Operations Dashboard**: Real-time sales, order volume, active deliveries, and revenue analytics.
- **Menu & Pricing Management**: Manage categories, dynamic dish pricing, prep times, and veg/non-veg flags.
- **Staff & Delivery Management**: Role provisioning, employee invitation tokens, and partner performance metrics.
- **Smart Delivery Batching**: Intelligent clustering of pending orders for optimized driver dispatch.
- **Audit Logging & System Status**: Complete immutable event history and backend service health monitoring.

### 👨‍🍳 2. Kitchen Staff (KDS)
- **Live Kitchen Display System (KDS)**: Real-time incoming tickets prioritized by preparation urgency.
- **Status Workflow**: Instant transition between `CONFIRMED` ➔ `PREPARING` ➔ `READY_FOR_PICKUP`.
- **Stock & Item Availability**: 1-click toggling of menu item availability.

### 🛵 3. Delivery Partner
- **Live Order Assignment**: Accept and manage assigned delivery orders.
- **Interactive Delivery Tracker**: Integrated map routing and live delivery status progression (`PICKED_UP` ➔ `OUT_FOR_DELIVERY` ➔ `DELIVERED`).
- **Partner Profile & History**: Detailed delivery logs, rating history, and earning summaries.

### 🛒 4. Customer Experience
- **Interactive Menu & Food Discovery**: Category filters, bestseller tags, spice level indicators, and detailed dish modals.
- **Smart Cart & Checkout**: Real-time pricing calculations, delivery fee threshold logic, and special instructions.
- **Address & Location Picker**: Google Maps geocoding and live delivery pin placement.
- **Live Order Tracking**: Visual progress tracker with estimated delivery times.
- **Ratings & Reviews**: Post-delivery feedback and food ratings.

---

## 🛡️ Enterprise Security & Resilience

- **Secure Session Management**: Signed HTTP-only cookies with role authorization middleware and Bcrypt password hashing.
- **Real-Time OTP Verification**: 6-digit numeric OTP dispatch via Gmail SMTP with in-memory / Redis cache fallback.
- **Google OAuth 2.0 Integration**: Authorization code flow with state verification.
- **Transactional Outbox Worker**: Background worker ensuring guaranteed asynchronous event delivery.
- **Idempotency & Rate Limiting**: Header-based idempotency handling to prevent double billing/order creation and IP-based rate limiting.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Lucide React, Google Maps Platform (`@vis.gl/react-google-maps`)
- **Backend**: Node.js, Express, TSX, JSON Web Tokens (`jsonwebtoken`), Bcrypt (`bcryptjs`), Nodemailer, Google GenAI SDK (`@google/genai`)
- **Reporting**: jsPDF & jsPDF-AutoTable for automated invoice generation

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or bun

### 1. Clone the Repository
```bash
git clone https://github.com/claudeforbackend/Claude.git
cd Claude
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy [.env.example](.env.example) to `.env`:
```bash
cp .env.example .env
```
Fill in the required configurations:
- `JWT_SECRET`: Secret key for session tokens.
- `GEMINI_API_KEY`: API key for Gemini AI features.
- `GOOGLE_MAPS_PLATFORM_KEY`: (Optional) For live map rendering and geocoding.
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: (Optional) For Google OAuth 2.0 login.
- `GMAIL_USER` & `GMAIL_APP_PASSWORD`: (Optional) For real-time email OTP verification.

### 4. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts fullstack development server (Express backend + Vite HMR) |
| `npm run build` | Builds frontend assets with Vite and bundles server with esbuild |
| `npm start` | Runs the compiled production server |
| `npm run lint` | Runs TypeScript type checking |
| `npm run test:verification`| Runs end-to-end production integrity test suite |

---

## 📄 License
This project is proprietary and confidential.
