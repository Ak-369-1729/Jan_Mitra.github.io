/**
 * JanMitra AI-Powered Government Scheme Discovery Platform
 * Express Backend Server — All agent endpoints + security middleware
 */

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient }       = require('@supabase/supabase-js');

const { interpretPolicy }  = require('./agents/policyAgent');
const { buildUserProfile } = require('./agents/profileAgent');
const { discoverBenefits, searchSchemes } = require('./agents/discoveryAgent');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Clients ──────────────────────────────────────────────────────────────────
const genAI    = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    'null',             // allow file:// origin (local HTML file)
  ],
  credentials: true,
}));
app.use(express.json({ limit: '500kb' }));

// Global rate limit: 60 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment.' },
});
app.use('/api/', limiter);

// Serve the frontend static files (index.html, app.js)
app.use(express.static(__dirname, { index: 'index.html' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'JanMitra AI Backend',
    time: new Date().toISOString(),
  });
});

// ── ROUTE: POST /api/interpret-policy ─────────────────────────────────────────
// Agent 1 — Parse raw government scheme text via Gemini
app.post('/api/interpret-policy', async (req, res) => {
  const { policyText } = req.body;
  if (!policyText || typeof policyText !== 'string') {
    return res.status(400).json({ error: 'policyText is required' });
  }
  try {
    const result = await interpretPolicy(policyText);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[/api/interpret-policy]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── ROUTE: POST /api/build-profile ────────────────────────────────────────────
// Agent 2 — Structure form data into user profile
app.post('/api/build-profile', (req, res) => {
  const { formData } = req.body;
  if (!formData || typeof formData !== 'object') {
    return res.status(400).json({ error: 'formData object is required' });
  }
  try {
    const profile = buildUserProfile(formData);
    res.json({ success: true, data: profile });
  } catch (err) {
    console.error('[/api/build-profile]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── ROUTE: POST /api/discover-benefits ───────────────────────────────────────
// Agent 3 — Vector + rule-based scheme matching
app.post('/api/discover-benefits', async (req, res) => {
  const { profile } = req.body;
  if (!profile || typeof profile !== 'object') {
    return res.status(400).json({ error: 'profile object is required' });
  }
  try {
    const matches = await discoverBenefits(profile);
    res.json({ success: true, data: matches });
  } catch (err) {
    console.error('[/api/discover-benefits]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── ROUTE: POST /api/search-schemes ──────────────────────────────────────────
// Semantic scheme search bar
app.post('/api/search-schemes', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return res.status(400).json({ error: 'query (min 2 chars) is required' });
  }
  try {
    const results = await searchSchemes(query.trim());
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('[/api/search-schemes]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── ROUTE: POST /api/chat ─────────────────────────────────────────────────────
// AI Chat Assistant: user question → context-aware Gemini answer
app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Try to find relevant schemes via semantic search first
    let schemeContext = '';
    try {
      const schemes = await searchSchemes(message);
      if (schemes.length > 0) {
        schemeContext = '\n\nRelevant schemes from database:\n' +
          schemes.map(s => `• ${s.name} (${s.category}): ${s.desc} — Benefit: ${s.benefit}`).join('\n');
      }
    } catch { /* silent */ }

    const systemPrompt = `You are Jan मित्र AI, a friendly and knowledgeable assistant that helps Indian citizens discover government welfare schemes they qualify for.

Your role:
- Answer questions about Indian government schemes, subsidies, welfare programs, and entitlements
- Explain eligibility criteria, required documents, and application processes
- Be warm, empathetic, and simple in your language
- When relevant, mention specific schemes with their benefits
- Keep responses concise (under 200 words) but helpful
- If asked in Hindi or regional language, respond in the same language
- Always end with a helpful call-to-action

Context about available schemes:${schemeContext}

Conversation history is provided for context.`;

    // Build chat history
    const chatHistory = (history || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      systemInstruction: systemPrompt,
      history: chatHistory,
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    res.json({ success: true, data: { reply, timestamp: new Date().toISOString() } });
  } catch (err) {
    console.error('[/api/chat]', err.message);
    res.status(500).json({ error: 'Chat failed. Please try again.' });
  }
});

// ── ROUTE: POST /api/translate ────────────────────────────────────────────────
// Multilingual translation via Gemini
app.post('/api/translate', async (req, res) => {
  const { texts, targetLanguage } = req.body;
  if (!texts || !Array.isArray(texts) || !targetLanguage) {
    return res.status(400).json({ error: 'texts array and targetLanguage are required' });
  }

  const langMap = {
    hi: 'Hindi (Devanagari script)',
    en: 'English',
    ta: 'Tamil',
    bn: 'Bengali',
    mr: 'Marathi',
    te: 'Telugu',
    kn: 'Kannada',
  };

  const langName = langMap[targetLanguage] || targetLanguage;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `Translate the following UI text strings to ${langName}.
Return ONLY a JSON array of translated strings in the exact same order.
Preserve any emoji or special characters. Keep translations natural and conversational.

Strings to translate:
${JSON.stringify(texts)}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim()
      .replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const translated = JSON.parse(raw);
    res.json({ success: true, data: translated });
  } catch (err) {
    console.error('[/api/translate]', err.message);
    // Return originals on failure so UI doesn't break
    res.json({ success: false, data: texts });
  }
});

// ── ROUTE: POST /api/save-session ─────────────────────────────────────────────
// Save eligibility results to Supabase for personal dashboard
app.post('/api/save-session', async (req, res) => {
  const { email, profile, matchedSchemes } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .upsert({
        email: cleanEmail,
        profile: profile || {},
        matched_schemes: matchedSchemes || [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.json({ success: true, data: { id: data.id, email: data.email } });
  } catch (err) {
    console.error('[/api/save-session]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── ROUTE: GET /api/get-session/:email ────────────────────────────────────────
// Retrieve saved session by email for personal dashboard
app.get('/api/get-session/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email).trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'No saved session found for this email.' });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/get-session]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── ROUTE: GET /api/schemes ───────────────────────────────────────────────────
// Serve full schemes list from Supabase (cached client-side)
app.get('/api/schemes', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('schemes')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw new Error(error.message);
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[/api/schemes]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 404 catch-all ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log(`║  Jan मित्र AI Server — Port ${PORT}       ║`);
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Gemini API   : ${process.env.GEMINI_API_KEY ? '✅ Connected' : '❌ Missing KEY'}`);
  console.log(`║  Supabase     : ${process.env.SUPABASE_URL  ? '✅ Connected' : '❌ Missing URL'}`);
  console.log('╚════════════════════════════════════════╝\n');
});
