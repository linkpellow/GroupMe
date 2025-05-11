const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// GroupMe webhook endpoint
app.post('/groupme/callback', (req, res) => {
  console.log('GroupMe webhook received:', req.body);
  
  // Log the message text if it exists
  if (req.body && req.body.text) {
    console.log(`Message: ${req.body.text} from ${req.body.name}`);
  }
  
  // Always respond with 200 OK to acknowledge receipt
  res.status(200).send('OK');
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('GroupMe webhook server is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 