JavaScript
const express = require('express');
const app = express();

app.use(express.json());

// REPLACE THIS WITH YOUR GOOGLE APPS SCRIPT WEB APP URL
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-Y2IA2NSujH5CBqnh2dzbDSO54gFE02jErqIftT1vROQLQ9TFRhbsl-zKdaYOjb9g/exec";

// Endpoint Front AI expects
app.all('/mcp', async (req, res) => {
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: req.method === 'GET' ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    
    // Returns MCP-compliant JSON envelope back to Front
    return res.status(200).json({
      protocol: "mcp",
      status: "ok",
      data: data
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = app;
