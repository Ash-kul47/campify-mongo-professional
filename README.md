# Campify Mongo Professional

Campify rebuilt from scratch with the same product scope, a MongoDB database, and a separated React frontend instead of EJS templates.

## Architecture

- `backend/`: Express API, session authentication, role-based access control, MongoDB via Mongoose, file uploads with Multer.
- `frontend/`: React + Vite single-page app that consumes `/api/*`.
- Production mode serves `frontend/dist` from Express, so it can deploy as one Node service.

## Key Features

- Student signup/login with persistent anonymous public IDs.
- Student dashboard with personal tickets, personal complaints, and all public complaints.
- Complaint submission with optional image, video, or audio proof.
- Community upvote toggle with priority score recalculation.
- Formal ticket flow with student contact details and 48-hour deadline.
- One active formal ticket per student.
- Admin dashboard with active tickets, complaints, resolved archives, SLA compliance, overdue rate, and average resolution time.
- Admin-only status transitions for complaints and tickets.
- Secure production sessions stored in MongoDB.

## Local Setup

```bash
cp .env.example backend/.env
npm install
npm run install:all
npm run seed
npm run dev
```

Frontend: `http://localhost:3000`

Backend: `http://localhost:5000`

The default seeded admin is controlled by `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`.

## Deployment

Use a MongoDB Atlas connection string for `MONGODB_URI`, set a strong `SESSION_SECRET`, and set `NODE_ENV=production`.

Build command:

```bash
npm run install:all && npm run build
```

Start command:

```bash
npm start
```

Required environment variables:

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
SESSION_SECRET=long-random-secret
CLIENT_ORIGIN=https://your-domain.example
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-this-password
```

For platforms like Render, Railway, Fly.io, or a VPS, point the service root at this folder. The Express server will serve the built React app in production.
