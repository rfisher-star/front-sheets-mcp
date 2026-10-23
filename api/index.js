const express = require('express');
const app = express();

app.use(express.json());

// REPLACE THIS WITH YOUR LATEST GOOGLE APPS SCRIPT URL
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_-Y2IA2NSujH5CBqnh2dzbDSO54gFE02jErqlfT1vROQLQ9TFRHbsl-zKdaYOjb9g/exec";

// Respond to status checks
app.get('/mcp', (req, res) => {
  res.status(200).json({ status: "MCP proxy ready" });
});

// Front is POSTing directly to /mcp, so we process it here
app.post('/mcp', async (req, res) => {
  const { method, id } = req.body || {};

  // Handshake
  if (method === 'initialize') {
    return res.json({
      jsonrpc: "2.0",
      id: id || 1,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "google-sheets-mcp", version: "1.0.0" }
      }
    });
  }

  // Acknowledge setup
  if (method === 'notifications/initialized') {
    return res.status(200).send();
  }

  // Define the Google Sheets tool
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: "2.0",
      id: id || 1,
      result: {
        tools: [{
          name: "get_sheet_data",
          description: "Fetches pricing and rates data from Google Sheets",
          inputSchema: { type: "object", properties: {} }
        }]
      }
    });
  }

  // Fetch from Google Apps Script
  if (method === 'tools/call') {
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { redirect: 'follow' });
      const data = await response.json();
      return res.json({
        jsonrpc: "2.0",
        id: id || 1,
        result: {
          content: [{ type: "text", text: typeof data === 'string' ? data : JSON.stringify(data) }]
        }
      });
    } catch (err) {
      return res.json({
        jsonrpc: "2.0",
        id: id || 1,
        error: { code: -32603, message: err.message }
      });
    }
  }

  // Fallback response for ping checks
  return res.json({ jsonrpc: "2.0", id: id || 1, result: {} });
});

module.exports = app;
