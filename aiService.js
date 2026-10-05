// OpenAI chat completion for incoming Messenger DMs.
const OpenAI = require('openai');
const { OPENAI_MODEL, SYSTEM_PROMPT, AI_FALLBACK_TEXT } = require('./config');

let client = null;

function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

async function getAIReply(userText) {
  try {
    const completion = await getClient().chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userText },
      ],
      max_tokens: 300,
    });
    return completion.choices[0]?.message?.content?.trim() || AI_FALLBACK_TEXT;
  } catch (err) {
    console.error(`❌ OpenAI request failed: ${err.message}`);
    return AI_FALLBACK_TEXT;
  }
}

module.exports = { getAIReply };
