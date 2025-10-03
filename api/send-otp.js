// File: netlify/functions/send-otp.js

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { chatId, otp } = JSON.parse(event.body);
        const botToken = process.env.TELEGRAM_BOT_TOKEN; // Securely get token from environment variables

        if (!chatId || !otp || !botToken) {
            return { statusCode: 400, body: 'Missing required parameters.' };
        }
        
        const message = `Your Vision for a Better Life verification code is: ${otp}`;
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;

        const response = await fetch(telegramUrl);
        const data = await response.json();

        if (!data.ok) {
            // Telegram API returned an error
            throw new Error(data.description);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'OTP sent successfully!' })
        };

    } catch (error) {
        console.error('Error sending OTP:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to send OTP.' })
        };
    }
};
