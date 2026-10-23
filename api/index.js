const express = require('express');
const app = express();

app.use(express.json());

const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-Y2IA2NSujH5CBqnh2dzbDSO54gFE02jErqIftT1vROQLQ9TFRhbsl-zKdaYOjb9g/exec";

// Handles MCP initialization and tool requests from Front
app.post('*', async (req, res) => {
  const { method, id, params } = req.body || {};

  // Step A: Respond to MCP protocol handshake / initialization
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

  // Step B: Expose the Google Sheets tool to Front AI
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

  // Step C: Execute tool call by fetching data from Google Apps Script
  if (method === 'tools/call') {
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL);
      const data = await response.json();
      return res.json({
        jsonrpc: "2.0",
        id: id || 1,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(data)
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

  // Fallback response for simple GET/POST validation
  return res.json({ jsonrpc: "2.0", id: id || 1, result: {} });
});

app.get('*', (req, res) => {
  res.json({ status: "MCP Server Running" });
});

module.exports = app;
