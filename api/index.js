const express = require('express');
const app = express();

app.use(express.json());

// REPLACE WITH YOUR NEW GOOGLE APPS SCRIPT URL
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_-Y2IA2NSujH5CBqnh2dzbDSO54gFE02jErqlfT1vROQLQ9TFRHbsl-zKdaYOjb9g/exec";

// 1. SSE Endpoint: Front connects here first via GET to open the stream
app.get('/mcp', (req, res) => {
  // Set headers required to hold the SSE connection open
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Tell Front exactly where to send its JSON-RPC POST messages
  const messageEndpoint = `https://${req.headers.host}/mcp/messages`;
  res.write(`event: endpoint\ndata: ${messageEndpoint}\n\n`);

  // Do NOT close the response. Keep it open until Front disconnects.
  req.on('close', () => {
    res.end();
  });
});

// 2. Message Endpoint: Front posts its commands here
app.post('/mcp/messages', async (req, res) => {
  const { method, id } = req.body || {};

  // MCP Initial Handshake
  if (method === 'initialize') {
    return res.json({
      jsonrpc: "2.0",
      id: id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "google-sheets-mcp", version: "1.0.0" }
      }
    });
  }

  // Acknowledge initialization
  if (method === 'notifications/initialized') {
    return res.status(200).send();
  }

  // Provide the tools list
  if (method === 'tools/list') {
    return res.json({
      jsonrpc: "2.0",
      id: id,
      result: {
        tools: [{
          name: "get_sheet_data",
          description: "Fetches pricing and rates data from Google Sheets",
          inputSchema: { type: "object", properties: {} }
        }]
      }
    });
  }

  // Execute the tool and fetch from Google Apps Script
  if (method === 'tools/call') {
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { redirect: 'follow' });
      const data = await response.json();
      return res.json({
        jsonrpc: "2.0",
        id: id,
        result: {
          content: [{ type: "text", text: typeof data === 'string' ? data : JSON.stringify(data) }]
        }
      });
    } catch (err) {
      return res.json({
        jsonrpc: "2.0",
        id: id,
        error: { code: -32603, message: err.message }
      });
    }
  }

  // Default fallback for ping checks
  return res.json({ jsonrpc: "2.0", id: id, result: {} });
});

module.exports = app;
