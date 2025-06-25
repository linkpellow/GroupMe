# Dialer + Lead Pipeline Application

A full-stack web application for managing leads and making outbound calls, similar to Ringy. Built with Node.js, Express, React, MongoDB, and Twilio.

## Features

- **User Authentication & Authorization**

  - JWT-based authentication
  - Role-based access control (Admin/Agent)
  - Secure password hashing

- **Lead Management**

  - CRUD operations for leads
  - Lead status tracking
  - Lead assignment to agents
  - Search and filter capabilities

- **Dialer Integration**

  - Outbound calling via Twilio
  - Call status tracking
  - Call recording
  - Call notes and history

- **API Documentation**
  - OpenAPI/Swagger documentation
  - API versioning
  - Protected endpoints

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v4.4 or higher)
- Twilio Account (for making calls)

## Project Structure

```
dialer-app/
├── server/              # Backend server
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── server.ts
│   ├── swagger.yaml
│   └── package.json
└── client/             # Frontend application (to be implemented)
```

## Setup Instructions

### Environment Variables

Create a `.env` file in the server directory with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/dialer_app

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRATION=24h

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000

# API Configuration
API_PREFIX=/api
```

### Backend Setup

1. Install dependencies:

   ```bash
   cd server
   npm install
   ```

2. Build the TypeScript code:

   ```bash
   npm run build
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The server will be running at `http://localhost:3001`.

### API Documentation

Once the server is running, you can access the API documentation at:

```
http://localhost:3001/api-docs
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user (admin only)
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Leads

- `GET /api/leads` - Get all leads
- `POST /api/leads` - Create a new lead
- `GET /api/leads/:id` - Get a specific lead
- `PATCH /api/leads/:id` - Update a lead
- `DELETE /api/leads/:id` - Delete a lead (admin only)

### Calls

- `POST /api/calls` - Initiate a call
- `GET /api/calls` - Get all calls
- `GET /api/calls/:id` - Get a specific call
- `PATCH /api/calls/:id/notes` - Update call notes
- `POST /api/calls/webhooks/twilio/status` - Twilio status webhook
- `POST /api/calls/webhooks/twilio/voice` - Twilio voice webhook

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Security

- All endpoints (except login and Twilio webhooks) require JWT authentication
- Passwords are hashed using bcrypt
- API is protected with helmet security headers
- CORS is configured for the frontend origin
- Input validation using express-validator
- Role-based access control for sensitive operations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
