# Newsroom MCP — Backend

Production-grade boilerplate for the Newsroom MCP SaaS platform.

**Stack:** Node.js + Express 5 + MongoDB (Mongoose) + Socket.io + Winston + Zod + JWT

## 📁 Folder structure

```
backend/
├── app.js                          # Entry point — wires middleware + routes
├── package.json                    # ES modules, # path aliases
├── .env.example                    # Copy to .env
├── logs/                           # Auto-created by Winston
└── src/
    ├── config/
    │   ├── corsConfig.js           # CORS origin parser
    │   ├── dbConnect.js            # MongoDB connect with retry + initData
    │   ├── swagger.js              # /api/docs spec
    │   └── initDataSetup/
    │       ├── index.js
    │       ├── initRoles.js        # Seeds SuperAdmin + User roles
    │       └── initSuperAdmin.js   # Seeds first SuperAdmin user
    ├── constants/
    │   ├── roles.js                # Role + permission catalog
    │   └── statusCodes.js          # HTTP status enums
    ├── controllers/                # Add: <module>/<module>Controller.js
    ├── jobs/
    │   └── index.js                # Cron registry
    ├── middlewares/
    │   ├── authMiddleware.js       # protect + authorize + authorizeRoles
    │   ├── globalErrorHandlerMiddleware.js
    │   ├── loggingMiddleware.js    # Morgan → Winston
    │   ├── notFoundHandlerMiddleware.js
    │   ├── rateLimiterMiddleware.js
    │   ├── securityMiddleware.js   # helmet + cors + hpp + xss + NoSQL
    │   └── validateMiddleware.js   # Zod parser
    ├── models/                     # Add: <entity>Model.js
    ├── repositories/               # Add: <entity>Repository.js
    ├── routes/v1/
    │   ├── index.js                # Aggregator
    │   └── health/healthRoute.js
    ├── services/                   # Add: <module>/<module>Service.js
    ├── socket/server.js            # Socket.io with userSocketMap
    ├── utils/
    │   ├── auditLogger.js
    │   ├── bcryptUtil.js
    │   ├── catchAsync.js
    │   ├── cloudinaryUtil.js
    │   ├── emailUtil.js            # Resend / SMTP / Ethereal preview
    │   ├── encryptionUtil.js       # AES-256-GCM for CMS credentials
    │   ├── jwtUtil.js
    │   ├── logger.js
    │   ├── multerUtil.js
    │   ├── otpUtil.js
    │   ├── paginationUtil.js       # ⭐ smart pagination
    │   ├── responseUtil.js         # ⭐ res.success / res.paginated / res.error
    │   └── throwErrorUtil.js
    └── validations/                # Add: <module>/<module>Validation.js
```

## ⭐ Response contract — uniform across the API

### Success (object)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Fetched successfully",
  "data": { "id": "...", "name": "..." },
  "request": { "method": "GET", "url": "/api/v1/me", "requestId": "..." }
}
```

### Success (array — pagination AUTO-attached)

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Fetched successfully",
  "data": [ { ... }, { ... } ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 142,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false,
    "search": "",
    "sortBy": "createdAt",
    "sortOrder": "desc",
    "filters": {}
  },
  "request": { ... }
}
```

### Error

```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation failed",
  "data": [ { "field": "email", "message": "Invalid email" } ],
  "trace": null,
  "request": { ... }
}
```

## 🛠️ How to use the response handler

In a controller:

```js
import { catchAsync } from "#utils/catchAsync.js";
import { paginateModel, parsePaginationParams } from "#utils/paginationUtil.js";
import { ArticleModel } from "#models/articleModel.js";

// Object response — no pagination
export const getMyProfile = catchAsync(async (req, res) => {
  const user = await UserService.getById(req.user.id);
  res.success({ data: user, message: "Profile fetched" });
});

// Paginated array response — pagination auto-attached
export const listArticles = catchAsync(async (req, res) => {
  const params = parsePaginationParams(req, {
    allowedSortFields: ["createdAt", "title", "wordCount"],
  });
  const result = await paginateModel(
    ArticleModel,
    { workspaceId: req.user.workspaceId },
    params,
    { searchFields: ["title", "keyword"] }
  );
  res.success({ data: result, message: "Articles fetched" });
});

// Or use the explicit helper
res.paginated({ items: result.items, meta: result.meta });
```

## 🚦 Throwing errors

Use `throwError(message, statusCode, data?)` — caught by `globalErrorHandler`:

```js
import { throwError } from "#utils/throwErrorUtil.js";

if (!user) throwError("User not found", 404);
if (user.plan === "free" && articles.length >= 10) {
  throwError("Article limit reached. Please upgrade.", 403);
}
```

## 🔐 Auth middleware

```js
import { protect, authorize, authorizeRoles } from "#middlewares/authMiddleware.js";
import { PERMISSIONS, ROLE_NAMES } from "#constants/roles.js";

router.get("/articles", protect, authorize(PERMISSIONS.TENANT_ARTICLE_READ), handler);
router.get("/admin/users", protect, authorizeRoles([ROLE_NAMES.SUPER_ADMIN]), handler);
```

## 🏃 Getting started

```bash
cd backend
npm install
cp .env.example .env    # fill in values
npm run dev             # → http://localhost:8000
```

## 📚 Docs

- Swagger: http://localhost:8000/api/docs
- Health: http://localhost:8000/api/health
