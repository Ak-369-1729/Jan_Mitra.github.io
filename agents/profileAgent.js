/**
 * AGENT 2 — Eligibility Interview Agent
 * Converts raw eligibility form data into a clean, structured user profile
 * that can be used for vector embedding and eligibility matching.
 */

/**
 * Sanitizes and structures form data into a user profile object.
 * @param {Object} formData - Raw form data from the eligibility checker
 * @returns {Object} Structured user profile
 */
function buildUserProfile(formData) {
  const age = parseInt(formData.age) || 30;
  const incomeRaw = String(formData.income || '0').replace(/[,\s₹]/g, '');
  const income = parseInt(incomeRaw) || 0;
  const state = (formData.state || '').trim();
  const category = (formData.category || 'general').trim().toLowerCase();
  const email = (formData.email || '').trim().toLowerCase();

  // Determine mapped category tags
  const categoryTags = resolveCategoryTags(category, age);

  // Build a rich natural language profile for embedding
  const profileText = buildProfileText({ age, income, state, category, categoryTags });

  return {
    age,
    income,
    state: state || 'All India',
    category,
    categoryTags,
    email,
    profileText,  // Used for Gemini embedding
    timestamp: new Date().toISOString(),
  };
}

/**
 * Resolves all applicable category tags from primary category + age.
 */
function resolveCategoryTags(category, age) {
  const tags = new Set([category]);

  // Age-based inferences
  if (age >= 60) tags.add('senior');
  if (age <= 35) tags.add('youth');
  if (age >= 18 && age <= 25) tags.add('student');

  // Always include general unless explicitly reserved category
  if (!['sc_st', 'obc'].includes(category)) tags.add('general');

  // Women get women-specific schemes
  if (category === 'women') {
    tags.add('women');
    tags.add('general');
  }

  return [...tags];
}

/**
 * Generates a natural language description of the user profile for semantic embedding.
 */
function buildProfileText({ age, income, state, category, categoryTags }) {
  const incomeLabel = incomeToLabel(income);
  const catLabel = categoryToLabel(category);
  const stateLabel = state || 'any state in India';

  return [
    `Indian citizen aged ${age} years.`,
    `Annual household income: ${incomeLabel}.`,
    `Residing in ${stateLabel}.`,
    `Social category: ${catLabel}.`,
    `Eligible category tags: ${categoryTags.join(', ')}.`,
    `Interested in government welfare schemes, subsidies, financial assistance, health coverage, housing support, and educational benefits.`,
  ].join(' ');
}

function incomeToLabel(income) {
  if (!income || income === 0) return 'not specified';
  if (income <= 100000) return `₹${income.toLocaleString('en-IN')} per year (very low income / BPL)`;
  if (income <= 300000) return `₹${income.toLocaleString('en-IN')} per year (low income)`;
  if (income <= 600000) return `₹${income.toLocaleString('en-IN')} per year (middle income)`;
  if (income <= 1200000) return `₹${income.toLocaleString('en-IN')} per year (upper middle income)`;
  return `₹${income.toLocaleString('en-IN')} per year (high income)`;
}

function categoryToLabel(category) {
  const map = {
    general: 'General (unreserved)',
    sc_st: 'Scheduled Caste / Scheduled Tribe (SC/ST)',
    obc: 'Other Backward Class (OBC)',
    women: 'Woman',
    farmer: 'Farmer / Agricultural worker',
    student: 'Student',
    senior: 'Senior Citizen (60+)',
    disabled: 'Person with Disability (PwD)',
  };
  return map[category] || category;
}

module.exports = { buildUserProfile };
