# Security Implementation Guide

This document outlines the security features implemented in the PNHS Enrollment System to protect against common web vulnerabilities.

## Backend Security Features

### 1. HTTP Security Headers (Helmet.js)
- **Content Security Policy (CSP)**: Prevents XSS attacks by restricting script sources
- **HSTS**: Enforces HTTPS connections for 1 year
- **Frameguard**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-XSS-Protection**: Legacy XSS protection header
- **Referrer-Policy**: Controls referrer information

### 2. Rate Limiting (express-rate-limit)
- **General API routes**: 100 requests per 15 minutes per IP
- **Login endpoints**: 5 attempts per 15 minutes per IP (prevents brute force)
- **User creation**: 10 requests per hour per IP

### 3. XSS (Cross-Site Scripting) Prevention
- All user-controlled data embedded in HTML is escaped using the `xss` library
- Report templates (`COE` and `SF1`) properly escape:
  - Student names (first, last names)
  - LRN numbers
  - Section names
  - School years
  - Enrollment statuses
- All HTML output includes proper `Content-Type` and `X-Content-Type-Options` headers

### 4. SQL Injection Prevention
- All database queries use parameterized queries with placeholders (`?`)
- User input is never directly concatenated into SQL queries
- Example: `WHERE username = ?` with `[username]` parameter array

### 5. Authentication Security
- Passwords are hashed using bcryptjs with salt rounds (10)
- JWT tokens include expiration time (default 8 hours)
- JWT secret should be stored in environment variables (never hardcoded)
- Generic error messages prevent user enumeration attacks ("Invalid credentials" instead of "User not found")

### 6. Input Validation
All user inputs are validated:

**Username validation:**
- 3-50 alphanumeric characters and underscores
- Prevents injection attacks

**Password strength requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

**Name sanitization:**
- Only allows letters, spaces, hyphens, apostrophes
- Removes special characters that could cause HTML injection

**LRN validation:**
- Exactly 12 digits
- Standard format across the system

**Grade level validation:**
- Only allows values 7-12
- Prevents invalid enrollment data

**School year validation:**
- Must match format YYYY-YYYY
- Prevents invalid query parameters

### 7. CORS (Cross-Origin Resource Sharing)
- Restricted to specific frontend origin (configurable via environment variable)
- Only allows specific HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Allows specific headers (Content-Type, Authorization)
- Credentials support enabled

### 8. Request Body Size Limits
- JSON payloads limited to 1MB
- URL-encoded payloads limited to 1MB
- Prevents DoS attacks through large payloads

### 9. Environment Variables
- Store sensitive data in `.env` file:
  - `JWT_SECRET`: Strong, random string (minimum 32 characters)
  - `JWT_EXPIRES_IN`: JWT expiration time
  - `DATABASE_URL`: Database connection string
  - `FRONTEND_URL`: Allowed frontend origin
  - `PORT`: Server port

### 10. Error Handling
- Error details are not exposed to clients (prevents information disclosure)
- All errors are logged to console for debugging
- Generic error messages returned to API clients

## Frontend Security Features

### 1. JWT Token Storage
- Tokens are stored in `localStorage` with role-specific keys
- Keys: `pnhs-auth-student`, `pnhs-auth-admin`, `pnhs-auth-registrar`
- Consider using httpOnly cookies for enhanced security (future improvement)

### 2. Authorization Checks
- Role-based access control via `ProtectedRoute` component
- Routes validate user role before rendering protected pages
- Tokens are automatically attached to all API requests via bearer scheme

### 3. CORS Protection
- Frontend can only communicate with authorized backend origin
- All requests include proper CORS headers

## Common Attack Vectors and Mitigation

| Attack Type | Mitigation |
|---|---|
| **SQL Injection** | Parameterized queries, input validation |
| **XSS (Cross-Site Scripting)** | HTML escaping, CSP headers, input sanitization |
| **CSRF (Cross-Site Request Forgery)** | SameSite cookies (via helmet), JWT in Authorization header |
| **Brute Force / Account Takeover** | Rate limiting on login (5 attempts/15 min), strong password policy |
| **DoS (Denial of Service)** | Rate limiting (100 req/15 min), body size limits |
| **Clickjacking** | X-Frame-Options: deny |
| **MIME Type Sniffing** | X-Content-Type-Options: nosniff |
| **Information Disclosure** | Generic error messages, no stack traces to clients |
| **Man-in-the-Middle** | HSTS headers, HTTPS enforcement, encrypted fields |
| **User Enumeration** | Generic login error messages |

## Setup Instructions

### Install Security Dependencies
```bash
cd backend
npm install
```

### Environment Variables
Create a `.env` file in the backend directory:
```env
PORT=5000
JWT_SECRET=your-very-long-random-string-at-least-32-chars
JWT_EXPIRES_IN=8h
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=pnhs_enrollment
FRONTEND_URL=http://localhost:5173
```

### Generate Strong JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Best Practices for Developers

1. **Always validate user input** - Never trust data from clients
2. **Use parameterized queries** - Never concatenate user input into SQL
3. **Escape HTML output** - Always escape data before rendering in HTML
4. **Keep dependencies updated** - Regularly run `npm audit` and update packages
5. **Use HTTPS in production** - Never transmit sensitive data over HTTP
6. **Rotate JWT secrets periodically** - Helps limit impact of compromised secrets
7. **Monitor for suspicious activity** - Log and review unusual patterns
8. **Test for vulnerabilities** - Run security scanners before production
9. **Implement database backups** - Protect against data loss from attacks
10. **Follow principle of least privilege** - Only grant necessary permissions to users and services

## Testing Security

### Manual Security Testing
```bash
# Test rate limiting (should get 429 after 5 requests)
for i in {1..10}; do curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{}'; done

# Test XSS prevention (attempt script in student name)
curl -X POST http://localhost:5000/api/enroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"firstName":"<script>alert(1)</script>","lastName":"Test",...}'

# Test SQL injection (attempt SQL in enrollment query)
curl "http://localhost:5000/api/reports/sf1?sectionId=1' OR '1'='1&schoolYear=2024-2025"
```

### Automated Security Scanning
```bash
# Check dependencies for vulnerabilities
npm audit

# Run ESLint with security plugin
npm install --save-dev eslint-plugin-security
```

## Incident Response

If a security issue is discovered:

1. **Immediately revoke permissions** - Deactivate affected accounts
2. **Change secrets** - Rotate JWT secrets and database passwords
3. **Review logs** - Check access logs for suspicious activity
4. **Notify stakeholders** - Inform affected users
5. **Patch vulnerability** - Update code and redeploy
6. **Monitor closely** - Watch for further incidents

## Security Audit Schedule

- **Monthly**: Review access logs and security event logs
- **Quarterly**: Run automated vulnerability scans
- **Bi-annually**: Perform manual security testing
- **Annually**: Comprehensive security audit by external firm

## Additional Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE/SANS Top 25: https://cwe.mitre.org/top25/
- Node.js Security Checklist: https://nodejs.org/en/docs/guides/security/
- Express.js Security Best Practices: https://expressjs.com/en/advanced/best-practice-security.html
