const express = require('express');
const app = express();

app.use(express.json());

// YOUR GOOGLE APPS SCRIPT WEB APP URL
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_-Y2IA2NSujH5CBqnh2dzbDSO54gFE02jErqlfT1vROQLQ9TFRHbsl-zKdaYOjb9g/exec";

// Handle GET requests immediately so Front never times out
app.get('/mcp', (req, res) => {
  return res.status(200).json({ status: "ok", message: "MCP server active" });
});

// Handle MCP JSON-RPC protocol requests
app.post('/mcp', async (req, res) => {
  const { method, id } = req.body || {};

  // Handshake initialization
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

  // Provide tool list to Front
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: "2.0",
      id: id || 1,
      result: {
        tools: [
          {
            name: "get_sheet_data",
            description: "Fetches pricing and rates data from Google Sheets",
            inputSchema: { type: "object", properties: {} }
          }
        ]
      }
    });
  }

  // Execute tool call and return Google Sheets data
  if (method === 'tools/call') {
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { redirect: 'follow' });
      const data = await response.json();
      return res.json({
        jsonrpc: "2.0",
        id: id || 1,
        result: {
          content: [
            {
              type: "text",
              text: typeof data === 'string' ? data : JSON.stringify(data)
            }
          ]
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

  return res.json({ jsonrpc: "2.0", id: id || 1, result: {} });
});

app.all('*', (req, res) => {
  res.status(200).send("MCP Proxy Running");
});

module.exports = app;
