/**
 * AGENT 3 — Benefit Discovery Agent
 * Uses Gemini text embeddings + Supabase pgvector for semantic scheme matching.
 * Falls back to rule-based matching if vector search is unavailable.
 * Generates "Why you qualify" explanations via Gemini.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ─── Hardcoded fallback scheme data (mirrors index.html but enriched) ──────────
const FALLBACK_SCHEMES = [
  {
    id: 1, name: 'PM Kisan Samman Nidhi', category: 'Agriculture', icon: '🌾',
    iconBg: 'bg-green-500/10', benefit: '₹6,000', benefitType: 'per year',
    desc: 'Direct income support for small and marginal farmers.',
    fullDesc: 'PM-KISAN provides direct income support of ₹6,000 per year to small and marginal farmers holding up to 2 hectares of land, paid in three installments.',
    eligibility_rules: { income_max: 300000, categories: ['farmer'], age_min: 18 },
    documents: ['Aadhaar Card', 'Land records', 'Bank passbook'],
    link: 'https://pmkisan.gov.in',
    eligibility: ['Farmer family owning up to 2 hectares of agricultural land', 'Indian citizen', 'Bank account with Aadhaar linkage'],
    docs: ['Aadhaar Card', 'Land records (Khasra/Khatauni)', 'Bank passbook', 'Mobile number'],
  },
  {
    id: 2, name: 'Ayushman Bharat PM-JAY', category: 'Health', icon: '🏥',
    iconBg: 'bg-blue-500/10', benefit: '₹5 Lakh', benefitType: 'health cover',
    desc: "World's largest government-funded health insurance scheme.",
    fullDesc: 'PM-JAY provides annual health cover of ₹5 lakh per family for hospitalization to over 10.74 crore poor and vulnerable families.',
    eligibility_rules: { income_max: 200000, categories: ['general', 'sc_st', 'obc'] },
    documents: ['Aadhaar Card', 'Ration Card'],
    link: 'https://pmjay.gov.in',
    eligibility: ['Listed in SECC 2011 database', 'Below Poverty Line (BPL) family', 'No other government health insurance'],
    docs: ['Aadhaar Card', 'Ration Card', 'SECC verification'],
  },
  {
    id: 3, name: 'PM Awas Yojana (Urban)', category: 'Housing', icon: '🏠',
    iconBg: 'bg-orange-500/10', benefit: '₹2.5 Lakh', benefitType: 'subsidy',
    desc: 'Affordable housing for urban poor under "Housing for All" mission.',
    fullDesc: 'PMAY-Urban provides central assistance for construction/acquisition of houses to urban poor, including credit-linked subsidy for EWS/LIG/MIG categories.',
    eligibility_rules: { income_max: 1800000, categories: ['general', 'sc_st', 'obc', 'women'] },
    documents: ['Aadhaar Card', 'Income certificate', 'Bank account'],
    link: 'https://pmaymis.gov.in',
    eligibility: ['Urban area resident', 'Annual income < ₹18 lakh (MIG-II)', 'No pucca house in family', 'First-time home buyer'],
    docs: ['Aadhaar Card', 'Income certificate', 'Property documents', 'Bank account'],
  },
  {
    id: 4, name: 'Post Matric Scholarship (SC)', category: 'Education', icon: '📚',
    iconBg: 'bg-purple-500/10', benefit: '₹7,000', benefitType: 'per year',
    desc: 'Scholarship for SC students pursuing post-matriculation education.',
    fullDesc: 'Central sector scholarship covering maintenance allowance and non-refundable fees for SC students studying at post-matric level.',
    eligibility_rules: { income_max: 250000, categories: ['sc_st'], age_max: 30 },
    documents: ['Caste certificate', 'Income certificate', 'Marksheet'],
    link: 'https://scholarships.gov.in',
    eligibility: ['SC category student', 'Annual family income < ₹2.5 lakh', 'Studying in recognised institution'],
    docs: ['Caste certificate', 'Income certificate', 'Marksheet', 'Admission proof'],
  },
  {
    id: 5, name: 'Beti Bachao Beti Padhao', category: 'Women', icon: '👧',
    iconBg: 'bg-pink-500/10', benefit: 'Free', benefitType: 'services',
    desc: 'Scheme to address declining child sex ratio and promote girl education.',
    fullDesc: 'BBBP provides scholarships, awareness, and support to prevent gender-biased elimination and promote girl education across India.',
    eligibility_rules: { categories: ['women'], age_max: 21 },
    documents: ['Birth certificate', 'Aadhaar', 'School enrollment proof'],
    link: 'https://wcd.nic.in',
    eligibility: ['Girl child / young woman', 'Indian citizen', 'Enrolled or to be enrolled in school'],
    docs: ['Birth certificate', 'Aadhaar', 'School enrollment proof'],
  },
  {
    id: 6, name: 'PM Mudra Yojana', category: 'Finance', icon: '💳',
    iconBg: 'bg-yellow-500/10', benefit: '₹10 Lakh', benefitType: 'loan',
    desc: 'Micro-enterprise loans for small businesses without collateral.',
    fullDesc: 'PMMY provides loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises in three tiers: Shishu, Kishore, and Tarun.',
    eligibility_rules: { age_min: 18, age_max: 65, categories: ['general', 'sc_st', 'obc', 'women', 'farmer'] },
    documents: ['Identity proof', 'Address proof', 'Business proof'],
    link: 'https://mudra.org.in',
    eligibility: ['Any Indian citizen', 'Non-farm business activity', 'Age 18–65 years', 'No willful default history'],
    docs: ['Identity proof', 'Address proof', 'Business proof', 'Bank statement'],
  },
  {
    id: 7, name: 'MGNREGA', category: 'Agriculture', icon: '🔨',
    iconBg: 'bg-amber-500/10', benefit: '₹267+', benefitType: 'per day',
    desc: 'Guaranteed 100 days of wage employment per household per year.',
    fullDesc: 'MGNREGA guarantees 100 days of wage employment per year to every household whose adults volunteer for unskilled manual work.',
    eligibility_rules: { age_min: 18, categories: ['general', 'sc_st', 'obc', 'farmer'] },
    documents: ['Job Card', 'Aadhaar', 'Bank account'],
    link: 'https://nrega.nic.in',
    eligibility: ['Rural household member', 'Adult (18+ years)', 'Willing to do unskilled work'],
    docs: ['Job Card', 'Aadhaar', 'Bank account', 'Residence proof'],
  },
  {
    id: 8, name: 'PM Ujjwala Yojana 2.0', category: 'Women', icon: '🔥',
    iconBg: 'bg-red-500/10', benefit: 'Free LPG', benefitType: 'connection',
    desc: 'Free LPG connections for women from below poverty line households.',
    fullDesc: 'PMUY 2.0 provides free LPG connection to adult women from poor households including migrant families, with free first refill and hot plate.',
    eligibility_rules: { income_max: 250000, categories: ['women'], age_min: 18 },
    documents: ['Aadhaar', 'Bank account', 'BPL/ration card'],
    link: 'https://pmuy.gov.in',
    eligibility: ['Adult woman (18+)', 'BPL household', 'No existing LPG connection in family'],
    docs: ['Aadhaar', 'Bank account', 'BPL/ration card', 'Self-declaration for migrants'],
  },
  {
    id: 9, name: 'Sukanya Samriddhi Yojana', category: 'Women', icon: '👶',
    iconBg: 'bg-rose-500/10', benefit: '8.2% Interest', benefitType: 'savings scheme',
    desc: 'High-interest savings scheme for a girl child\'s future.',
    fullDesc: 'SSY offers 8.2% interest on deposits for girl children below 10 years. Tax-free maturity after 21 years. Minimum ₹250/year.',
    eligibility_rules: { categories: ['women'], age_max: 10 },
    documents: ['Girl\'s birth certificate', 'Parent/guardian Aadhaar', 'Bank account'],
    link: 'https://www.nsiindia.gov.in',
    eligibility: ['Girl child below 10 years', 'Indian citizen', 'One account per girl child'],
    docs: ['Birth certificate', 'Parent Aadhaar', 'Parent PAN'],
  },
  {
    id: 10, name: 'Pradhan Mantri Jivan Jyoti Bima', category: 'Finance', icon: '🛡️',
    iconBg: 'bg-indigo-500/10', benefit: '₹2 Lakh', benefitType: 'life insurance',
    desc: 'Affordable term life insurance at just ₹436/year for all Indians.',
    fullDesc: 'PMJJBY offers ₹2 lakh life insurance cover for death due to any cause at a premium of ₹436 per annum. Renewable annually.',
    eligibility_rules: { age_min: 18, age_max: 50, categories: ['general', 'sc_st', 'obc', 'women', 'farmer'] },
    documents: ['Aadhaar', 'Bank account', 'Mobile number'],
    link: 'https://jansuraksha.gov.in',
    eligibility: ['Age 18–50 years', 'Savings bank account', 'Consent to auto-debit'],
    docs: ['Aadhaar Card', 'Bank passbook', 'Mobile number'],
  },
  {
    id: 11, name: 'PM Fasal Bima Yojana', category: 'Agriculture', icon: '🌱',
    iconBg: 'bg-emerald-500/10', benefit: 'Crop Loss Cover', benefitType: 'insurance',
    desc: 'Comprehensive crop insurance for farmers against natural calamities.',
    fullDesc: 'PMFBY provides financial support to farmers against crop losses due to unforeseen events. Premium as low as 2% for Kharif crops.',
    eligibility_rules: { categories: ['farmer'], age_min: 18 },
    documents: ['Land records', 'Aadhaar', 'Bank account', 'Sowing certificate'],
    link: 'https://pmfby.gov.in',
    eligibility: ['Farmer (loanee or non-loanee)', 'Cultivating notified crops', 'Enrolment before cut-off date'],
    docs: ['Land records', 'Aadhaar', 'Bank account', 'Sowing certificate'],
  },
  {
    id: 12, name: 'Scholarship for SC Students (Pre-Matric)', category: 'Education', icon: '🎓',
    iconBg: 'bg-violet-500/10', benefit: '₹3,500', benefitType: 'per year',
    desc: 'Pre-matriculation scholarship for SC students in Class 9 and 10.',
    fullDesc: 'Central scholarship to support SC students studying in Class 9 and 10, covering monthly maintenance and school fees.',
    eligibility_rules: { income_max: 250000, categories: ['sc_st'], age_max: 20 },
    documents: ['Caste certificate', 'Income certificate', 'School enrollment'],
    link: 'https://scholarships.gov.in',
    eligibility: ['SC student in Class 9 or 10', 'Annual family income < ₹2.5 lakh'],
    docs: ['Caste certificate', 'Income certificate', 'School enrollment', 'Aadhaar'],
  },
];

/**
 * Generates a text embedding using Gemini text-embedding-004.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  const embModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await embModel.embedContent(text);
  return result.embedding.values;
}

/**
 * Computes cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

/**
 * Rule-based eligibility scoring (0–100) against eligibility_rules.
 */
