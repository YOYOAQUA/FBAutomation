# FB Automation - Messenger + Comment-to-DM (ManyChat style)

Local Node.js bot for a Facebook Page:
- **Comment-to-DM** - comment with a keyword -> public reply "שולח לך" + private DM with your link
- **AI chatbot** - incoming Messenger DMs answered by OpenAI `gpt-4o-mini`

## Setup (MacBook)
1. `npm install`
2. `cp .env.example .env` and fill in `PAGE_ACCESS_TOKEN`, `VERIFY_TOKEN`, `OPENAI_API_KEY` (+ optional `APP_SECRET`)
3. Edit keywords / link / texts in `config.js`
4. `npm start` (or `npm run dev` for auto-reload)
5. Expose the server: `ngrok http 3000`
6. Meta Developers -> your App -> Webhooks (Page):
   - Callback URL: `https://<ngrok-id>.ngrok-free.app/webhook`
   - Verify token: same as `VERIFY_TOKEN`
   - Subscribe to fields: `messages`, `feed`

Required page permissions: `pages_messaging`, `pages_manage_engagement`, `pages_read_engagement`, `pages_manage_metadata`.

## Files
- `server.js` - Express server, `GET/POST /webhook`, event routing
- `facebookApi.js` - all Graph API calls (comment reply, private reply, send message)
- `aiService.js` - OpenAI integration
- `config.js` - keywords, texts, link, system prompt
