// Import the OpenAI library
const openai = require('openai');

exports.handler = async function(context, event, callback) {
    // Initialize OpenAI with your API key
    openai.apiKey = context.OPENAI_API_KEY;

    // Set up the Twilio VoiceResponse object to generate the TwiML
    const twiml = new Twilio.twiml.VoiceResponse();

    // Initiate the Twilio Response object to handle updating the cookie with the chat history
    const response = new Twilio.Response();

    // Parse the cookie value if it exists
    const cookieValue = event.request.cookies.convo;
    const cookieData = cookieValue ? JSON.parse(decodeURIComponent(cookieValue)) : null;

    // Get the user's voice input from the event
    let voiceInput = event.SpeechResult;

    // Create a conversation object to store the dialog and the user's input to the conversation history
    const conversation = cookieData?.conversation || [];
    conversation.push({ role: 'user', content: voiceInput });

    // Get the AI's response based on the conversation history
    const aiResponseText = await createChatCompletion(conversation);

    // Add the AI's response to the conversation history
    conversation.push({ role: 'assistant', content: aiResponseText });

    // Limit the conversation history to the last 20 messages
    while (conversation.length > 20) {
        conversation.shift();
    }

    // Generate TTS audio using OpenAI's TTS API
    const aiResponseAudioUrl = await generateTTS(aiResponseText);

    // Play the generated audio response
    twiml.play(aiResponseAudioUrl);

    // Redirect to the Function where the <Gather> is capturing the caller's speech
    twiml.redirect({
        method: "POST",
    }, `/transcribe`);

    // Set the response content type to XML (TwiML)
    response.appendHeader("Content-Type", "application/xml");
    response.setBody(twiml.toString());

    // Update the conversation history cookie with the response from the OpenAI API
    const newCookieValue = encodeURIComponent(JSON.stringify({ conversation }));
    response.setCookie('convo', newCookieValue, ['Path=/']);

    // Return the response to the handler
    return callback(null, response);

    // Function to create a chat completion using the OpenAI API
    async function createChatCompletion(messages) {
        try {
            const systemMessages = [
                {
                    role: "system",
                    content: 'You are a creative, funny, friendly, and amusing AI assistant named Joanna. Please provide engaging but concise responses.',
                },
            ];
            messages = systemMessages.concat(messages);

            const chatCompletion = await openai.chat.completions.create({
                messages: messages,
                model: 'gpt-4',
                temperature: 0.8,
                max_tokens: 100,
                top_p: 0.9,
                n: 1,
            });

            return chatCompletion.choices[0].message.content;
        } catch (error) {
            console.error("Error during OpenAI API request:", error);
            throw error;
        }
    }

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
};

