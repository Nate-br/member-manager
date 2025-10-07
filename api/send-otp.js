// /api/send-otp.js
require('dotenv').config(); // Load environment variables
const twilio = require('twilio');

// Twilio configuration
const accountSid = process.env.ACeade126fa4ba8222b4d16ae51877253d;
const authToken = process.env.e52e7e294f239b496d215fde0bed96f8;
const twilioPhoneNumber = process.env.+19783547381;

// Initialize Twilio client
const client = twilio(accountSid, authToken);

// User database (replace with real database)
const users = [
  {
    name: "John Doe",
    phone: "+251911330471"
    // No chatId needed anymore!
  },
  // Add more users as needed
];

// In-memory storage (use Redis/database in production)
let storedOtps = new Map(); // Store multiple OTPs
let otpExpiries = new Map(); // Store expiries for each phone

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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

      // Check if user exists
      const user = users.find(u => u.phone === phone);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "Phone number not registered" 
        });
      }

      // Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration (5 minutes)
      const expiryTime = Date.now() + (5 * 60 * 1000);
      
      // Store OTP and expiry
      storedOtps.set(phone, generatedOtp);
      otpExpiries.set(phone, expiryTime);

      console.log(`Generated OTP ${generatedOtp} for ${phone}`);

      // Send OTP via SMS
      try {
        const message = await client.messages.create({
          body: `🔐 Your verification code is: ${generatedOtp}\n\nValid for 5 minutes. Do not share this code with anyone.`,
          from: twilioPhoneNumber,
          to: phone
        });

        console.log(`SMS sent successfully. SID: ${message.sid}`);
        
        return res.status(200).json({ 
          success: true, 
          message: "OTP sent successfully! Check your SMS messages.",
          // Don't expose the actual OTP for security
        });
        
      } catch (smsError) {
        console.error('Twilio SMS Error:', {
          message: smsError.message,
          code: smsError.code,
          status: smsError.status,
          phone: phone
        });

        // Clean up on failure
        storedOtps.delete(phone);
        otpExpiries.delete(phone);

        let errorMessage = "Failed to send OTP via SMS";
        
        if (smsError.code === 21211) {
          errorMessage = "Invalid phone number format";
        } else if (smsError.code === 21606) {
          errorMessage = "Cannot send SMS to this number (unverified during trial)";
        } else if (smsError.code === 20003) {
          errorMessage = "Invalid Twilio credentials";
        }

        return res.status(500).json({ 
          success: false, 
          message: errorMessage
        });
      }
    }

    if (action === 'verify') {
      // Validate input
      if (!otp || !phone) {
        return res.status(400).json({ success: false, message: "Phone and OTP are required" });
      }

      // Get stored OTP
      const storedOtp = storedOtps.get(phone);
      const expiryTime = otpExpiries.get(phone);

      // Check if OTP exists
      if (!storedOtp || !expiryTime) {
        return res.status(400).json({ success: false, message: "No OTP request found. Please request OTP first." });
      }

      // Check if OTP is expired
      if (Date.now() > expiryTime) {
        // Clean up expired OTP
        storedOtps.delete(phone);
        otpExpiries.delete(phone);
        return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
      }

      // Verify OTP
      if (otp === storedOtp) {
        // Clear OTP after successful verification
        storedOtps.delete(phone);
        otpExpiries.delete(phone);
        
        const user = users.find(u => u.phone === phone);
        
        return res.status(200).json({ 
          success: true, 
          message: "Verification successful!",
          user: {
            name: user.name,
            phone: user.phone
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
