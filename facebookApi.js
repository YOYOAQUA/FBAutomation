// All calls to the Facebook Graph API live here.
const axios = require('axios');

const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || 'v24.0';

const graph = axios.create({
  baseURL: `https://graph.facebook.com/${GRAPH_API_VERSION}`,
  timeout: 10000,
});

// Attach the page token to every request (read at call time so .env changes apply after restart)
graph.interceptors.request.use((config) => {
  config.params = { ...config.params, access_token: process.env.PAGE_ACCESS_TOKEN };
  return config;
});

function describeError(err) {
  const fbError = err.response?.data?.error;
  return fbError ? `${fbError.message} (code ${fbError.code})` : err.message;
}

// Public reply under a comment on a post / reel
async function replyToComment(commentId, text) {
  try {
    const { data } = await graph.post(`/${commentId}/comments`, { message: text });
    console.log(`✅ Public reply posted on comment ${commentId}`);
    return data;
  } catch (err) {
    console.error(`❌ replyToComment(${commentId}) failed: ${describeError(err)}`);
    return null;
  }
}

// Private Reply - a DM to the person who wrote the comment (allowed once per comment, within 7 days)
async function sendPrivateReply(commentId, text) {
  try {
    const { data } = await graph.post('/me/messages', {
      recipient: { comment_id: commentId },
      message: { text },
    });
    console.log(`✅ Private reply sent for comment ${commentId}`);
    return data;
  } catch (err) {
    console.error(`❌ sendPrivateReply(${commentId}) failed: ${describeError(err)}`);
    return null;
  }
}

// Regular Messenger message to a user (PSID) inside the 24h messaging window
async function sendMessage(recipientId, text) {
  try {
    const { data } = await graph.post('/me/messages', {
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text },
    });
    console.log(`✅ Message sent to ${recipientId}`);
    return data;
  } catch (err) {
    console.error(`❌ sendMessage(${recipientId}) failed: ${describeError(err)}`);
    return null;
  }
}

// "typing..." bubble while the AI is thinking
async function sendTypingOn(recipientId) {
  try {
    await graph.post('/me/messages', {
      recipient: { id: recipientId },
      sender_action: 'typing_on',
    });
  } catch (err) {
    console.warn(`⚠️ sendTypingOn(${recipientId}) failed: ${describeError(err)}`);
  }
}

module.exports = { replyToComment, sendPrivateReply, sendMessage, sendTypingOn };
