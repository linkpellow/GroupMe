# GroupMe Integration for Crokodial

This document explains how to set up and use the GroupMe integration in the Crokodial dialer application.

## Configuration

The GroupMe integration requires an access token and group IDs to function properly.

### Access Token
The access token is already configured in the application:
```
YTN1QCUQYWkIgMdQ9DO2eVZFSq3NtDo1tib1NKbI
```

### Group Links
The following GroupMe groups are configured:
- https://groupme.com/join_group/54099588/VDirXvX9
- https://groupme.com/join_group/13840065/SAAASXfE
- https://groupme.com/join_group/35765159/Upnew0uU
- https://groupme.com/join_group/84195970/BnTOjCZ1
- https://groupme.com/join_group/65281843/l3EENCn9
- https://groupme.com/join_group/105011074/CNtBmHbK

## Setup Instructions

### Option 1: Automatic Configuration
1. Start the Crokodial application with the server and client running
2. Open `update-groupme-config.html` in your browser
3. Click the "Update GroupMe Config" button
4. Refresh the Crokodial application page
5. Go to the GroupMe settings page to verify configuration

### Option 2: Manual Configuration
1. In the Crokodial application, navigate to the GroupMe settings page
2. Enter the access token: `YTN1QCUQYWkIgMdQ9DO2eVZFSq3NtDo1tib1NKbI`
3. Manually add each of the group IDs extracted from the links above
4. Save the configuration

## Starting the Application with GroupMe Enabled

Run the following command to start both the server and client with GroupMe integration enabled:

```bash
./start-groupme-integration.sh
```

## Troubleshooting

If you encounter issues with the GroupMe integration:

1. **Check the server logs** - Ensure the server is running and connecting to MongoDB
2. **Verify access token** - Make sure the access token is valid and has not expired
3. **Clear browser cache** - Try clearing your browser cache and reloading the page
4. **Check localStorage** - Open your browser developer tools and verify that 'groupme_config' exists in localStorage
5. **Restart the application** - Sometimes a full restart of both server and client resolves connection issues

## Technical Details

The GroupMe integration uses:
- GroupMe REST API for fetching groups and messages
- localStorage to persist the configuration on the client side
- Express.js routes on the server to proxy requests to the GroupMe API
- MongoDB to store messages and configuration

The configuration is saved in both:
1. The browser's localStorage for client-side persistence
2. MongoDB for server-side persistence when available 