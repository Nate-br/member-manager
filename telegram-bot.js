// telegram-bot.js
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot('YOUR_TELEGRAM_BOT_TOKEN', { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  console.log("New user chat ID:", chatId);
  bot.sendMessage(chatId, "Welcome! Please enter your phone number to log in.");
});
