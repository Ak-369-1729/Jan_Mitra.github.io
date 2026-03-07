/**
 * AGENT 1 — Policy Interpretation Agent
 * Converts raw government scheme text into structured eligibility rules using Gemini.
 * Stores results in Supabase `schemes` table.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

/**
 * Interprets raw policy text and returns a structured scheme object.
 * @param {string} policyText - Raw text from a government PDF or webpage
 * @returns {Promise<Object>} Structured scheme object
 */
async function interpretPolicy(policyText) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
You are a government policy analyst specializing in Indian welfare schemes.
Analyze the following government scheme description and extract structured information.

Policy Text:
${policyText}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "name": "Scheme name",
  "category": "One of: Agriculture, Health, Housing, Education, Women, Finance, Employment, Senior Citizen, Disability",
  "description": "One sentence description",
  "fullDesc": "2-3 sentence detailed description",
  "benefit": "Primary benefit amount or description (e.g. ₹6,000, Free LPG, 5 Lakh)",
  "benefitType": "Short type label (e.g. per year, health cover, subsidy, loan)",
  "eligibility_rules": {
    "income_max": null or number in rupees,
    "income_min": null or number,
    "age_min": null or number,
    "age_max": null or number,
    "categories": [] array of: "general", "sc_st", "obc", "women", "farmer", "student", "senior", "disabled",
    "states": [] array of state names or ["all"],
    "land_required": true or false,
    "other": "Any other eligibility notes"
  },
  "documents": ["List of required documents"],
  "link": "Official portal URL or empty string",
  "icon": "A single relevant emoji"
}`;

  let parsed;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    // Strip any accidental markdown code fences
    const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    parsed = JSON.parse(clean);
  } catch (err) {
    throw new Error(`Gemini policy interpretation failed: ${err.message}`);
  }

  // Upsert into Supabase schemes table
  const { data, error } = await supabase
    .from('schemes')
    .upsert({
      name: parsed.name,
      category: parsed.category,
      description: parsed.description,
      full_desc: parsed.fullDesc,
      benefit: parsed.benefit,
      benefit_type: parsed.benefitType,
      eligibility_rules: parsed.eligibility_rules,
      documents: parsed.documents,
      link: parsed.link,
      icon: parsed.icon,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'name' })
    .select()
    .single();

  if (error) {
    console.error('[PolicyAgent] Supabase upsert error:', error.message);
    // Return parsed data even if DB write fails
    return parsed;
  }

  return { ...parsed, id: data.id };
}

module.exports = { interpretPolicy };
