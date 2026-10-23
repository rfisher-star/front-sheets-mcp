const express = require('express');
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx-Y2IA2NSujH5CBqnh2dzbDSO54gFE02jErqIftT1vROQLQ9TFRhbsl-zKdaYOjb9g/exec";

const app = express();
app.use(express.json());

let transport;

function createMcpServer() {
  const server = new Server(
    { name: "google-sheets-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_sheet_data",
          description: "Fetches pricing and rates data from Google Sheets",
          inputSchema: { type: "object", properties: {} }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "get_sheet_data") {
      try {
        const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { redirect: 'follow' });
        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: typeof data === 'string' ? data : JSON.stringify(data)
            }
          ]
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error fetching sheet data: ${err.message}` }],
          isError: true
        };
      }
    }
    throw new Error("Tool not found");
  });

  return server;
}

app.get('/mcp', async (req, res) => {
  transport = new SSEServerTransport('/mcp/messages', res);
  const server = createMcpServer();
  await server.connect(transport);
});

app.post('/mcp/messages', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No active SSE transport connection");
  }
});

app.all('*', (req, res) => {
  res.status(200).send("MCP Server Running");
});

module.exports = app;
