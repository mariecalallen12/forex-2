# Digital Utopia Backend API Documentation

## Overview
Digital Utopia 2.0 Backend API v1.0 - Production-ready microservices architecture with Firebase integration, real-time WebSocket support, and comprehensive authentication.

## Base URL
```
Production: https://api.digital-utopia.com/v1
Development: http://localhost:3000/api/v1
```

## Authentication
All API endpoints require authentication except registration and login.
- **Header**: `Authorization: Bearer <token>`
- **Token Type**: Firebase ID Token

## Common Response Format
```json
{
  "success": true|false,
  "message": "Success message",
  "data": {},
  "timestamp": "2023-12-01T00:00:00.000Z"
}
```

## Rate Limiting
- **Login**: 5 attempts per 15 minutes
- **Register**: 3 attempts per hour
- **Trading**: 10 requests per minute
- **Deposits**: 5 requests per day
- **Withdrawals**: 3 requests per day
- **General API**: 100 requests per minute

---

## Authentication Endpoints

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "uid": "user_id",
      "email": "user@example.com",
      "displayName": "John Doe",
      "emailVerified": true
    },
    "token": "firebase_id_token",
    "expiresIn": "1h"
  }
}
```

### POST /auth/register
Register new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe",
  "phoneNumber": "+84123456789",
  "agreeToTerms": true
}
```

### POST /auth/logout
Logout and revoke token.

**Headers:** `Authorization: Bearer <token>`

### POST /auth/refresh
Refresh authentication token.

**Headers:** `Authorization: Bearer <token>`

### GET /auth/verify
Verify current token and get user info.

**Headers:** `Authorization: Bearer <token>`

---

## User Management

### GET /users
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

### PUT /users
Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "displayName": "Updated Name",
  "phoneNumber": "+84123456789",
  "avatar": "https://example.com/avatar.jpg"
}
```

### DELETE /users
Delete user account (soft delete).

**Headers:** `Authorization: Bearer <token>`

---

## Admin Endpoints

### GET /admin/users
Get all users (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search by email
- `role` (string): Filter by role (user, admin, superadmin)
- `status` (string): Filter by status (active, inactive, suspended, deleted)
- `kycStatus` (string): Filter by KYC status (pending, verified, rejected)

### PUT /admin/users/:userId
Update user (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "role": "admin",
  "status": "active",
  "kycStatus": "verified",
  "balance": {
    "usdt": 1000,
    "btc": 0.01,
    "eth": 0.1
  }
}
```

### DELETE /admin/users/:userId
Delete user (Admin only).

**Headers:** `Authorization: Bearer <token>`

### GET /admin/deposits
Get all deposits for admin review (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status (pending, approved, rejected)
- `currency` (string): Filter by currency (usdt, btc, eth)
- `userId` (string): Filter by user ID

### PUT /admin/deposits/:depositId
Process deposit approval/rejection (Admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "approved",
  "notes": "Processed successfully",
  "processedBy": "admin_id"
}
```

---

## Trading Endpoints

### POST /trading/orders
Place new trading order (KYC required).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "symbol": "BTCUSDT",
  "side": "buy",
  "type": "limit",
  "quantity": 0.1,
  "price": 65000,
  "leverage": 1
}
```

**Order Types:**
- `market`: Market order
- `limit`: Limit order (requires price)
- `stop-loss`: Stop-loss order (requires stopPrice)

### GET /trading/orders
Get user's trading orders.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `symbol` (string): Filter by trading pair
- `status` (string): Filter by order status
- `side` (string): Filter by side (buy, sell)

### DELETE /trading/orders/:orderId
Cancel trading order.

**Headers:** `Authorization: Bearer <token>`

### GET /trading/positions
Get user's open positions.

**Headers:** `Authorization: Bearer <token>`

### POST /trading/positions/:positionId/close
Close trading position.

**Headers:** `Authorization: Bearer <token>`

---

## Financial Endpoints

### POST /financial/deposits
Create deposit request.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": 1000,
  "currency": "usdt",
  "method": "bank_transfer",
  "bankAccount": {
    "accountNumber": "123456789",
    "accountName": "John Doe",
    "bankName": "Vietcombank"
  },
  "notes": "Deposit from bank"
}
```

### GET /financial/deposits
Get user's deposit history.

**Headers:** `Authorization: Bearer <token>`

### POST /financial/withdrawals
Create withdrawal request.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "amount": 500,
  "currency": "usdt",
  "method": "bank_transfer",
  "bankAccount": {
    "accountNumber": "123456789",
    "accountName": "John Doe",
    "bankName": "Vietcombank"
  },
  "notes": "Withdrawal request"
}
```

### GET /financial/withdrawals
Get user's withdrawal history.

**Headers:** `Authorization: Bearer <token>`

---

## Market Data Endpoints

### GET /market/prices
Get real-time market prices.

**Query Parameters:**
- `symbol` (string): Single symbol (e.g., BTCUSDT)
- `symbols` (string): Comma-separated symbols (e.g., BTCUSDT,ETHUSDT)

