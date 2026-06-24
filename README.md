# S3 Fitness Website – Deployment Guide

## Overview
A high-converting gym website for S3 Fitness, Panipat with:
- ⚡ Full-stack: Express.js backend + single-page HTML frontend
- 📋 Lead capture forms (Free Trial + Contact)
- 📊 Admin API to view all leads and inquiries
- 🎨 Dark premium gym aesthetic with cyan accent

## Quick Start (Local)
```bash
npm install
npm start
# → http://localhost:3000
```

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/plans | Membership plans |
| GET | /api/services | Gym services |
| GET | /api/reviews | Member reviews |
| POST | /api/leads | Submit trial/membership inquiry |
| POST | /api/contact | Submit contact form |
| GET | /api/admin/leads | View all leads (needs header) |
| GET | /api/admin/inquiries | View all inquiries (needs header) |

### Admin Access
```bash
curl -H "x-admin-key: S3Admin2024" http://localhost:3000/api/admin/leads
```

## Deploy to Railway / Render

1. Push to GitHub
2. Connect repo to Railway or Render
3. Set start command: `node server.js`
4. Deploy – done!

## Production Upgrades (Recommended)
- Replace in-memory store with PostgreSQL (via `pg` or Prisma)
- Add SMS/WhatsApp notification on new lead (Twilio / MSG91)
- Set `x-admin-key` via environment variable, not hardcoded
- Add rate limiting (`express-rate-limit`)
- Set up email alerts (`nodemailer` + Gmail SMTP)
- Add Google Analytics / Meta Pixel for conversion tracking

## Lead Notification (WhatsApp / SMS)
Install MSG91 or Fast2SMS and add to the POST /api/leads handler:
```js
// Example: notify owner on new lead
await fetch('https://api.fast2sms.com/...', {
  method: 'POST',
  body: JSON.stringify({ message: `New lead: ${lead.name} | ${lead.phone}` })
});
```
