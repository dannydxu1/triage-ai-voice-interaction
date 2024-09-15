// Import the OpenAI library at the top of your file
const openai = require('openai');

exports.handler = async function(context, event, callback) {
    // Initialize OpenAI with your API key
    openai.apiKey = context.OPENAI_API_KEY; // Ensure your API key is stored securely

    // Create a TwiML Voice Response object to build the response
    const twiml = new Twilio.twiml.VoiceResponse();

    // If no previous conversation is present, or if the conversation is empty, start the conversation
    if (!event.request.cookies.convo) {
        // Greet the user with a message using OpenAI's TTS service
        const audioUrl = await generateTTS("Hey! I'm Joanna 2.0 from Triage AI. How can I help you?");
        twiml.play(audioUrl);
    }

    // Listen to the user's speech and pass the input to the /respond Function
    twiml.gather({
        speechTimeout: 'auto', // Automatically determine the end of user speech
        speechModel: 'experimental_conversations', // Use the conversation-based speech recognition model
        input: 'speech', // Specify speech as the input type
        action: '/respond', // Send the collected input to /respond 
    });

    // Create a Twilio Response object
    const response = new Twilio.Response();

    // Set the response content type to XML (TwiML)
    response.appendHeader('Content-Type', 'application/xml');

    // Set the response body to the generated TwiML
    response.setBody(twiml.toString());

    // If no conversation cookie is present, set an empty conversation cookie
    if (!event.request.cookies.convo) {
        response.setCookie('convo', '', ['Path=/']); 
    }

    // Return the response to Twilio
    return callback(null, response);
};

// Function to generate TTS audio using OpenAI's TTS API
async function generateTTS(text) {
    try {
        const ttsResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });

        // The TTS service should return a URL to the generated audio file
        return ttsResponse.audio_url; // Adjusted to match likely response structure
    } catch (error) {
        console.error("Error during TTS generation:", error);
        throw error;
    }
}

