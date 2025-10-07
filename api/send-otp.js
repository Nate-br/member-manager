// /api/send-otp.js
require('dotenv').config();
const twilio = require('twilio');

// Twilio configuration with validation
const accountSid = process.env.ACeade126fa4ba8222b4d16ae51877253d;
const authToken = process.env.e52e7e294f239b496d215fde0bed96f8;
const twilioPhoneNumber = process.env.+19783547381;

// Validate environment variables
if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error('Missing Twilio environment variables');
  console.error('TWILIO_ACCOUNT_SID:', !!accountSid);
  console.error('TWILIO_AUTH_TOKEN:', !!authToken);
  console.error('TWILIO_PHONE_NUMBER:', !!twilioPhoneNumber);
}

const client = twilio(accountSid, authToken);

// User database
const users = [
  {
    name: "Nate",
    phone: "+251911330471"
  },
];

// In-memory storage
let storedOtps = new Map();
let otpExpiries = new Map();

export default async function handler(req, res) {
  // Enable CORS for all origins (adjust for production)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('API Request received:', req.method, req.body);

  try {
    if (req.method === 'POST') {
      const { phone, otp, action } = req.body;

      if (action === 'request-login') {
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

        // Generate OTP
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiryTime = Date.now() + (5 * 60 * 1000);

        storedOtps.set(phone, generatedOtp);
        otpExpiries.set(phone, expiryTime);

        console.log(`Generated OTP ${generatedOtp} for ${phone}`);

        // Send SMS via Twilio
        try {
          console.log('Attempting to send SMS with credentials:');
          console.log('Account SID exists:', !!accountSid);
          console.log('Auth Token exists:', !!authToken);
          console.log('From number:', twilioPhoneNumber);
          console.log('To number:', phone);

          const message = await client.messages.create({
            body: `🔐 Your verification code is: ${generatedOtp}\n\nValid for 5 minutes.`,
            from: twilioPhoneNumber,
            to: phone
          });

          console.log(`SMS sent successfully. SID: ${message.sid}`);
          
          return res.status(200).json({ 
            success: true, 
            message: "OTP sent successfully! Check your SMS messages."
          });
          
        } catch (smsError) {
          console.error('Twilio SMS Error:', {
            message: smsError.message,
            code: smsError.code,
            status: smsError.status,
            moreInfo: smsError.moreInfo
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
          } else if (smsError.code === 11200) {
            errorMessage = "HTTP retrieval failure - check your Twilio configuration";
          }

          return res.status(500).json({ 
            success: false, 
            message: errorMessage,
            debug: process.env.NODE_ENV === 'development' ? smsError.message : undefined
          });
        }
      }

      if (action === 'verify') {
        if (!otp || !phone) {
          return res.status(400).json({ success: false, message: "Phone and OTP are required" });
        }

        const storedOtp = storedOtps.get(phone);
        const expiryTime = otpExpiries.get(phone);

        if (!storedOtp || !expiryTime) {
          return res.status(400).json({ success: false, message: "No OTP request found. Please request OTP first." });
        }

        if (Date.now() > expiryTime) {
          storedOtps.delete(phone);
          otpExpiries.delete(phone);
          return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        if (otp === storedOtp) {
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
    } else {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

  } catch (error) {
    console.error("Unexpected error in OTP handler:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error. Please try again later.",
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
