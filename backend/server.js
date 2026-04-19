const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const validator = require('validator');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const dbPath = process.env.DATABASE_URL || path.resolve(__dirname, 'agency.db');
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  qualified INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER,
  appointment_time TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
`);

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

const sanitizeLeadInput = (input = {}) => {
  const safeText = (value = '') => validator.escape(String(value).trim());
  return {
    name: safeText(input.name),
    business_type: safeText(input.business_type),
    phone: safeText(input.phone),
    email: safeText(input.email).toLowerCase(),
    appointment_needed: safeText(input.appointment_needed || ''),
    best_time_to_call: safeText(input.best_time_to_call || ''),
  };
};

const isAdmin = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const [scheme, encoded] = auth.split(' ');
  if (scheme !== 'Basic' || !encoded) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const [username, password] = Buffer.from(encoded, 'base64').toString().split(':');

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    return next();
  }
  return res.status(401).json({ message: 'Invalid admin credentials' });
};

const transporter = nodemailer.createTransport(
  process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
    : {
        jsonTransport: true,
      }
);

const sendAutoResponder = async (lead) => {
  const from = process.env.FROM_EMAIL || 'hello@aiagency.local';
  const info = await transporter.sendMail({
    from,
    to: lead.email,
    subject: 'Thanks! Your AI Appointment Setting Request Was Received',
    text: `Hi ${lead.name},\n\nThanks for contacting us. Our AI receptionist is reviewing your request for ${lead.business_type}. We'll call ${lead.phone} soon.\n\n- AI Agency Team`,
  });

  if (info.message) {
    console.log('Autoresponder preview:', info.message.toString());
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/admin/login', (req, res) => {
  const { username = '', password = '' } = req.body || {};
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, message: 'Invalid credentials' });
});

app.post('/api/leads', async (req, res) => {
  const lead = sanitizeLeadInput(req.body);

  if (!lead.name || !lead.business_type || !lead.phone || !validator.isEmail(lead.email)) {
    return res.status(400).json({ message: 'Please provide valid name, business type, phone, and email.' });
  }

  const qualified = Boolean(lead.appointment_needed && lead.best_time_to_call) ? 1 : 0;
  const status = qualified ? 'qualified' : 'new';

  const insert = db.prepare(
    'INSERT INTO leads (name, business_type, phone, email, qualified, status) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = insert.run(lead.name, lead.business_type, lead.phone, lead.email, qualified, status);

  try {
    await sendAutoResponder(lead);
  } catch (error) {
    console.error('Failed to send auto responder:', error.message);
  }

  return res.status(201).json({ id: result.lastInsertRowid, qualified, status });
});

app.get('/api/leads', isAdmin, (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  res.json(leads);
});

app.put('/api/leads/:id', isAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = validator.escape(String(req.body.status || 'new'));
  const qualified = req.body.qualified ? 1 : 0;

  db.prepare('UPDATE leads SET status = ?, qualified = ? WHERE id = ?').run(status, qualified, id);
  res.json({ ok: true });
});

app.post('/api/webhook/agent-callback', (req, res) => {
  const event = validator.escape(String(req.body.event || 'callback_received'));
  const leadId = Number(req.body.leadId || 0);
  console.log('Webhook callback:', { event, leadId, payload: req.body });
  res.json({ ok: true, event, leadId });
});

app.post('/api/automation/run', (req, res) => {
  const pending = db
    .prepare("SELECT * FROM leads WHERE status IN ('new', 'qualified') ORDER BY created_at ASC LIMIT 25")
    .all();

  const appointmentInsert = db.prepare(
    'INSERT INTO appointments (lead_id, appointment_time, notes) VALUES (?, ?, ?)'
  );
  const leadUpdate = db.prepare('UPDATE leads SET status = ? WHERE id = ?');

  for (const lead of pending) {
    if (lead.qualified) {
      const time = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      appointmentInsert.run(lead.id, time, 'Auto-scheduled demo appointment via workflow simulation');
      leadUpdate.run('invite_sent', lead.id);
    } else {
      leadUpdate.run('follow_up_sent', lead.id);
    }
  }

  return res.json({ ok: true, processed: pending.length });
});

cron.schedule('*/2 * * * *', () => {
  const pendingCount = db
    .prepare("SELECT COUNT(*) AS count FROM leads WHERE status IN ('new', 'qualified')")
    .get().count;

  if (pendingCount > 0) {
    db.prepare("UPDATE leads SET status = CASE WHEN qualified = 1 THEN 'invite_sent' ELSE 'follow_up_sent' END WHERE status IN ('new', 'qualified')").run();
    console.log(`[workflow] Processed ${pendingCount} leads at ${new Date().toISOString()}`);
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
