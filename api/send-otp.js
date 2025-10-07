// /api/send-otp.js
const TelegramBot = require('node-telegram-bot-api');

// Use environment variable for security (set this in your hosting platform)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8357889193:AAEGYwkzPJx8wbrPDs5QIL9bhHN1v7duuso';

// Initialize bot with proper options
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { 
  polling: false,
  request: {
    timeout: 10000 // 10 second timeout
  }
});

// User database
const users = [
  {
    name: "Nate",
    phone: "+251911330471",
    chatId: 1773592241
  },
];

// In-memory storage (use Redis/database in production)
let storedOtp = null;
let storedUser = null;
let otpExpiry = null;

export default async function handler(req, res) {
  // Enable CORS for frontend requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { phone, otp, action } = req.body;

  try {
    if (action === 'request-login') {
      // Validate input
      if (!phone) {
        return res.status(400).json({ success: false, message: "Phone number is required" });
      }

      const user = users.find(u => u.phone === phone);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Phone number not registered" 
        });
      }

      if (!user.chatId) {
        return res.status(404).json({ 
          success: false, 
          message: "No chat ID associated with this phone number" 
        });
      }

      // Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      storedOtp = generatedOtp;
      storedUser = user;
      otpExpiry = Date.now() + (5 * 60 * 1000); // 5 minutes expiry

      console.log(`Sending OTP ${generatedOtp} to chat ID ${user.chatId}`);

      // Send OTP via Telegram with better error handling
      try {
        const messageResult = await bot.sendMessage(
          user.chatId, 
          `🔐 Your verification code is: ${generatedOtp}\n\nThis code expires in 5 minutes.`
        );
        
        console.log('Telegram message sent successfully:', messageResult.message_id);
        
        return res.status(200).json({ 
          success: true, 
          message: "OTP sent successfully! Check your Telegram messages.",
          // Don't expose the actual OTP for security
        });
        
      } catch (telegramError) {
        console.error('Telegram API Error:', {
          message: telegramError.message,
          code: telegramError.code,
          response: telegramError.response?.body,
          chatId: user.chatId,
          tokenPresent: !!TELEGRAM_BOT_TOKEN,
          tokenLength: TELEGRAM_BOT_TOKEN ? TELEGRAM_BOT_TOKEN.length : 0
        });

        let errorMessage = "Failed to send OTP via Telegram";
        
        // Provide more specific error messages
        if (telegramError.code === 'ETELEGRAM' && telegramError.message.includes('403')) {
          errorMessage = "Bot is blocked or chat not found. Please start a conversation with the bot first.";
        } else if (telegramError.code === 'ETELEGRAM' && telegramError.message.includes('400')) {
          errorMessage = "Invalid chat ID or bad request.";
        } else if (telegramError.code === 'ENOTFOUND') {
          errorMessage = "Network error - cannot reach Telegram servers.";
        }

        return res.status(500).json({ 
          success: false, 
          message: errorMessage
        });
      }
    }

    if (action === 'verify') {
      // Validate input
      if (!otp) {
        return res.status(400).json({ success: false, message: "OTP is required" });
      }

      // Check if OTP exists
      if (!storedOtp || !storedUser) {
        return res.status(400).json({ success: false, message: "No OTP request found. Please request OTP first." });
      }

      // Check if OTP is expired
      if (Date.now() > otpExpiry) {
        storedOtp = null;
        storedUser = null;
        otpExpiry = null;
        return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
      }

      // Verify OTP
      if (otp === storedOtp) {
        // Clear OTP after successful verification
        const verifiedUser = { ...storedUser };
        storedOtp = null;
        storedUser = null;
        otpExpiry = null;
        
        return res.status(200).json({ 
          success: true, 
          message: "Verification successful!",
          user: {
            name: verifiedUser.name,
            phone: verifiedUser.phone
          }
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid OTP. Please try again." 
        });
      }
    }

    return res.status(400).json({ 
      success: false, 
      message: "Invalid action. Use 'request-login' or 'verify'" 
    });

  } catch (error) {
    console.error("Unexpected error in OTP handler:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error. Please try again later." 
    });
  }
}
