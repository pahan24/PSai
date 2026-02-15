# Deploying PS AI (Secure Full-Stack)

This is a production-ready web application with a Node.js/Express backend to securely handle API keys.

## Prerequisites
-   [Node.js](https://nodejs.org/) installed (v16+).
-   A [Google Gemini API Key](https://aistudio.google.com/app/apikey).

## Installation

1.  **Install Dependencies**:
    Open a terminal in the project folder and run:
    ```bash
    npm install
    ```

2.  **Configure Environment**:
    -   Create a file named `.env` in the root directory.
    -   Add your API Key:
        ```env
        GEMINI_API_KEY=your_actual_api_key_here
        PORT=3000
        ```

## Running the App

### Development (Auto-restart on change)
```bash
npm run dev
```

### Production
```bash
npm start
```

Access the app at: `http://localhost:3000`

## Production Deployment (e.g., Render, Vercel, Railway)
1.  Upload the entire project folder.
2.  Set the `GEMINI_API_KEY` in the hosting provider's Environment Variables settings.
3.  The request limit for the body is set to 10MB to support image uploads.
