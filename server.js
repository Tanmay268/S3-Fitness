require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_SHEETS_WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_URL || '';
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || '';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store (replace with DB in production)
const leads = [];
const inquiries = [];

async function sendToGoogleSheet(type, payload) {
  if (!GOOGLE_SHEETS_WEBHOOK_URL) {
    console.warn('[GOOGLE SHEETS] GOOGLE_SHEETS_WEBHOOK_URL is not configured. Skipping sync.');
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(GOOGLE_SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        type,
        notificationEmail: ADMIN_NOTIFICATION_EMAIL,
        ...payload
      })
    });
    const text = await response.text();
    const responseSummary = formatGoogleSheetsResponse(text);

    if (!response.ok) {
      console.error(`[GOOGLE SHEETS ERROR] ${response.status}: ${responseSummary}`);
      return;
    }

    try {
      const result = JSON.parse(text);
      if (!result.success) {
        console.error(`[GOOGLE SHEETS ERROR] ${result.error || responseSummary}`);
      } else {
        console.log(`[GOOGLE SHEETS] ${type} synced to sheet.`);
      }
    } catch {
      console.error(`[GOOGLE SHEETS ERROR] Unexpected non-JSON response: ${responseSummary}`);
    }
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'Request timed out after 15 seconds'
      : error.message;

    console.error('[GOOGLE SHEETS ERROR]', message);
  } finally {
    clearTimeout(timeout);
  }
}

function formatGoogleSheetsResponse(text) {
  const withoutTags = text
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (withoutTags || text).slice(0, 1200);
}

// ─── Membership Plans ───────────────────────────────────────────────
const plans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 1499,
    duration: '1 Month',
    features: ['Full Gym Access', 'Locker Room', 'Basic Trainer Guidance', 'Group Classes'],
    popular: false
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    price: 3999,
    originalPrice: 4497,
    duration: '3 Months',
    features: ['Full Gym Access', 'Locker Room', 'Personal Trainer (2x/week)', 'All Group Classes', 'Nutrition Consultation'],
    popular: true
  },
  {
    id: 'annual',
    name: 'Annual',
    price: 11999,
    originalPrice: 17988,
    duration: '12 Months',
    features: ['Full Gym Access', 'Locker Room', 'Personal Trainer (Unlimited)', 'All Group Classes', 'Nutrition Consultation', 'Swimming Pool', 'Sauna Access'],
    popular: false
  }
];

const services = [
  { id: 1, name: 'Weight Training', icon: '🏋️', desc: 'State-of-the-art equipment with expert guidance' },
  { id: 2, name: 'Swimming Pool', icon: '🏊', desc: 'Olympic-sized pool for aquatic fitness' },
  { id: 3, name: 'CrossFit', icon: '⚡', desc: 'High-intensity functional training sessions' },
  { id: 4, name: 'Yoga Classes', icon: '🧘', desc: 'Daily sessions for flexibility and mindfulness' },
  { id: 5, name: 'Zumba', icon: '💃', desc: 'Fun cardio dance fitness classes' },
  { id: 6, name: 'Sauna & Steam', icon: '🌡️', desc: 'Post-workout recovery and relaxation' },
  { id: 7, name: 'Personal Training', icon: '🎯', desc: 'Certified trainers tailored to your goals' },
  { id: 8, name: 'Nutrition Consulting', icon: '🥗', desc: 'Custom diet plans from expert nutritionists' },
  { id: 9, name: 'Cycling', icon: '🚴', desc: 'Indoor cycling for maximum cardio burn' }
];

const reviews = [
  { name: 'Gautam Gumber', rating: 5, text: 'The gym is clean, well-equipped, and has a positive, motivating atmosphere. The trainers are excellent and really push you to your limits.', time: '2 months ago' },
  { name: 'Vansh Rawal', rating: 5, text: 'Best gym experience I have ever had. The space is massive and all equipment is top quality. Love the swimming pool!', time: '4 months ago' },
  { name: 'DARSHIT JAIN', rating: 5, text: 'Good environment, all trainers are friendly and the place is very hygienic. Highly recommend S3 Fitness to everyone in Panipat.', time: '9 months ago' },
  { name: 'Rajat F', rating: 5, text: 'Best gym in Panipat — big space, all assets available, staff very helpful and the owner is also very friendly.', time: '4 months ago' }
];

// ─── API Routes ──────────────────────────────────────────────────────

// GET: Plans
app.get('/api/plans', (req, res) => {
  res.json({ success: true, data: plans });
});

// GET: Services
app.get('/api/services', (req, res) => {
  res.json({ success: true, data: services });
});

// GET: Reviews
app.get('/api/reviews', (req, res) => {
  res.json({ success: true, data: reviews, meta: { rating: 4.8, total: 144 } });
});

// POST: Book a free trial / membership inquiry
app.post('/api/leads', async (req, res) => {
  const { name, phone, email, planId, goal } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone number are required.' });
  }

  if (!/^[6-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit Indian mobile number.' });
  }

  const selectedPlan = plans.find((plan) => plan.id === planId);
  const lead = {
    id: Date.now(),
    name: name.trim(),
    phone: phone.trim(),
    email: email ? email.trim() : null,
    planId: planId || null,
    plan: selectedPlan ? selectedPlan.name : planId || null,
    membershipValue: selectedPlan ? selectedPlan.price : null,
    goal: goal || null,
    createdAt: new Date().toISOString(),
    status: 'New Lead',
    source: 'Website'
  };

  leads.push(lead);
  console.log(`[NEW LEAD] ${lead.name} | ${lead.phone} | Plan: ${lead.planId || 'Not selected'}`);
  await sendToGoogleSheet('lead', lead);

  res.json({
    success: true,
    message: `Thanks ${lead.name}! Our team will call you within 2 hours to confirm your free trial.`,
    data: { id: lead.id }
  });
});

// POST: Contact / General inquiry
app.post('/api/contact', async (req, res) => {
  const { name, phone, email, subject, message } = req.body;

  if (!name || !message) {
    return res.status(400).json({ success: false, message: 'Name and message are required.' });
  }

  const inquiry = {
    id: Date.now(),
    name: name.trim(),
    phone: phone ? phone.trim() : null,
    email: email ? email.trim() : null,
    subject: subject || 'General Inquiry',
    message: message.trim(),
    createdAt: new Date().toISOString(),
    status: 'New Lead',
    source: 'Website'
  };

  inquiries.push(inquiry);
  console.log(`[NEW INQUIRY] ${inquiry.name} | ${inquiry.subject}`);
  await sendToGoogleSheet('contact', inquiry);

  res.json({
    success: true,
    message: 'Your message has been received. We will get back to you soon!'
  });
});

// GET: Admin — view leads (protect with auth in production)
app.get('/api/admin/leads', (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'S3Admin2024') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  res.json({ success: true, data: leads, count: leads.length });
});

// GET: Admin — view inquiries
app.get('/api/admin/inquiries', (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'S3Admin2024') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  res.json({ success: true, data: inquiries, count: inquiries.length });
});

// Fallback: serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏋️  S3 Fitness server running at http://localhost:${PORT}`);
  console.log(`📋  Admin leads: GET /api/admin/leads  (Header: x-admin-key: S3Admin2024)`);
});
