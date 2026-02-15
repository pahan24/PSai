require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support large payloads (images)
app.use(express.static(path.join(__dirname, '/'))); // Serve static files from current root

// API Proxy Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
        }

        const { model, contents, generationConfig, systemInstruction } = req.body;

        // Default to flash if not specified
        const modelName = model || 'gemini-1.5-flash';

        // Construct upstream URL
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}`;

        // Prepare payload
        const payload = {
            contents,
            generationConfig,
            systemInstruction
        };

        // Call Gemini API
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error:', response.status, errorText);
            return res.status(response.status).json({ error: `Gemini API Error: ${response.statusText}`, details: errorText });
        }

        // Handle Streaming Response
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Pipe the stream directly to the client
        response.body.pipe(res);

    } catch (error) {
        console.error('Server Error:', error);
        // If headers meant for streaming were already sent, this might fail, but good practice to try
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error', details: error.message });
        }
    }
});

// Serve frontend for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`  PS AI Server running on port ${PORT}`);
    console.log(`  http://localhost:${PORT}`);
    console.log(`=========================================`);
});
