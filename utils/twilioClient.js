// utils/twilioClient.js
// Simple wrapper around Twilio SDK to send SMS messages.
// Credentials are read from environment variables defined in .env.

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !fromNumber) {
  console.warn('[Twilio] Missing environment variables – SMS notifications will be disabled.');
}


/**
 * Send an SMS message via Twilio.
 * @param {string} to   Destination phone number in E.164 format (e.g. +1234567890).
 * @param {string} body Message body.
 */
async function sendSms(to, body) {
  if (!client) {
    console.error('[Twilio] Client not initialized – cannot send SMS.');
    return;
  }
  try {
    await client.messages.create({
      body,
      from: fromNumber,
      to,
    });
    console.log(`[Twilio] SMS sent to ${to}`);
  } catch (err) {
    console.error('[Twilio] Failed to send SMS:', err.message);
  }
}

module.exports = { sendSms };
