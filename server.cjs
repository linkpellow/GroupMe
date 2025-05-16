// This is a CommonJS file (.cjs extension) to avoid ES Module errors
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3005;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock user for authentication
const mockUser = {
  id: 'user-123',
  email: 'user@example.com',
  name: 'Test User',
  role: 'admin'
};

// GroupMe configuration
const groupMeConfig = {
  accessToken: 'YTN1QCUQYWkIgMdQ9DO2eVZFSq3NtDo1tib1NKbI',
  groups: {
    "54099588": "Group 1",
    "13840065": "Group 2",
    "35765159": "Group 3",
    "84195970": "Group 4",
    "65281843": "Group 5",
    "105011074": "Group 6"
  }
};

// Mock GroupMe groups
const groups = [
  { 
    groupId: "54099588", 
    groupName: "Group 1", 
    botId: "", 
    enabled: true, 
    displayOrder: 0, 
    displayInDashboard: true,
    image_url: "https://i.groupme.com/200x200"
  },
  { 
    groupId: "13840065", 
    groupName: "Group 2", 
    botId: "", 
    enabled: true, 
    displayOrder: 1, 
    displayInDashboard: true,
    image_url: "https://i.groupme.com/200x200"
  },
  { 
    groupId: "35765159", 
    groupName: "Group 3", 
    botId: "", 
    enabled: true, 
    displayOrder: 2, 
    displayInDashboard: true,
    image_url: "https://i.groupme.com/200x200"
  },
  { 
    groupId: "84195970", 
    groupName: "Group 4", 
    botId: "", 
    enabled: true, 
    displayOrder: 3, 
    displayInDashboard: true,
    image_url: "https://i.groupme.com/200x200"
  },
  { 
    groupId: "65281843", 
    groupName: "Group 5", 
    botId: "", 
    enabled: true, 
    displayOrder: 4, 
    displayInDashboard: true,
    image_url: "https://i.groupme.com/200x200"
  },
  { 
    groupId: "105011074", 
    groupName: "Group 6", 
    botId: "", 
    enabled: true, 
    displayOrder: 5, 
    displayInDashboard: true,
    image_url: "https://i.groupme.com/200x200"
  }
];

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// AUTH ROUTES
app.post('/api/auth/login', (req, res) => {
  console.log('LOGIN ATTEMPT:', req.body);
  res.json({
    success: true,
    token: 'mock-token-12345',
    user: mockUser
  });
});

app.get('/api/auth/profile', (req, res) => {
  console.log('GET PROFILE');
  res.json(mockUser);
});

// GROUPME ROUTES
app.get('/api/groupme/config', (req, res) => {
  console.log('GET GROUPME CONFIG');
  res.json(groupMeConfig);
});

app.post('/api/groupme/config', (req, res) => {
  console.log('SAVE GROUPME CONFIG:', req.body);
  res.json(req.body);
});

app.get('/api/groupme/groups', (req, res) => {
  console.log('GET GROUPME GROUPS');
  res.json({ success: true, data: { groups } });
});

app.get('/api/groupme/groups/:groupId/messages', (req, res) => {
  console.log('GET GROUPME MESSAGES FOR GROUP:', req.params.groupId);
  res.json({ 
    success: true, 
    data: { 
      messages: [
        { id: '1', text: 'Hello from GroupMe', name: 'Test User', created_at: Date.now() / 1000 }
      ] 
    } 
  });
});

// OTHER REQUIRED ROUTES
app.get('/api/leads', (req, res) => {
  console.log('GET LEADS:', req.query);
  res.json({ leads: [], total: 0 });
});

app.get('/api/leads/call-counts', (req, res) => {
  console.log('GET CALL COUNTS');
  res.json({ todayCalls: 0, totalLeads: 0 });
});

app.get('/api/dispositions', (req, res) => {
  console.log('GET DISPOSITIONS');
  res.json([
    { id: 'disp-1', name: 'Interested' },
    { id: 'disp-2', name: 'Not Interested' }
  ]);
});

// Catch all other routes
app.use('/api/*', (req, res) => {
  console.log('UNHANDLED API ROUTE:', req.method, req.url);
  res.json({ success: true, message: 'API endpoint stub' });
});

// Try multiple methods of starting the server to handle both IPv4 and IPv6
try {
  // Method 1: Listen on all interfaces explicitly
  const server = app.listen(PORT, '::', () => {
    console.log(`Server listening on [::]:${PORT} (all IPv6 interfaces)`);
    startupComplete();
  });
  
  // Add error handler for server
  server.on('error', (err) => {
    console.error('IPv6 server error:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.log('Port already in use, trying alternative...');
    }
    // Try IPv4 only if IPv6 fails
    startIPv4Server();
  });
} catch (err) {
  console.error('Error starting IPv6 server:', err.message);
  startIPv4Server();
}

function startIPv4Server() {
  try {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on 0.0.0.0:${PORT} (all IPv4 interfaces)`);
      startupComplete();
    });
    
    server.on('error', (err) => {
      console.error('IPv4 server error:', err.message);
      if (err.code === 'EADDRINUSE') {
        console.log(`Error: Port ${PORT} is already in use.`);
        console.log('Please stop any other servers and try again.');
      }
    });
  } catch (err) {
    console.error('Failed to start server on IPv4:', err.message);
  }
}

function startupComplete() {
  console.log(`
========================================
  GroupMe Server Running on PORT ${PORT}
========================================
- Configured with your access token: ${groupMeConfig.accessToken.substring(0, 5)}...
- All 6 GroupMe groups are configured
- Any login credentials will work

Client proxy should point to:
http://localhost:${PORT} 
  
Commands to test:
curl http://localhost:${PORT}/api/groupme/config
curl http://localhost:${PORT}/api/groupme/groups
  
Press Ctrl+C to stop the server
========================================
  `);
} 