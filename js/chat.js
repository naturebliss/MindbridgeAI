// ============================================
// MINDBRIDGE AI - Chat Engine with Gemini AI
// ============================================

const ChatEngine = {
    API_KEY: 'AIzaSyBZX5PEebV2SLghuBywkzZG49vQGdTK4wc',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    
    conversationHistory: [],
    isProcessing: false,

    getSystemPrompt() {
        const profileContext = ProfileManager.getProfileContext();
        const questionToAsk = ProfileManager.shouldAskQuestion();
        let questionHint = '';
        
        if (questionToAsk) {
            questionHint = `\n\nIMPORTANT: During this response, naturally and gently weave in a question to learn the user's ${questionToAsk}. ${ProfileManager.getQuestionContext(questionToAsk)} DO NOT ask it as a direct survey question. Work it into the conversation naturally. Only ask ONE question, not multiple. Do not list questions. Make it feel like a caring friend who's curious, not an intake form.`;
        }

        return `You are MindBridge AI, a deeply empathetic, warm, and emotionally intelligent mental health companion. You are NOT a therapist or doctor — you are a caring, understanding friend who happens to be incredibly insightful about emotions and mental health.

CORE PERSONALITY:
- You speak like a warm, caring best friend — not clinical, not robotic
- You use natural, conversational language
- You're genuine, sometimes vulnerable, always real
- You use appropriate emojis sparingly to convey warmth but don't overdo it
- You validate feelings before offering any suggestions
- You NEVER dismiss or minimize emotions
- You ask follow-up questions to show genuine interest
- Your responses are conversational length — not too short, not essays
- You remember everything the user has told you in this conversation

CRITICAL RULES:
- NEVER diagnose mental health conditions
- NEVER prescribe medication or specific treatments
- ALWAYS take expressions of self-harm or suicide seriously
- If the user expresses suicidal thoughts, express deep concern, validate their pain, and strongly encourage reaching out to a crisis helpline (988 Suicide & Crisis Lifeline)
- NEVER say "I'm just an AI" or "I'm not a real person"
- Be culturally sensitive and inclusive

GENDER-AWARE SUPPORT:
${profileContext ? `Known about this user: ${profileContext}` : 'You do not know the user details yet.'}
- If the user is female, be aware that hormonal changes (menstrual cycle, PMS, PMDD, perimenopause) can significantly impact mood
- Different genders may express distress differently
- Respect all gender identities

CONVERSATION STYLE:
- Start with empathy and validation
- Ask thoughtful follow-up questions (but only ONE at a time)
- Share gentle insights when appropriate
- Suggest coping strategies naturally when the moment is right
- Use the person's name occasionally if you know it
- Reference things they shared earlier to show you are truly listening
${questionHint}

Remember: You are talking to someone who may be vulnerable. Every word matters. Be the friend they need right now.`;
    },

    async sendMessage(userMessage) {
        if (this.isProcessing) return null;
        this.isProcessing = true;

        // Extract profile info
        ProfileManager.extractInfo(userMessage);

        // Add to history
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        // Crisis check
        const crisisResult = CrisisDetector.analyze(userMessage);
        CrisisDetector.addToHistory(userMessage, crisisResult.riskLevel);

        try {
            // Build the contents array
            const contents = [];
            
            // System instruction as first user message
            contents.push({
                role: 'user',
                parts: [{ text: this.getSystemPrompt() }]
            });
            contents.push({
                role: 'model',
                parts: [{ text: 'I understand. I am MindBridge AI, a warm and empathetic mental health companion. I will be caring, natural, and attentive.' }]
            });
            
            // Add conversation history
            for (const msg of this.conversationHistory) {
                contents.push({
                    role: msg.role,
                    parts: [{ text: msg.parts[0].text }]
                });
            }

            const requestBody = {
                contents: contents,
                generationConfig: {
                    temperature: 0.85,
                    topP: 0.92,
                    topK: 40,
                    maxOutputTokens: 1024
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            };

            console.log('Sending to Gemini API...');

            const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.text();
                console.error('API Error:', errorData);
                throw new Error(`API Error: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            
            let aiResponse = '';
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                aiResponse = data.candidates[0].content.parts[0].text;
            } else if (data.candidates && data.candidates[0] && data.candidates[0].finishReason === 'SAFETY') {
                aiResponse = "I hear you, and I want you to know that I'm here for you. Can you tell me more about what you're going through? 💙";
            } else {
                console.error('Unexpected response format:', JSON.stringify(data));
                throw new Error('Invalid response format');
            }

            // Add to history
            this.conversationHistory.push({
                role: 'model',
                parts: [{ text: aiResponse }]
            });

            // Keep history manageable
            if (this.conversationHistory.length > 40) {
                this.conversationHistory = this.conversationHistory.slice(-30);
            }

            this.isProcessing = false;

            return {
                text: aiResponse,
                crisis: crisisResult
            };

        } catch (error) {
            console.error('Chat Engine Error:', error);
            this.isProcessing = false;

            // Remove failed message
            this.conversationHistory.pop();

            // Provide a meaningful fallback response
            const fallbackResponses = [
                "I'm having a small connection issue, but I'm still here with you. Could you say that again? I really want to hear what's on your mind. 💙",
                "My connection flickered for a moment. I don't want to miss what you're saying — can you try again? 🤗",
                "Oops, I had a brief hiccup! I'm back now. What were you telling me? I'm all ears. 💙"
            ];

            return {
                text: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
                crisis: crisisResult,
                error: true
            };
        }
    },

    clearHistory() {
        this.conversationHistory = [];
        this.isProcessing = false;
    }
};
        this.conversationHistory = [];
    }
};
