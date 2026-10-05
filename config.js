// Automation settings - edit these to change the bot's behavior.
module.exports = {
  // A comment that contains ANY of these words (case-insensitive) triggers Comment-to-DM
  COMMENT_KEYWORDS: ['לינק', 'link'],

  // Public reply posted under the user's comment
  PUBLIC_REPLY_TEXT: 'שולח לך',

  // Private message sent to the commenter
  PRIVATE_REPLY_TEXT: 'היי! הנה הלינק שביקשת: https://example.com',

  // AI chatbot
  OPENAI_MODEL: 'gpt-4o-mini',
  SYSTEM_PROMPT: 'You are a helpful assistant for Yoav Yosha. Answer briefly in Hebrew.',
  AI_FALLBACK_TEXT: 'מצטער, משהו השתבש. נסה שוב בעוד רגע 🙏',
};
