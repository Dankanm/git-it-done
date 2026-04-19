# AI Agency Website — Lead Management & Appointment Setting

Production-ready full-stack website for selling **AI Lead Management & Appointment Setting**.

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express + SQLite (`better-sqlite3`)
- Ops: PM2 + Nginx + Let's Encrypt staging

## Project Structure

```
.
├── backend
│   ├── package.json
│   └── server.js
├── frontend
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
├── .env.example
├── deploy.sh
├── setup.sh
├── nginx.conf.template
├── ecosystem.config.js
└── README.md
```

## Features Included
- Hero, services, pricing, tools, booking simulation
- Lead capture form with validation and backend persistence
- Dark/light mode toggle
- AI receptionist chat widget with qualification flow
- Voice call simulation using browser speech synthesis
- Admin dashboard (`/admin`) with basic auth-backed lead listing and status updates
- Webhook endpoint for AI callback simulation
- Automation simulation endpoint + cron processing
- Security: helmet, CORS, rate limiting, input sanitization
- Email auto-response via Nodemailer

## Environment Setup

```bash
cp .env.example .env
```

Set at least:
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `DOMAIN_OR_IP`
- `LETSENCRYPT_EMAIL` (optional for certbot staging)

## Local Development

### Backend
```bash
cd backend
npm install
npm run start
```
Backend runs on `http://localhost:4000`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

## API Endpoints
- `POST /api/leads` — create lead
- `GET /api/leads` — admin protected (Basic Auth)
- `PUT /api/leads/:id` — admin update lead
- `POST /api/admin/login` — admin login check
- `POST /api/webhook/agent-callback` — webhook receiver demo
- `POST /api/automation/run` — simulate n8n-like flow

## Production Deployment (Ubuntu 22.04/24.04)

One-command setup:
```bash
chmod +x setup.sh
./setup.sh
```

Direct deploy:
```bash
chmod +x deploy.sh
./deploy.sh
```

What deployment does:
1. Installs missing dependencies (Node, npm, git, pm2, nginx, certbot)
2. Creates `.env` from `.env.example` if missing
3. Installs frontend/backend dependencies
4. Builds frontend assets
5. Starts backend with PM2
6. Writes nginx config from `nginx.conf.template`
7. Attempts Let's Encrypt staging cert
8. Prints final URL + PM2 status

## Security Notes
- Change admin credentials immediately
- Restrict CORS origin in `.env`
- Configure SMTP for real outbound email delivery
- Replace staging cert with production cert in certbot command for go-live
