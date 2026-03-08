// agents/deadlineAgent.js
// DeadlineAgent – monitors scheme deadlines and triggers SMS alerts via Twilio.
// This module is deliberately isolated; it does NOT modify any existing logic.

const { supabase } = require('../supabaseClient'); // assume existing supabase client export
const { sendSms } = require('../utils/twilioClient');

/**
 * Checks all schemes for upcoming deadlines (within 7 days) and sends SMS alerts.
 * @param {Array<{phone:string}>} users - list of users to notify (you can fetch from your DB as needed).
 */
async function checkSchemeDeadlines(users = []) {
  try {
    // 1️⃣ Fetch schemes with deadline field
    const { data: schemes, error } = await supabase
      .from('schemes')
      .select('id, name, deadline')
      .neq('deadline', null);
    if (error) throw error;

    const today = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    // 2️⃣ Filter schemes whose deadline is within the next 7 days
    const upcoming = schemes.filter(s => {
      const deadline = new Date(s.deadline);
      const diffDays = Math.ceil((deadline - today) / msPerDay);
      return diffDays > 0 && diffDays <= 7;
    });

    // 3️⃣ For each upcoming scheme, send an SMS to every user supplied
    for (const scheme of upcoming) {
      const deadlineDate = new Date(scheme.deadline).toLocaleDateString();
      const daysLeft = Math.ceil((new Date(scheme.deadline) - today) / msPerDay);
      const body = `⚠️ Jan Mitra Alert\n\nThe deadline for ${scheme.name} is approaching in ${daysLeft} day(s) (by ${deadlineDate}).\nApply now to receive benefits.\nVisit Jan Mitra to apply.`;
      for (const user of users) {
        await sendSms(user.phone, body);
      }
    }
    return { success: true, notified: upcoming.length };
  } catch (err) {
    console.error('[DeadlineAgent]', err);
    return { success: false, error: err.message };
  }
}

module.exports = { checkSchemeDeadlines };
