// /api/send-otp.js

const TelegramBot = require('node-telegram-bot-api');

// Replace with your Telegram Bot Token
const TELEGRAM_BOT_TOKEN = '8357889193:AAEGYwkzPJx8wbrPDs5QIL9bhHN1v7duuso';
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN);

// Dummy user database (replace with real DB or file)
const users = [
  {
    name: "John Doe",
    phone: "+251911330471",
    chatId: 1773592241 // Replace with your Telegram chat ID
  },
];

let storedOtp = null;
let storedUser = null;

export default async function handler(req, res) {
  const { phone, otp, action } = req.body;

  if (action === 'request-login') {
    const user = users.find(u => u.phone === phone);
    if (!user || !user.chatId) {
      return res.status(404).json({ success: false, message: "Phone not found or no chat ID" });
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    storedOtp = generatedOtp;
    storedUser = user;

    try {
      await bot.sendMessage(user.chatId, `Your verification code is: ${generatedOtp}`);
      return res.status(200).json({ success: true, user, otp: generatedOtp });
    } catch (err) {
      console.error("Telegram send error:", err);
      return res.status(500).json({ success: false, message: "Failed to send OTP" });
    }
  }

  if (action === 'verify') {
    if (otp === storedOtp && storedUser) {
      return res.status(200).json({ success: true, user: storedUser });
    } else {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  }

  return res.status(400).json({ success: false, message: "Invalid action" });
}
