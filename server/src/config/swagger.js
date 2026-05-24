import swaggerUi from "swagger-ui-express";

const buildSwaggerSpec = () => {
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 8000}`;

  return {
    openapi: "3.0.0",
    info: {
      title: "ShareBit API",
      version: "1.0.0",
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/api/health": {
        get: {
          tags: ["Health"],
          summary: "Health check",
          responses: {
            200: { description: "Health status" },
          },
        },
      },
      "/api/v1/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            201: { description: "Registration successful" },
          },
        },
      },
      "/api/v1/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: { description: "Login successful" },
          },
        },
      },
      "/api/v1/auth/verify-otp": {
        post: {
          tags: ["Auth"],
          summary: "Verify OTP",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerifyOtpRequest" },
              },
            },
          },
          responses: {
            200: { description: "OTP verified" },
          },
        },
      },
      "/api/v1/auth/resend-otp": {
        post: {
          tags: ["Auth"],
          summary: "Resend OTP",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ResendOtpRequest" },
              },
            },
          },
          responses: {
            200: { description: "OTP resent" },
          },
        },
      },
      "/api/v1/auth/refresh-token": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token",
          requestBody: {
            required: false,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshTokenRequest" },
              },
            },
          },
          responses: {
            200: { description: "Token refreshed" },
          },
        },
      },
      "/api/v1/users/investors": {
        post: {
          tags: ["Users"],
          summary: "Create investor from admin",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AdminCreateInvestorRequest" },
              },
            },
          },
          responses: {
            201: { description: "Investor created" },
          },
        },
      },
      "/api/v1/assets": {
        post: {
          tags: ["Assets"],
          summary: "Create asset",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssetCreateRequest" },
              },
            },
          },
          responses: {
            201: { description: "Asset created" },
          },
        },
      },
      "/api/v1/assets/{assetId}": {
        patch: {
          tags: ["Assets"],
          summary: "Update asset",
          parameters: [
            {
              name: "assetId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssetUpdateRequest" },
              },
            },
          },
          responses: {
            200: { description: "Asset updated" },
          },
        },
      },
      "/api/v1/assets/{assetId}/share-accounts": {
        get: {
          tags: ["Shares"],
          summary: "List share accounts by asset",
          parameters: [
            {
              name: "assetId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Share accounts retrieved" },
          },
        },
      },
      "/api/v1/share-accounts/{shareAccountId}/assign": {
        post: {
          tags: ["Shares"],
          summary: "Assign a share account",
          parameters: [
            {
              name: "shareAccountId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShareAssignRequest" },
              },
            },
          },
          responses: {
            200: { description: "Share assigned" },
          },
        },
      },
      "/api/v1/share-accounts/{shareAccountId}/payments": {
        post: {
          tags: ["Shares"],
          summary: "Record share payment",
          parameters: [
            {
              name: "shareAccountId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SharePaymentRequest" },
              },
            },
          },
          responses: {
            201: { description: "Share payment recorded" },
          },
        },
        get: {
          tags: ["Shares"],
          summary: "List share payments",
          parameters: [
            {
              name: "shareAccountId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: { description: "Share payments retrieved" },
          },
        },
      },
      "/api/v1/share-accounts/me": {
        get: {
          tags: ["Shares"],
          summary: "List current user's share accounts",
          responses: {
            200: { description: "User share accounts retrieved" },
          },
        },
      },
      "/api/v1/wallet/withdrawals/admin": {
        get: {
          tags: ["Wallet"],
          summary: "List all withdrawal requests (admin)",
          responses: {
            200: { description: "All withdrawals retrieved" },
          },
        },
      },
      "/api/v1/asset-profits": {
        post: {
          tags: ["Profit"],
          summary: "Record asset profit",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssetProfitRequest" },
              },
            },
          },
          responses: {
            201: { description: "Asset profit recorded" },
          },
        },
      },
      "/api/v1/asset-profits/adjustments": {
        post: {
          tags: ["Profit"],
          summary: "Record asset profit adjustment/reversal",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssetProfitAdjustmentRequest" },
              },
            },
          },
          responses: {
            201: { description: "Asset profit adjustment recorded" },
          },
        },
      },
      "/api/v1/assets/{assetId}/profit/{monthKey}": {
        get: {
          tags: ["Profit"],
          summary: "List asset profit entries",
          parameters: [
            { name: "assetId", in: "path", required: true, schema: { type: "string" } },
            { name: "monthKey", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Asset profit entries retrieved" },
          },
        },
      },
      "/api/v1/assets/{assetId}/pnl/{monthKey}": {
        get: {
          tags: ["Profit"],
          summary: "Get asset monthly PnL statement",
          parameters: [
            { name: "assetId", in: "path", required: true, schema: { type: "string" } },
            { name: "monthKey", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Asset monthly PnL statement retrieved" },
          },
        },
      },
      "/api/v1/asset-expenses": {
        post: {
          tags: ["Profit"],
          summary: "Record asset expense",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssetExpenseRequest" },
              },
            },
          },
          responses: {
            201: { description: "Asset expense recorded" },
          },
        },
        get: {
          tags: ["Profit"],
          summary: "List asset expense entries",
          parameters: [
            { name: "assetId", in: "query", required: false, schema: { type: "string" } },
            { name: "monthKey", in: "query", required: false, schema: { type: "string" } },
            {
              name: "entryType",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["expense", "adjustment", "reversal"] },
            },
          ],
          responses: {
            200: { description: "Asset expense entries retrieved" },
          },
        },
      },
      "/api/v1/asset-expenses/corrections": {
        post: {
          tags: ["Profit"],
          summary: "Record asset expense correction or reversal",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssetExpenseCorrectionRequest" },
              },
            },
          },
          responses: {
            201: { description: "Asset expense correction recorded" },
          },
        },
      },
      "/api/v1/profit-ledger/adjustments": {
        post: {
          tags: ["Profit"],
          summary: "Create profit ledger adjustment/reversal",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProfitLedgerAdjustmentRequest" },
              },
            },
          },
          responses: {
            201: { description: "Profit ledger adjustment created" },
          },
        },
      },
      "/api/v1/reports/profit-summary": {
        get: {
          tags: ["Reports"],
          summary: "Profit summary report",
          parameters: [
            { name: "assetId", in: "query", required: false, schema: { type: "string" } },
            { name: "monthKey", in: "query", required: false, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Profit summary retrieved" },
          },
        },
      },
    },
    components: {
      schemas: {
        IdentityDocument: {
          type: "object",
          properties: {
            docType: { type: "string", enum: ["NID", "Driving License", "Passport"] },
            docNumber: { type: "string" },
            fileUrl: { type: "string", format: "uri" },
          },
          required: ["docType", "docNumber", "fileUrl"],
        },
        RegisterRequest: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            phone: { type: "string" },
            identityDocuments: {
              type: "array",
              items: { $ref: "#/components/schemas/IdentityDocument" },
            },
          },
          required: ["name", "email", "password", "phone", "identityDocuments"],
        },
        LoginRequest: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
          required: ["email", "password"],
        },
        VerifyOtpRequest: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
            otp: { type: "string", minLength: 6, maxLength: 6 },
          },
          required: ["email", "otp"],
        },
        ResendOtpRequest: {
          type: "object",
          properties: {
            email: { type: "string", format: "email" },
          },
          required: ["email"],
        },
        RefreshTokenRequest: {
          type: "object",
          properties: {
            refreshToken: { type: "string" },
          },
        },
        AdminCreateInvestorRequest: {
          type: "object",
          properties: {
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
            phone: { type: "string" },
            country: { type: "string" },
          },
          required: ["firstName", "lastName", "email", "password"],
        },
        AssetCreateRequest: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            location: { type: "string" },
            totalShares: { type: "integer" },
            sharePrice: { type: "number" },
            totalAssetValue: { type: "number" },
            totalSharePrice: { type: "number" },
            availableShares: { type: "integer" },
            status: { type: "string" },
          },
          required: ["name", "totalShares", "totalAssetValue"],
        },
        AssetUpdateRequest: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            location: { type: "string" },
            totalShares: { type: "integer" },
            sharePrice: { type: "number" },
            totalAssetValue: { type: "number" },
            totalSharePrice: { type: "number" },
            availableShares: { type: "integer" },
            status: { type: "string" },
          },
        },
        ShareAssignRequest: {
          type: "object",
          properties: {
            userId: { type: "string" },
            assignedAt: { type: "string", format: "date-time" },
          },
          required: ["userId"],
        },
        SharePaymentRequest: {
          type: "object",
          properties: {
            amount: { type: "number" },
            paidAt: { type: "string", format: "date-time" },
            userId: { type: "string" },
          },
          required: ["amount"],
        },
        AssetProfitRequest: {
          type: "object",
          properties: {
            assetId: { type: "string" },
            monthKey: { type: "string" },
            amount: { type: "number" },
            currency: { type: "string" },
            type: { type: "string", enum: ["base", "adjustment", "reversal"] },
          },
          required: ["assetId", "monthKey", "amount"],
        },
        AssetProfitAdjustmentRequest: {
          type: "object",
          properties: {
            assetId: { type: "string" },
            monthKey: { type: "string" },
            amount: { type: "number" },
            currency: { type: "string" },
            type: { type: "string", enum: ["adjustment", "reversal"] },
          },
          required: ["assetId", "monthKey", "amount", "type"],
        },
        AssetExpenseLineItemRequest: {
          type: "object",
          properties: {
            itemName: { type: "string" },
            description: { type: "string" },
            quantity: { type: "number" },
            unitCost: { type: "number" },
          },
          required: ["itemName", "quantity", "unitCost"],
        },
        AssetExpenseRequest: {
          type: "object",
          properties: {
            assetId: { type: "string" },
            vendorName: { type: "string" },
            description: { type: "string" },
            expenseDateTime: { type: "string", format: "date-time" },
            lineItems: {
              type: "array",
              items: { $ref: "#/components/schemas/AssetExpenseLineItemRequest" },
            },
            currency: { type: "string" },
          },
          required: ["assetId", "vendorName", "lineItems"],
        },
        AssetExpenseCorrectionRequest: {
          type: "object",
          properties: {
            assetId: { type: "string" },
            vendorName: { type: "string" },
            description: { type: "string" },
            expenseDateTime: { type: "string", format: "date-time" },
            lineItems: {
              type: "array",
              items: { $ref: "#/components/schemas/AssetExpenseLineItemRequest" },
            },
            currency: { type: "string" },
            type: { type: "string", enum: ["adjustment", "reversal"] },
            referenceExpenseId: { type: "string" },
          },
          required: ["assetId", "description", "lineItems", "type"],
        },
        ProfitLedgerAdjustmentRequest: {
          type: "object",
          properties: {
            userId: { type: "string" },
            assetId: { type: "string" },
            shareAccountId: { type: "string" },
            ledgerDate: { type: "string" },
            amount: { type: "number" },
            type: { type: "string", enum: ["adjustment", "reversal"] },
            currency: { type: "string" },
            referenceLedgerId: { type: "string" },
          },
          required: ["userId", "assetId", "shareAccountId", "ledgerDate", "amount", "type"],
        },
      },
    },
  };
};

export const setupSwagger = (app) => {
  const spec = buildSwaggerSpec();
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec));
};
