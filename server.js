require('dotenv').config({ quiet: true });

const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');

const fb = require('./facebookApi');
const { getAIReply } = require('./aiService');
const { COMMENT_KEYWORDS, PUBLIC_REPLY_TEXT, PRIVATE_REPLY_TEXT } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// Keep the raw body so we can verify Facebook's signature
app.use(
  bodyParser.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// ---------- Helpers ----------

// Facebook retries webhooks, so remember what we already handled (in-memory, capped)
const processedIds = new Set();
function alreadyProcessed(id) {
  if (!id) return false;
  if (processedIds.has(id)) return true;
  processedIds.add(id);
  if (processedIds.size > 5000) processedIds.delete(processedIds.values().next().value);
  return false;
}

function isValidSignature(req) {
  const appSecret = process.env.APP_SECRET;
  if (!appSecret) return true; // Optional - skip check if no secret configured

  const signature = req.get('x-hub-signature-256');
  if (!signature || !req.rawBody) return false;

  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function containsKeyword(text) {
  const lower = (text || '').toLowerCase();
  return COMMENT_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

// ---------- Event handlers ----------

// Comment-to-DM: keyword in comment -> public reply + private DM
async function handleFeedChange(pageId, value) {
  if (value.item !== 'comment' || value.verb !== 'add') return;

  const { comment_id: commentId, message, from } = value;

  // Ignore the page's own comments (prevents replying to our own "שולח לך")
  if (from?.id === pageId) return;
  if (alreadyProcessed(commentId)) return;

  console.log(`💬 Comment from ${from?.name || from?.id}: "${message}"`);

  if (!containsKeyword(message)) return;

  console.log('🎯 Keyword matched - running Comment-to-DM');
  await fb.replyToComment(commentId, PUBLIC_REPLY_TEXT);
  await fb.sendPrivateReply(commentId, PRIVATE_REPLY_TEXT);
}

// AI chatbot: incoming DM -> OpenAI -> reply in Messenger
async function handleMessagingEvent(event) {
  const message = event.message;
  if (!message || message.is_echo) return; // Skip delivery/read receipts and our own echoes
  if (alreadyProcessed(message.mid)) return;

  const senderId = event.sender?.id;
  const text = message.text;

  if (!text) {
    console.log(`📎 Non-text message from ${senderId} - skipping`);
    return;
  }

  console.log(`📩 DM from ${senderId}: "${text}"`);
  await fb.sendTypingOn(senderId);
  const reply = await getAIReply(text);
  await fb.sendMessage(senderId, reply);
}

// ---------- Routes ----------

// Webhook verification (Facebook "challenge")
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === process.env.VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    return res.status(200).send(challenge);
  }
  console.warn('⛔ Webhook verification failed');
  return res.sendStatus(403);
});

// Incoming events
app.post('/webhook', (req, res) => {
  if (!isValidSignature(req)) {
    console.warn('⛔ Invalid webhook signature');
    return res.sendStatus(403);
  }

  const body = req.body;
  if (body?.object !== 'page') return res.sendStatus(404);

  // Answer Facebook right away (it expects 200 within a few seconds), then process
  res.status(200).send('EVENT_RECEIVED');

  for (const entry of body.entry || []) {
    const pageId = entry.id;

    // Messenger DMs
    for (const event of entry.messaging || []) {
      handleMessagingEvent(event).catch((err) => console.error('❌ Messaging handler error:', err.message));
    }

    // Page feed changes (comments on posts / reels)
    for (const change of entry.changes || []) {
      if (change.field !== 'feed') continue;
      handleFeedChange(pageId, change.value || {}).catch((err) =>
        console.error('❌ Feed handler error:', err.message)
      );
    }
  }
});

app.get('/', (_req, res) => res.send('FB Automation is running 🚀'));

// Last line of defense - log errors instead of crashing
app.use((err, _req, res, _next) => {
  console.error('❌ Express error:', err.message);
  res.sendStatus(err.status || 500);
});

process.on('unhandledRejection', (err) => console.error('❌ Unhandled rejection:', err));
process.on('uncaughtException', (err) => console.error('❌ Uncaught exception:', err));

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  ['PAGE_ACCESS_TOKEN', 'VERIFY_TOKEN', 'OPENAI_API_KEY'].forEach((key) => {
    if (!process.env[key]) console.warn(`⚠️  Missing ${key} in .env`);
  });
});
