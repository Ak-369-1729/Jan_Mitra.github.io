// routes/deadline.js
// DeadlineAgent route – triggers deadline checks and sends SMS alerts.

const express = require('express');
const router = express.Router();
const { checkSchemeDeadlines } = require('../agents/deadlineAgent');

/**
 * POST /api/deadlines/check
 * Body: { users: [{ phone: '+1234567890' }, ...] }
 * Returns: { success: true, notified: <number> }
 */
router.post('/check', async (req, res) => {
  const { users } = req.body;
  if (!Array.isArray(users) || users.length === 0) {
    return res.status(400).json({ error: 'users array required' });
  }
  const result = await checkSchemeDeadlines(users);
  if (result.success) {
    res.json({ success: true, notified: result.notified });
  } else {
    res.status(500).json({ error: result.error });
  }
});

module.exports = router;
