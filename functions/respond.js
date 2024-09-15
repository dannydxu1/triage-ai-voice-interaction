// Import necessary modules
const { OpenAI } = require("openai");
const axios = require('axios'); // For making HTTP requests to the TTS service
const fs = require('fs');       // For file system operations, if needed
const path = require('path');

exports.handler = async function(context, event, callback) {
  // Set up the OpenAI API
  const openai = new OpenAI({
    apiKey: context.OPENAI_API_KEY,
  });

  // Set up the Twilio VoiceResponse object
  const twiml = new Twilio.twiml.VoiceResponse();

  // Initiate the Twilio Response object
  const response = new Twilio.Response();

  // Parse the conversation history from cookies
  const cookieValue = event.request.cookies.convo;
  const cookieData = cookieValue ? JSON.parse(decodeURIComponent(cookieValue)) : null;

  // Get the user's voice input
  let voiceInput = event.SpeechResult;

  // Update the conversation history
  const conversation = cookieData?.conversation || [];
  conversation.push({role: 'user', content: voiceInput});

  // Get the AI's response
  const aiResponseText = await createChatCompletion(conversation);

  // Add the AI's response to the conversation history
  conversation.push({role: 'system', content: aiResponseText});

  // Limit the conversation history
  while (conversation.length > 20) {
    conversation.shift();
  }

  // Generate TTS audio using an external service
  const audioUrl = await generateTTS(aiResponseText);

  // Play the audio response
  twiml.play(audioUrl);

  // Redirect back to the conversation handler
  twiml.redirect({
    method: "POST",
  }, `/transcribe`);

  // Set up the response
  response.appendHeader("Content-Type", "application/xml");
  response.setBody(twiml.toString());

  // Update the conversation history cookie
  const newCookieValue = encodeURIComponent(JSON.stringify({ conversation }));
  response.setCookie('convo', newCookieValue, ['Path=/']);

  // Return the response
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

  // Function to generate TTS audio using an external service
  async function generateTTS(text) {
    try {
      // Replace this with your chosen TTS service API call
      const ttsResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
      });

      // The TTS service should return a URL to the generated audio file
      return ttsResponse.data.audioUrl;
    } catch (error) {
      console.error("Error during TTS generation:", error);
      throw error;
    }
  }
};

