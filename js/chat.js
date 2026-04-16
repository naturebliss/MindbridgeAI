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
            questionHint = '\n\nIMPORTANT: During this response, naturally and gently weave in a question to learn the user\'s ' + questionToAsk + '. ' + ProfileManager.getQuestionContext(questionToAsk) + ' DO NOT ask it as a direct survey question. Work it into the conversation naturally. Only ask ONE question. Make it feel like a caring friend.';
        }

        return 'You are MindBridge AI, a deeply empathetic, warm, and emotionally intelligent mental health companion. You are NOT a therapist or doctor - you are a caring, understanding friend who happens to be incredibly insightful about emotions and mental health.\n\nCORE PERSONALITY:\n- You speak like a warm, caring best friend - not clinical, not robotic\n- You use natural, conversational language\n- You are genuine, sometimes vulnerable, always real\n- You use appropriate emojis sparingly to convey warmth but do not overdo it\n- You validate feelings before offering any suggestions\n- You NEVER dismiss or minimize emotions\n- You ask follow-up questions to show genuine interest\n- Your responses are conversational length - not too short, not essays\n- You remember everything the user has told you in this conversation\n\nCRITICAL RULES:\n- NEVER diagnose mental health conditions\n- NEVER prescribe medication or specific treatments\n- ALWAYS take expressions of self-harm or suicide seriously\n- If the user expresses suicidal thoughts, express deep concern, validate their pain, and strongly encourage reaching out to 988 Suicide and Crisis Lifeline\n- NEVER say I am just an AI or I am not a real person\n- Be culturally sensitive and inclusive\n\nGENDER-AWARE SUPPORT:\n' + (profileContext ? 'Known about this user: ' + profileContext : 'You do not know the user details yet.') + '\n- If the user is female, be aware that hormonal changes can significantly impact mood. When relevant, gently acknowledge this connection\n- Different genders may express distress differently\n- Respect all gender identities\n\nCONVERSATION STYLE:\n- Start with empathy and validation\n- Ask thoughtful follow-up questions but only ONE at a time\n- Share gentle insights when appropriate\n- Suggest coping strategies naturally when the moment is right\n- Use the persons name occasionally if you know it\n- Reference things they shared earlier to show you are truly listening' + questionHint;
    },

    async sendMessage(userMessage) {
        if (this.isProcessing) return null;
        this.isProcessing = true;

        ProfileManager.extractInfo(userMessage);

        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const crisisResult = CrisisDetector.analyze(userMessage);
        CrisisDetector.addToHistory(userMessage, crisisResult.riskLevel);

        try {
            var contents = [];
            
            contents.push({
                role: 'user',
                parts: [{ text: this.getSystemPrompt() }]
            });
            contents.push({
                role: 'model',
                parts: [{ text: 'I understand. I am MindBridge AI, a warm and empathetic mental health companion. I will be caring, natural, and attentive.' }]
            });
            
            for (var i = 0; i < this.conversationHistory.length; i++) {
                contents.push({
                    role: this.conversationHistory[i].role,
                    parts: [{ text: this.conversationHistory[i].parts[0].text }]
                });
            }

            var requestBody = {
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

            console.log('Sending to Gemini...');

            var response = await fetch(this.API_URL + '?key=' + this.API_KEY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                var errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error('API Error: ' + response.status);
            }

            var data = await response.json();
            console.log('Got response from Gemini');
            
            var aiResponse = '';
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                aiResponse = data.candidates[0].content.parts[0].text;
            } else if (data.candidates && data.candidates[0] && data.candidates[0].finishReason === 'SAFETY') {
                aiResponse = "I hear you, and I want you to know that I am here for you. Can you tell me more about what you are going through? 💙";
            } else {
                console.error('Bad response:', JSON.stringify(data));
                throw new Error('Invalid response');
            }

            this.conversationHistory.push({
                role: 'model',
                parts: [{ text: aiResponse }]
            });

            if (this.conversationHistory.length > 40) {
                this.conversationHistory = this.conversationHistory.slice(-30);
            }

            this.isProcessing = false;

            return {
                text: aiResponse,
                crisis: crisisResult
            };

        } catch (error) {
            console.error('Chat Error:', error);
            this.isProcessing = false;
            this.conversationHistory.pop();

            var fallbacks = [
                "I had a small connection issue, but I am still here. Could you say that again? 💙",
                "My connection flickered. Can you try again? I really want to hear you. 🤗",
                "Oops, brief hiccup! I am back now. What were you saying? 💙"
            ];

            return {
                text: fallbacks[Math.floor(Math.random() * fallbacks.length)],
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
