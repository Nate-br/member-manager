// This is the correct Vercel-compatible version of the function.
export default async function handler(request, response) {
    // Only allow POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // Vercel automatically parses the JSON body from the request
        const { chatId, otp } = request.body;
        const botToken = process.env.8357889193:AAHsYYveSew5tqN9k_-N2nkGeEDPx-0m7Cw; // Get the secret token

        // Check if all required data is present
        if (!chatId || !otp || !botToken) {
            console.error("Missing required parameters:", { chatId: !!chatId, otp: !!otp, botToken: !!botToken });
            return response.status(400).json({ error: 'Missing required parameters.' });
        }
        
        const message = `Your Vision for a Better Life verification code is: ${otp}`;
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;

        // Use fetch to send the message to Telegram's API
        const telegramResponse = await fetch(telegramUrl);
        const data = await telegramResponse.json();

        // If Telegram's API returns an error (e.g., "chat not found")
        if (!data.ok) {
            console.error("Telegram API Error:", data.description);
            throw new Error(data.description);
        }

        // Send a success response back to the front-end (your index.html)
        return response.status(200).json({ message: 'OTP sent successfully!' });

    } catch (error) {
        // If anything in the 'try' block fails, this will run
        console.error('Overall Error in send-otp function:', error);
        return response.status(500).json({ error: 'Failed to send OTP.' });
    }
}
