export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { messages, systemPrompt } = req.body;

        const claudePromise = fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': process.env.ANTHROPIC_API_KEY
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                messages: messages,
                system: systemPrompt,
                max_tokens: 1024
            })
        });

        const claudeResponse = await Promise.race([
            claudePromise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Claude API timeout')), 45000)
            )
        ]);

        if (!claudeResponse.ok) {
            throw new Error(await claudeResponse.text());
        }

        const claudeData = await claudeResponse.json();
        const fullText = claudeData.content[0].text;

        // Generate voice
        try {
            const voicePromise = fetch('https://api.elevenlabs.io/v1/text-to-speech/BL7YSL1bAkmW8U0JnU8o', {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY
                },
                body: JSON.stringify({
                    text: fullText,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            });

            const voiceResponse = await Promise.race([
                voicePromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('ElevenLabs API timeout')), 15000)
                )
            ]);

            if (voiceResponse.ok) {
                const audioBuffer = await voiceResponse.arrayBuffer();
                const audioBase64 = Buffer.from(audioBuffer).toString('base64');

                return res.status(200).json({
                    ...claudeData,
                    audio: audioBase64
                });
            }
        } catch (voiceError) {
            console.error('Voice generation error:', voiceError);
        }

        return res.status(200).json(claudeData);
    } catch (error) {
        console.error('Server error:', error);
        res.status(error.message.includes('timeout') ? 504 : 500).json({
            error: error.message,
            type: error.message.includes('timeout') ? 'timeout' : 'server_error'
        });
    }
}
