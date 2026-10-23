const express = require('express');
const app = express();

app.use(express.json());

const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-Y2IA2NSujH5CBqnh2dzbDSO54gFE02jErqIftT1vROQLQ9TFRhbsl-zKdaYOjb9g/exec";

app.post('*', async (req, res) => {
  const { method, id } = req.body || {};

  // Immediately handle notification/handshake without delay
  if (!method || method.startsWith('notifications/')) {
    return res.status(200).json({ jsonrpc: "2.0" });
  }

  // MCP Initial Handshake
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

  // Provide tool definitions instantly so Front doesn't time out
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: "2.0",
      id: id || 1,
      result: {
        tools: [
          {
            name: "get_sheet_data",
            description: "Fetches pricing and rates data from Google Sheets",
            inputSchema: {
              type: "object",
              properties: {}
            }
          }
        ]
      }
    });
  }

  // Only fetch Google Apps Script data when the tool is explicitly called
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

app.get('*', (req, res) => {
  res.status(200).send("MCP Server Active");
});

module.exports = app;