function ruleScore(scheme, profile) {
  const rules = scheme.eligibility_rules || {};
  let score = 60; // base

  // Income check
  if (rules.income_max && profile.income > 0) {
    if (profile.income <= rules.income_max) score += 20;
    else score -= 30;
  } else if (!rules.income_max) {
    score += 10; // no income restriction, bonus
  }

  // Age checks
  if (rules.age_min && profile.age < rules.age_min) score -= 40;
  if (rules.age_max && profile.age > rules.age_max) score -= 40;
  if (!rules.age_min && !rules.age_max) score += 5;

  // Category match
  if (rules.categories && rules.categories.length > 0) {
    const userTags = new Set(profile.categoryTags || [profile.category, 'general']);
    const categoryMatch = rules.categories.some(c => userTags.has(c));
    if (categoryMatch) score += 20;
    else score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Generates a "Why you qualify" explanation for a scheme using Gemini.
 */
async function generateExplanation(scheme, profile) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `
You are a helpful government scheme advisor.
Explain in ONE short sentence (max 20 words) why this person qualifies for this scheme.
Keep it warm, clear, and specific.

Person: Age ${profile.age}, income ₹${profile.income.toLocaleString('en-IN')}/year, ${profile.category} category, state: ${profile.state}.
Scheme: ${scheme.name} — ${scheme.desc}
Eligibility criteria: ${JSON.stringify(scheme.eligibility_rules)}

Respond with ONLY the explanation sentence. No intro, no quotes.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/^"|"$/g, '');
  } catch {
    return generateFallbackExplanation(scheme, profile);
  }
}

function generateFallbackExplanation(scheme, profile) {
  const rules = scheme.eligibility_rules || {};
  const parts = [];
  if (rules.income_max && profile.income <= rules.income_max)
    parts.push(`your income (₹${profile.income.toLocaleString('en-IN')}) is within the ₹${rules.income_max.toLocaleString('en-IN')} limit`);
  if (rules.categories?.includes(profile.category))
    parts.push(`you are in the ${profile.category} category`);
  if (!parts.length) parts.push('your profile matches the general eligibility criteria');
  return `You qualify because ${parts.join(' and ')}.`;
}

/**
 * Main discovery function: embed user profile → semantic + rule scoring → ranked matches.
 * @param {Object} profile - Output from buildUserProfile()
 * @returns {Promise<Array>} Ranked scheme matches
 */
async function discoverBenefits(profile) {
  let profileEmbedding = null;
  let schemeEmbeddings = null;

  // ── Step 1: Try Gemini embedding ──────────────────────────────────────────
  try {
    profileEmbedding = await generateEmbedding(profile.profileText);
  } catch (err) {
    console.warn('[DiscoveryAgent] Embedding failed, using rule-only matching:', err.message);
  }

  // ── Step 2: Load schemes from Supabase (with fallback) ────────────────────
  let schemes = FALLBACK_SCHEMES;
  try {
    const { data, error } = await supabase
      .from('schemes')
      .select('*')
      .limit(50);
    if (!error && data && data.length > 0) {
      schemes = data.map(s => ({
        ...s,
        iconBg: s.icon_bg || 'bg-saffron-500/10',
        fullDesc: s.full_desc,
        benefitType: s.benefit_type,
        eligibility: s.eligibility_list || [],
        docs: s.documents || [],
      }));
    }
  } catch (err) {
    console.warn('[DiscoveryAgent] Supabase load failed, using fallback schemes:', err.message);
  }

  // ── Step 3: Try loading stored embeddings from Supabase ────────────────────
  if (profileEmbedding) {
    try {
      const { data: embData } = await supabase
        .from('policy_embeddings')
        .select('scheme_id, vector_embedding');
      if (embData && embData.length > 0) {
        schemeEmbeddings = embData;
      }
    } catch {
      // Silent fail
    }
  }

  // ── Step 4: Score each scheme ─────────────────────────────────────────────
  const scored = await Promise.all(schemes.map(async (scheme) => {
    const rScore = ruleScore(scheme, profile);

    // Semantic score from stored embedding
    let semanticScore = 50;
    if (profileEmbedding && schemeEmbeddings) {
      const embRecord = schemeEmbeddings.find(e => e.scheme_id === scheme.id);
      if (embRecord?.vector_embedding) {
        const sim = cosineSimilarity(profileEmbedding, embRecord.vector_embedding);
        semanticScore = Math.round(sim * 100);
      }
    } else if (profileEmbedding) {
      // Generate embedding for this scheme on-the-fly and compare
      try {
        const schemeText = `${scheme.name}: ${scheme.desc} ${scheme.fullDesc || ''} Category: ${scheme.category}.`;
        const schemeEmb = await generateEmbedding(schemeText);
        const sim = cosineSimilarity(profileEmbedding, schemeEmb);
        semanticScore = Math.round(sim * 100);
      } catch {
        semanticScore = 50;
      }
    }

    // Combined score: 60% rules + 40% semantic
    const combinedScore = Math.round(rScore * 0.6 + semanticScore * 0.4);

    return { scheme, rScore, semanticScore, combinedScore };
  }));

  // ── Step 5: Filter (score >= 40) and sort ─────────────────────────────────
  const candidates = scored
    .filter(s => s.combinedScore >= 40)
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 8);

  // ── Step 6: Generate explanations concurrently (with throttle) ─────────────
  const withExplanations = await Promise.all(
    candidates.map(async ({ scheme, combinedScore }) => {
      const explanation = await generateExplanation(scheme, profile);
      return {
        id: scheme.id,
        name: scheme.name,
        category: scheme.category,
        icon: scheme.icon,
        iconBg: scheme.iconBg || 'bg-saffron-500/10',
        desc: scheme.desc,
        fullDesc: scheme.fullDesc || scheme.full_desc || scheme.desc,
        benefit: scheme.benefit,
        benefitType: scheme.benefitType || scheme.benefit_type,
        eligibility: scheme.eligibility || [],
        docs: scheme.docs || scheme.documents || [],
        link: scheme.link || '#',
        match: combinedScore,
        explanation,
      };
    })
  );

  // Save the query to Supabase for analytics (non-blocking)
  supabase.from('user_queries').insert({
    query: profile.profileText,
    state: profile.state,
    category: profile.category,
    results_count: withExplanations.length,
    created_at: new Date().toISOString(),
  }).then(() => {}).catch(() => {});

  return withExplanations;
}

/**
 * Semantic scheme search: embeds a text query and finds closest schemes.
 */
async function searchSchemes(query) {
  let queryEmbedding = null;
  try {
    queryEmbedding = await generateEmbedding(query);
  } catch {
    // Fallback to fuzzy keyword match
  }

  const schemes = FALLBACK_SCHEMES;

  if (!queryEmbedding) {
    // Simple keyword filter fallback
    const q = query.toLowerCase();
    return schemes.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.desc.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    ).slice(0, 6);
  }

  const scored = await Promise.all(schemes.map(async (scheme) => {
    try {
      const schemeText = `${scheme.name} ${scheme.category} ${scheme.desc}`;
      const emb = await generateEmbedding(schemeText);
      const sim = cosineSimilarity(queryEmbedding, emb);
      return { scheme, sim };
    } catch {
      return { scheme, sim: 0 };
    }
  }));

  return scored
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 6)
    .map(s => s.scheme);
}

module.exports = { discoverBenefits, searchSchemes, generateEmbedding };
