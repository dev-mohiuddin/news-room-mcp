/**
 * Custom error classes for the article generation pipeline.
 * Carry an HTTP-friendly statusCode + a stable error code that the
 * frontend can branch on.
 */

class BasePipelineError extends Error {
  constructor(message, { code, statusCode = 500, details = null } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    if (details) this.details = details;
  }
}

export class StatusTransitionRaceError extends BasePipelineError {
  constructor(message = "Status transition lost a race") {
    super(message, { code: "STATUS_TRANSITION_RACE", statusCode: 409 });
  }
}

export class InvalidStatusTransitionError extends BasePipelineError {
  constructor(from, to) {
    super(`Invalid transition: ${from} → ${to}`, {
      code: "INVALID_STATUS_TRANSITION",
      statusCode: 400,
      details: { from, to },
    });
  }
}

export class MissingTenantScopeError extends BasePipelineError {
  constructor(method) {
    super(`Repository method '${method}' was called without a workspaceId`, {
      code: "MISSING_TENANT_SCOPE",
      statusCode: 500,
    });
  }
}

export class SubscriptionMissingError extends BasePipelineError {
  constructor(workspaceId) {
    super(`No subscription document found for workspace ${workspaceId}`, {
      code: "SUBSCRIPTION_MISSING",
      statusCode: 500,
    });
  }
}

export class QuotaExceededError extends BasePipelineError {
  constructor(details) {
    super("Monthly article limit reached for this workspace", {
      code: "QUOTA_EXCEEDED",
      statusCode: 402,
      details,
    });
  }
}

export class OriginalityProviderError extends BasePipelineError {
  constructor(message = "Originality provider unavailable", details = null) {
    super(message, {
      code: "ORIGINALITY_PROVIDER_ERROR",
      statusCode: 502,
      details,
    });
  }
}
