import { useEffect, useMemo, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function useRevealOnScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function Home() {
  useRevealOnScroll();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [lead, setLead] = useState({ name: '', business_type: '', phone: '', email: '' });
  const [message, setMessage] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatStep, setChatStep] = useState(0);
  const [chatData, setChatData] = useState({ business_type: '', appointment_needed: '', best_time_to_call: '' });
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const chatQuestions = useMemo(
    () => [
      'Welcome! What kind of business do you run?',
      'Great. Do you need an appointment scheduled? (yes/no)',
      'What is the best time for us to call you?',
    ],
    []
  );

  const submitLead = async (payload) => {
    const res = await fetch(`${API_BASE}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit lead');
    return res.json();
  };

  const onLeadSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!lead.name || !lead.business_type || !lead.phone || !lead.email) {
      setMessage('Please fill all fields.');
      return;
    }

    try {
      await submitLead(lead);
      setMessage('Thanks! We received your request and sent a confirmation email.');
      setLead({ name: '', business_type: '', phone: '', email: '' });
    } catch {
      setMessage('Something went wrong. Please try again.');
    }
  };

  const handleVoiceDemo = () => {
    const utterance = new SpeechSynthesisUtterance(
      'Hello! This is your AI receptionist. We can book your appointments 24/7.'
    );
    speechSynthesis.speak(utterance);
  };

  const submitChatAnswer = async () => {
    if (!chatInput.trim()) return;

    const key = ['business_type', 'appointment_needed', 'best_time_to_call'][chatStep];
    const nextData = { ...chatData, [key]: chatInput.trim() };
    setChatData(nextData);
    setChatInput('');

    if (chatStep === 2) {
      const payload = {
        name: lead.name || 'Chat Visitor',
        phone: lead.phone || 'Not provided',
        email: lead.email || `chat-${Date.now()}@demo.local`,
        ...nextData,
      };
      await submitLead(payload);
      setChatStep(0);
      setChatData({ business_type: '', appointment_needed: '', best_time_to_call: '' });
      setChatOpen(false);
      setMessage('AI receptionist captured and qualified this lead.');
      return;
    }

    setChatStep((s) => s + 1);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/40 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold">AI Agency</h1>
          <button className="btn border border-slate-300 dark:border-slate-700" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <section className="reveal card relative overflow-hidden shadow-glow">
          <h2 className="text-4xl font-extrabold md:text-5xl">Turn Missed Calls Into Booked Appointments — 24/7</h2>
          <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-300">
            We deploy AI receptionists for dentists, HVAC teams, lawyers, and real estate professionals to capture every lead.
          </p>
        </section>

        <section className="reveal grid gap-4 md:grid-cols-2">
          <div className="card">
            <h3 className="mb-3 text-xl font-semibold">Service Explanation</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Our AI receptionist answers instantly, qualifies prospects, syncs calendars, and sends reminders while your team focuses on delivery.
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
              <li>Dentists: fill canceled slots.</li>
              <li>HVAC: dispatch urgent calls quickly.</li>
              <li>Law firms: screen case inquiries.</li>
              <li>Real estate: convert showing requests into meetings.</li>
            </ul>
          </div>
          <div className="card">
            <h3 className="mb-3 text-xl font-semibold">Appointment Booking Demo</h3>
            <div className="rounded-xl border border-dashed border-brand-500/40 p-4">
              <p className="font-medium">Calendar Embed Simulation</p>
              <div className="mt-3 grid grid-cols-7 gap-2 text-center text-xs">
                {Array.from({ length: 28 }).map((_, i) => (
                  <button key={i} className="rounded-lg bg-slate-100 p-2 hover:bg-brand-500 hover:text-white dark:bg-slate-800">
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="reveal grid gap-4 md:grid-cols-2">
          <div className="card">
            <h3 className="mb-3 text-xl font-semibold">Pricing</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-sm text-slate-500">Setup Fee</p>
                <p className="text-2xl font-bold">$500–$1,500</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="text-sm text-slate-500">Monthly Retainer</p>
                <p className="text-2xl font-bold">$500–$1,000</p>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="mb-3 text-xl font-semibold">Key Tools</h3>
            <div className="flex flex-wrap gap-2">
              {['Botpress', 'CustomGPT', 'n8n', 'Make.com', 'CloudTalk'].map((tool) => (
                <span key={tool} className="rounded-full bg-brand-500/15 px-3 py-1 text-sm font-semibold text-brand-600 dark:text-brand-500">
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="reveal card">
          <h3 className="mb-4 text-xl font-semibold">Lead Capture Form</h3>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onLeadSubmit}>
            {['name', 'business_type', 'phone', 'email'].map((field) => (
              <input
                key={field}
                className="rounded-xl border border-slate-300 bg-transparent p-3 dark:border-slate-700"
                placeholder={field.replace('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())}
                type={field === 'email' ? 'email' : 'text'}
                value={lead[field]}
                onChange={(e) => setLead((prev) => ({ ...prev, [field]: e.target.value }))}
                required
              />
            ))}
            <button className="btn-primary md:col-span-2" type="submit">
              Submit Lead
            </button>
          </form>
          {message && <p className="mt-3 text-sm text-brand-600">{message}</p>}
        </section>

        <section className="reveal card flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Voice Call Simulation</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">Click to hear an AI greeting for inbound calls.</p>
          </div>
          <button className="btn-primary" onClick={handleVoiceDemo}>Click-to-Call Demo</button>
        </section>
      </main>

      <button
        className="fixed bottom-4 right-4 rounded-full bg-brand-500 px-4 py-3 font-semibold text-white shadow-glow"
        onClick={() => setChatOpen((v) => !v)}
      >
        AI Chat
      </button>

      {chatOpen && (
        <div className="fixed bottom-20 right-4 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-semibold">AI Receptionist</p>
          <p className="mt-2 text-sm">{chatQuestions[chatStep]}</p>
          <input
            className="mt-3 w-full rounded-lg border border-slate-300 bg-transparent p-2 text-sm dark:border-slate-700"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Your answer"
          />
          <button className="btn-primary mt-2 w-full" onClick={submitChatAnswer}>
            Send
          </button>
        </div>
      )}
    </div>
  );
}

function Admin() {
  const [auth, setAuth] = useState({ username: '', password: '' });
  const [loggedIn, setLoggedIn] = useState(false);
  const [leads, setLeads] = useState([]);

  const basicAuth = useMemo(
    () => `Basic ${btoa(`${auth.username}:${auth.password}`)}`,
    [auth.username, auth.password]
  );

  const loadLeads = async () => {
    const res = await fetch(`${API_BASE}/api/leads`, { headers: { Authorization: basicAuth } });
    if (!res.ok) return;
    setLeads(await res.json());
  };

  const login = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auth),
    });
    if (res.ok) {
      setLoggedIn(true);
      loadLeads();
    }
  };

  const updateLead = async (id, status, qualified) => {
    await fetch(`${API_BASE}/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: basicAuth },
      body: JSON.stringify({ status, qualified }),
    });
    loadLeads();
  };

  if (!loggedIn) {
    return (
      <div className="mx-auto mt-16 max-w-md card">
        <h2 className="text-2xl font-bold">Admin Login</h2>
        <form className="mt-4 space-y-3" onSubmit={login}>
          <input className="w-full rounded-xl border p-3" placeholder="Username" value={auth.username} onChange={(e) => setAuth((p) => ({ ...p, username: e.target.value }))} />
          <input className="w-full rounded-xl border p-3" type="password" placeholder="Password" value={auth.password} onChange={(e) => setAuth((p) => ({ ...p, password: e.target.value }))} />
          <button className="btn-primary w-full">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h2 className="mb-4 text-3xl font-bold">Leads Dashboard</h2>
      <div className="overflow-x-auto card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              {['Name', 'Business', 'Phone', 'Email', 'Qualified', 'Status', 'Actions'].map((h) => (
                <th key={h} className="px-2 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-2 py-2">{lead.name}</td>
                <td className="px-2 py-2">{lead.business_type}</td>
                <td className="px-2 py-2">{lead.phone}</td>
                <td className="px-2 py-2">{lead.email}</td>
                <td className="px-2 py-2">{lead.qualified ? 'Yes' : 'No'}</td>
                <td className="px-2 py-2">{lead.status}</td>
                <td className="px-2 py-2">
                  <button className="btn border" onClick={() => updateLead(lead.id, 'contacted', lead.qualified)}>Mark Contacted</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}
