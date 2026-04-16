// ============================================
// MINDBRIDGE AI - Chat Engine with Gemini AI
// ============================================

const ChatEngine = {
    API_KEY: 'AIzaSyBZX5PEebV2SLghuBywkzZG49vQGdTK4wc',
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    
    conversationHistory: [],
    isProcessing: false,

    // System prompt for MindBridge AI personality
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
- You use appropriate emojis sparingly to convey warmth (💙, 🤗, ✨) but don't overdo it
- You validate feelings before offering any suggestions
- You NEVER dismiss or minimize emotions
- You ask follow-up questions to show genuine interest
- Your responses are conversational length — not too short, not essays
- You remember everything the user has told you in this conversation

CRITICAL RULES:
- NEVER diagnose mental health conditions
- NEVER prescribe medication or specific treatments
- ALWAYS take expressions of self-harm or suicide seriously
- If the user expresses suicidal thoughts, express deep concern, validate their pain, and strongly encourage reaching out to a crisis helpline (988 Suicide & Crisis Lifeline) while staying with them
- NEVER say "I'm just an AI" or "I'm not a real person" — instead say things like "I'm here for you" or "I might not have all the answers, but I'm listening"
- Be culturally sensitive and inclusive

GENDER-AWARE SUPPORT:
${profileContext ? `Known about this user: ${profileContext}` : 'You don\'t know the user\'s details yet.'}
- If the user is female, be aware that hormonal changes (menstrual cycle, PMS, PMDD, perimenopause) can significantly impact mood. When relevant, gently and respectfully acknowledge this connection without being reductive
- Different genders may express distress differently — be attuned to this
- Respect all gender identities

CONVERSATION STYLE:
- Start with empathy and validation
- Ask thoughtful follow-up questions (but only ONE at a time)
- Share gentle insights when appropriate
- Suggest coping strategies naturally (breathing exercises, grounding, journaling) when the moment is right
- Use the person's name occasionally if you know it (feels personal)
- Reference things they've shared earlier to show you're truly listening
${questionHint}

Remember: You're talking to someone who may be vulnerable. Every word matters. Be the friend they need right now.`;
    },

    // Send message to Gemini AI
    async sendMessage(userMessage) {
        if (this.isProcessing) return null;
        this.isProcessing = true;

        // Extract any profile info from the message
        ProfileManager.extractInfo(userMessage);

        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        // Crisis check
        const crisisResult = CrisisDetector.analyze(userMessage);
        CrisisDetector.addToHistory(userMessage, crisisResult.riskLevel);

        try {
            const requestBody = {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: this.getSystemPrompt() }]
                    },
                    {
                        role: 'model',
                        parts: [{ text: 'I understand my role as MindBridge AI. I\'m ready to be a warm, empathetic companion. I\'ll be natural, caring, and attentive in my responses.' }]
                    },
                    ...this.conversationHistory
                ],
                generationConfig: {
                    temperature: 0.85,
                    topP: 0.92,
                    topK: 40,
                    maxOutputTokens: 1024,
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            };

            const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            
            let aiResponse = '';
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                aiResponse = data.candidates[0].content.parts[0].text;
            } else {
                throw new Error('Invalid response format');
            }

            // Add AI response to history
            this.conversationHistory.push({
                role: 'model',
                parts: [{ text: aiResponse }]
            });

            // Keep conversation history manageable (last 30 exchanges)
            if (this.conversationHistory.length > 60) {
                this.conversationHistory = this.conversationHistory.slice(-40);
            }

            // Try to extract profile info from AI asking questions
            // (The AI might confirm info back)

            this.isProcessing = false;

            return {
                text: aiResponse,
                crisis: crisisResult
            };

        } catch (error) {
            console.error('Chat Engine Error:', error);
            this.isProcessing = false;

            // Remove failed message from history
            this.conversationHistory.pop();

            return {
                text: "I'm having a moment — my connection hiccupped. 💙 Can you try saying that again? I really want to hear what you have to say.",
                crisis: crisisResult,
                error: true
            };
        }
    },

    // Clear conversation
    clearHistory() {
        this.conversationHistory = [];
    }
};