**Response:**
```json
{
  "success": true,
  "data": {
    "prices": {
      "BTCUSDT": {
        "symbol": "BTCUSDT",
        "price": 67850.32,
        "change24h": 1234.56,
        "changePercent": 1.85,
        "volume24h": 28475692847,
        "high24h": 68500.15,
        "low24h": 66432.88,
        "timestamp": 1701388800000
      }
    },
    "timestamp": "2023-12-01T00:00:00.000Z"
  }
}
```

### GET /market/orderbook/:symbol
Get order book data for specific symbol.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "bids": [
      {
        "price": 67850.00,
        "quantity": 1.234,
        "total": 83699.39
      }
    ],
    "asks": [
      {
        "price": 67851.00,
        "quantity": 0.567,
        "total": 38476.97
      }
    ],
    "lastUpdateId": 1701388800000
  }
}
```

### GET /market/trade-history/:symbol
Get trade history for specific symbol.

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "BTCUSDT",
    "trades": [
      {
        "id": "trade_1701388800000",
        "price": 67850.32,
        "quantity": 0.123,
        "time": 1701388800000,
        "timestamp": "2023-12-01T00:00:00.000Z",
        "isBuyerMaker": false,
        "isBestMatch": true
      }
    ]
  }
}
```

---

## WebSocket Events

### Connection
```javascript
const socket = io('wss://api.digital-utopia.com', {
  auth: {
    token: 'firebase_id_token'
  }
});
```

### Subscribe to Market Data
```javascript
// Join market rooms
socket.emit('join_market', ['BTCUSDT', 'ETHUSDT']);

// Listen for price updates
socket.on('market_update', (data) => {
  console.log('Price update:', data);
});
```

### Subscribe to Notifications
```javascript
// Subscribe to order notifications
socket.emit('subscribe_orders');

// Listen for trade updates
socket.on('trade_update', (notification) => {
  console.log('Trade update:', notification);
});

// Listen for financial notifications
socket.emit('subscribe_financial');
socket.on('financial_update', (notification) => {
  console.log('Financial update:', notification);
});
```

### Notification Format
```json
{
  "id": "notif_1701388800000",
  "userId": "user_id",
  "type": "trade",
  "title": "Giao dịch được thực hiện",
  "message": "Lệnh buy BTCUSDT đã được xử lý",
  "data": {
    "orderId": "order_123",
    "symbol": "BTCUSDT",
    "side": "buy",
    "quantity": 0.1,
    "executedPrice": 67850.32
  },
  "timestamp": "2023-12-01T00:00:00.000Z",
  "read": false
}
```

---

## Error Codes

### Authentication Errors (401)
- `NO_AUTH_TOKEN`: Không tìm thấy token xác thực
- `INVALID_TOKEN`: Token không hợp lệ
- `TOKEN_EXPIRED`: Token đã hết hạn
- `INSUFFICIENT_PERMISSIONS`: Không có quyền truy cập

### Validation Errors (400)
- `VALIDATION_ERROR`: Dữ liệu đầu vào không hợp lệ
- `MISSING_REQUIRED_FIELD`: Thiếu trường bắt buộc
- `INVALID_FORMAT`: Định dạng không đúng

### Business Logic Errors (400)
- `INSUFFICIENT_BALANCE`: Số dư không đủ
- `KYC_REQUIRED`: Cần xác minh KYC
- `ORDER_CANNOT_CANCEL`: Không thể hủy lệnh
- `WITHDRAWAL_LIMIT_EXCEEDED`: Vượt quá hạn mức rút tiền

### System Errors (500)
- `INTERNAL_ERROR`: Lỗi hệ thống
- `DATABASE_ERROR`: Lỗi cơ sở dữ liệu
- `EXTERNAL_SERVICE_ERROR`: Lỗi dịch vụ bên ngoài

### Rate Limiting (429)
- `RATE_LIMIT_EXCEEDED`: Quá nhiều yêu cầu

---

## Environment Variables

### Firebase Configuration
```env
# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY=...
FIREBASE_PROJECT_ID=digital-utopia
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@digital-utopia.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://digital-utopia.firebaseio.com

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=digital-utopia.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=digital-utopia
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=digital-utopia.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

### SendGrid Configuration
```env
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=noreply@digital-utopia.com
SENDGRID_FROM_NAME=Digital Utopia
```

### Security Configuration
```env
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key
FRONTEND_URL=http://localhost:3000
```

---

## Deployment

### Environment Setup
1. Install dependencies: `npm install`
2. Set up environment variables
3. Deploy to production: `npm run deploy`

### Health Check
```bash
curl https://api.digital-utopia.com/health
```

### API Status
- All endpoints return JSON
- Proper HTTP status codes
- Comprehensive error messages
- Rate limiting protection
- Request/response logging

---

## Support
For technical support and API questions, please contact:
- Email: api-support@digital-utopia.com
- Documentation: https://docs.digital-utopia.com
- Status Page: https://status.digital-utopia.com

---

**Version:** 1.0.0  
**Last Updated:** December 2023  
**Author:** MiniMax Agent  
**License:** MIT