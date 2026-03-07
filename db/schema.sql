-- ============================================================
-- JanMitra AI Platform — Supabase Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard
-- ============================================================

-- Enable pgvector extension for semantic similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────
-- TABLE: schemes
-- Stores all government scheme data + eligibility rules
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schemes (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL DEFAULT 'General',
  description     TEXT,
  full_desc       TEXT,
  benefit         TEXT,
  benefit_type    TEXT,
  eligibility_rules JSONB DEFAULT '{}',
  eligibility_list  TEXT[] DEFAULT '{}',
  documents       TEXT[] DEFAULT '{}',
  link            TEXT DEFAULT '',
  icon            TEXT DEFAULT '📋',
  icon_bg         TEXT DEFAULT 'bg-saffron-500/10',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast category filtering
CREATE INDEX IF NOT EXISTS idx_schemes_category ON schemes(category);
CREATE INDEX IF NOT EXISTS idx_schemes_active   ON schemes(is_active);

-- ─────────────────────────────────────────────────────────────
-- TABLE: policy_embeddings
-- Stores Gemini text-embedding-004 vectors (768 dimensions)
-- for semantic search via pgvector
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policy_embeddings (
  id              BIGSERIAL PRIMARY KEY,
  scheme_id       BIGINT REFERENCES schemes(id) ON DELETE CASCADE,
  vector_embedding VECTOR(768),          -- Gemini text-embedding-004
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for approximate nearest-neighbour search
CREATE INDEX IF NOT EXISTS idx_policy_emb_ivf
  ON policy_embeddings
  USING ivfflat (vector_embedding vector_cosine_ops)
  WITH (lists = 20);

-- ─────────────────────────────────────────────────────────────
-- TABLE: user_queries
-- Analytics — stores user search queries + embeddings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_queries (
  id              BIGSERIAL PRIMARY KEY,
  query           TEXT,
  embedding       VECTOR(768),
  state           TEXT,
  category        TEXT,
  results_count   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: user_sessions
-- Saves user eligibility results for personal dashboard
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id              BIGSERIAL PRIMARY KEY,
  email           TEXT NOT NULL,
  profile         JSONB NOT NULL DEFAULT '{}',
  matched_schemes JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(email);

-- ─────────────────────────────────────────────────────────────
-- FUNCTION: match_schemes (vector similarity search)
-- Called by the backend to find semantically similar schemes
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION match_schemes(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count     INT   DEFAULT 10
)
RETURNS TABLE (
  scheme_id  BIGINT,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    pe.scheme_id,
    1 - (pe.vector_embedding <=> query_embedding) AS similarity
  FROM policy_embeddings pe
  WHERE 1 - (pe.vector_embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ─────────────────────────────────────────────────────────────
-- SEED DATA: Pre-populate schemes table
-- ─────────────────────────────────────────────────────────────
INSERT INTO schemes (name, category, description, full_desc, benefit, benefit_type, eligibility_rules, eligibility_list, documents, link, icon, icon_bg)
VALUES
  (
    'PM Kisan Samman Nidhi', 'Agriculture',
    'Direct income support for small and marginal farmers.',
    'PM-KISAN provides direct income support of ₹6,000 per year to small and marginal farmers holding up to 2 hectares of land, paid in three equal installments directly to the farmer''s bank account.',
    '₹6,000', 'per year',
    '{"income_max": 300000, "categories": ["farmer"], "age_min": 18, "land_required": true}',
    ARRAY['Farmer family owning up to 2 hectares of agricultural land', 'Should be Indian citizen', 'Bank account with Aadhaar linkage mandatory'],
    ARRAY['Aadhaar Card', 'Land records (Khasra/Khatauni)', 'Bank passbook', 'Mobile number'],
    'https://pmkisan.gov.in', '🌾', 'bg-green-500/10'
  ),
  (
    'Ayushman Bharat PM-JAY', 'Health',
    'World''s largest government-funded health insurance scheme.',
    'PM-JAY provides annual health cover of ₹5 lakh per family for secondary and tertiary care hospitalization to over 10.74 crore poor and vulnerable families across India.',
    '₹5 Lakh', 'health cover',
    '{"income_max": 200000, "categories": ["general", "sc_st", "obc"]}',
    ARRAY['Listed in SECC 2011 database', 'Below Poverty Line (BPL) family', 'No other government health insurance'],
    ARRAY['Aadhaar Card', 'Ration Card', 'SECC verification'],
    'https://pmjay.gov.in', '🏥', 'bg-blue-500/10'
  ),
  (
    'PM Awas Yojana (Urban)', 'Housing',
    'Affordable housing for urban poor under "Housing for All" mission.',
    'PMAY-Urban provides central assistance for construction/acquisition of houses to urban poor, including credit-linked subsidy for EWS/LIG/MIG categories.',
    '₹2.5 Lakh', 'subsidy',
    '{"income_max": 1800000, "categories": ["general", "sc_st", "obc", "women"]}',
    ARRAY['Urban area resident', 'Annual income < ₹18 lakh (MIG-II)', 'No pucca house in family', 'First-time home buyer'],
    ARRAY['Aadhaar Card', 'Income certificate', 'Property documents', 'Bank account'],
    'https://pmaymis.gov.in', '🏠', 'bg-orange-500/10'
  ),
  (
    'PM Mudra Yojana', 'Finance',
    'Micro-enterprise loans for small businesses without collateral.',
    'PMMY provides loans up to ₹10 lakh to non-corporate, non-farm small/micro enterprises. Three tiers: Shishu (₹50k), Kishore (₹5L), Tarun (₹10L).',
    '₹10 Lakh', 'loan',
    '{"age_min": 18, "age_max": 65, "categories": ["general", "sc_st", "obc", "women", "farmer"]}',
    ARRAY['Any Indian citizen', 'Non-farm business activity', 'Age 18–65 years', 'No willful default history'],
    ARRAY['Identity proof', 'Address proof', 'Business proof', 'Bank statement'],
    'https://mudra.org.in', '💳', 'bg-yellow-500/10'
  ),
  (
    'PM Ujjwala Yojana 2.0', 'Women',
    'Free LPG connections for women from below poverty line households.',
    'PMUY 2.0 provides free LPG connection to adult women from poor households including migrant families, with free first refill and a hot plate.',
    'Free LPG', 'connection',
    '{"income_max": 250000, "categories": ["women"], "age_min": 18}',
    ARRAY['Adult woman (18+)', 'BPL household', 'No existing LPG connection in family'],
    ARRAY['Aadhaar', 'Bank account', 'BPL/ration card', 'Self-declaration for migrants'],
    'https://pmuy.gov.in', '🔥', 'bg-red-500/10'
  ),
  (
    'MGNREGA', 'Agriculture',
    'Guaranteed 100 days of wage employment per household per year.',
    'Mahatma Gandhi NREGA guarantees 100 days of wage employment per year to every rural household whose adult members volunteer for unskilled manual work.',
    '₹267+', 'per day',
    '{"age_min": 18, "categories": ["general", "sc_st", "obc", "farmer"]}',
    ARRAY['Rural household member', 'Adult (18+ years)', 'Willing to do unskilled work', 'Registered in job card'],
    ARRAY['Job Card', 'Aadhaar', 'Bank account', 'Residence proof'],
    'https://nrega.nic.in', '🔨', 'bg-amber-500/10'
  ),
  (
    'Post Matric Scholarship (SC)', 'Education',
    'Scholarship for SC students pursuing post-matriculation education.',
    'Central sector scholarship covering maintenance allowance and non-refundable fees for SC students studying at post-matric level in recognised institutions.',
    '₹7,000', 'per year',
    '{"income_max": 250000, "categories": ["sc_st"], "age_max": 30}',
    ARRAY['SC category student', 'Annual family income < ₹2.5 lakh', 'Studying in recognised institution', 'Not availing any other scholarship'],
    ARRAY['Caste certificate', 'Income certificate', 'Marksheet', 'Admission proof'],
    'https://scholarships.gov.in', '📚', 'bg-purple-500/10'
  ),
  (
    'Beti Bachao Beti Padhao', 'Women',
    'Scheme to address declining child sex ratio and promote girl education.',
    'BBBP aims to prevent gender-biased sex selective elimination, ensure survival and protection of the girl child, and ensure education and participation of girls across India.',
    'Free', 'services',
    '{"categories": ["women"], "age_max": 21}',
    ARRAY['Girl child below 10 years', 'Indian citizen', 'Enrolled or to be enrolled in school'],
    ARRAY['Birth certificate', 'Aadhaar', 'School enrollment proof'],
    'https://wcd.nic.in', '👧', 'bg-pink-500/10'
  )
ON CONFLICT (name) DO NOTHING;
