# IP Whitelist Implementation

## Overview
The backend server now includes IP whitelisting functionality to restrict access to authorized IP addresses only. This feature ensures that only requests from whitelisted IPs (or localhost) can access the API endpoints.

## Features

### 1. IP Whitelist Middleware
- **Location**: Lines 115-159 in `server.js`
- **Behavior**:
  - Automatically allows all localhost IPs (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`, `localhost`)
  - Checks incoming request IPs against the `allowed_ips` database table
  - Returns `403 Forbidden` if the IP is not whitelisted
  - Always allows access to `/health` endpoint (for monitoring)
  - Fails open (allows access) if there's a database error (for safety)

### 2. API Endpoints for IP Management
All IP management endpoints require admin authentication.

#### Get All Allowed IPs
```
GET /api/allowed-ips
```
**Auth**: Admin only  
**Response**: Array of allowed IP records
```json
[
  {
    "id": 1,
    "ip_address": "192.168.1.100",
    "description": "Office network",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Add IP to Whitelist
```
POST /api/allowed-ips
```
**Auth**: Admin only  
**Body**:
```json
{
  "ip_address": "192.168.1.100",
  "description": "Office network" // optional
}
```
**Response**: Created IP record
```json
{
  "id": 1,
  "ip_address": "192.168.1.100",
  "description": "Office network",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

#### Update Allowed IP
```
PUT /api/allowed-ips/:id
```
**Auth**: Admin only  
**Body**:
```json
{
  "ip_address": "192.168.1.101", // optional
  "description": "Updated office network" // optional
}
```
**Response**: Updated IP record

#### Delete Allowed IP
```
DELETE /api/allowed-ips/:id
```
**Auth**: Admin only  
**Response**:
```json
{
  "message": "IP address removed from whitelist"
}
```

## Database Schema

The IP whitelist uses the `allowed_ips` table:

```sql
CREATE TABLE allowed_ips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Considerations

1. **Localhost Always Allowed**: Localhost IPs are always permitted to ensure local development and administrative access.

2. **Health Endpoint Exemption**: The `/health` endpoint bypasses IP checks to allow external monitoring services.

3. **Fail-Open Behavior**: If the database check fails, the middleware allows the request to proceed. This prevents complete service outage if the database becomes unavailable temporarily.

4. **Admin-Only Management**: Only users with admin privileges can manage the IP whitelist.

5. **IP Validation**: All IP addresses are validated using the `isIP()` validator from express-validator.

## Usage Scenarios

### Development Environment
During development, the server will automatically allow all localhost connections, so developers don't need to configure anything.

### Production Environment
1. Admin logs in from a trusted network (initially localhost or pre-configured IP)
2. Admin adds authorized IPs using the POST `/api/allowed-ips` endpoint
3. All future requests are filtered through the IP whitelist

### Adding Your First IP
If you need to add the first IP address after deployment:

1. Connect from localhost or use SSH tunneling
2. Use curl or your API client:
```bash
curl -X POST http://localhost:3001/api/allowed-ips \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ip_address": "203.0.113.1", "description": "Corporate office"}'
```

## Testing the IP Whitelist

### Test 1: Verify localhost access
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Test 2: Check non-whitelisted IP (requires external server)
From a non-whitelisted IP:
```bash
curl http://your-server.com/api/departments
# Should return: 403 Forbidden with message about IP authorization
```

### Test 3: Add and verify whitelisted IP
1. Add your IP to whitelist
2. Access API from that IP
3. Should work normally

## Monitoring and Logging

When an IP is denied access, the server logs:
```
🚫 Access denied for IP: 203.0.113.1
```

Check server logs to monitor unauthorized access attempts.

## Disabling IP Whitelist (Not Recommended)

If you need to temporarily disable IP whitelisting for testing:
1. Comment out lines 158-159 in `server.js`:
```javascript
// app.use(ipWhitelistMiddleware);
```
2. Restart the server

**Warning**: This removes all IP-based access control. Only do this in controlled development environments.

## Migration from Existing Setup

If you're adding this to an existing deployment:

1. **Create the table** if it doesn't exist:
```sql
CREATE TABLE IF NOT EXISTS allowed_ips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

2. **Add your production IPs** before deploying to prevent lockout:
```sql
INSERT INTO allowed_ips (ip_address, description) VALUES 
  ('203.0.113.1', 'Production server'),
  ('198.51.100.1', 'Office network');
```

3. **Deploy the updated server.js**

4. **Verify access** from whitelisted IPs

## Troubleshooting

### Issue: Cannot access API after deployment
**Solution**: 
- Access server via SSH
- Connect to MySQL and manually add your IP:
```sql
INSERT INTO allowed_ips (ip_address, description) VALUES ('YOUR_IP', 'Emergency access');
```

### Issue: Getting IP mismatch errors
**Solution**:
- Check if you're behind a proxy/load balancer
- The server uses `req.ip` which respects the `X-Forwarded-For` header
- Configure Express to trust proxies:
```javascript
app.set('trust proxy', true); // Add after const app = express();
```

### Issue: Database check errors in logs
**Solution**:
- Ensure the `allowed_ips` table exists
- Check database connection configuration
- Verify database user has SELECT permissions on `allowed_ips`

## Future Enhancements

Potential improvements for future versions:
1. IP range support (CIDR notation)
2. Temporary IP access (with expiration)
3. Rate limiting per IP
4. Geo-IP restrictions
5. IP whitelist bypass for specific endpoints
6. Audit log for IP whitelist changes

## API Client Example

Example implementation in frontend for managing IPs:

```javascript
// Get all allowed IPs
async function getAllowedIPs() {
  const response = await fetch('/api/allowed-ips', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}

// Add new IP
async function addAllowedIP(ipAddress, description) {
  const response = await fetch('/api/allowed-ips', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ip_address: ipAddress, description })
  });
  return await response.json();
}

// Remove IP
async function removeAllowedIP(id) {
  const response = await fetch(`/api/allowed-ips/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}
```

## Important Notes

1. **This does not replace authentication** - It's an additional security layer
2. **IPv4 and IPv6 supported** - Both IP versions are handled
3. **Restart not required** - IP changes take effect immediately
4. **No caching** - Each request checks the database (can be optimized with Redis in future)

