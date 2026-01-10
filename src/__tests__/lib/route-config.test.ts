/**
 * route-config Tests
 *
 * Q4: Tests for the error handling utilities created in Q3
 */

import {
  toError,
  createErrorResponse,
  jsonRouteConfig,
  fileUploadRouteConfig,
  contentGenerationRouteConfig,
  webhookRouteConfig,
  readOnlyRouteConfig,
  ROUTE_SIZE_LIMITS,
  createRouteConfig,
} from "@/lib/api/route-config";

describe("toError", () => {
  it("should return the same Error if passed an Error", () => {
    const originalError = new Error("Original error");
    const result = toError(originalError);

    expect(result).toBe(originalError);
    expect(result.message).toBe("Original error");
  });

  it("should convert string to Error", () => {
    const result = toError("String error message");

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("String error message");
  });

  it("should convert number to Error", () => {
    const result = toError(404);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("404");
  });

  it("should convert null to Error", () => {
    const result = toError(null);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("null");
  });

  it("should convert undefined to Error", () => {
    const result = toError(undefined);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("undefined");
  });

  it("should convert object to Error", () => {
    const result = toError({ code: "ERR_001", message: "Custom error" });

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('[object Object]');
  });

  it("should handle objects with toString", () => {
    const customObject = {
      toString() {
        return "Custom string representation";
      },
    };
    const result = toError(customObject);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("Custom string representation");
  });
});

describe("createErrorResponse", () => {
  it("should create error response from Error", () => {
    const error = new Error("Something went wrong");
    const result = createErrorResponse(error);

    expect(result).toEqual({
      error: "Something went wrong",
    });
  });

  it("should create error response from string", () => {
    const result = createErrorResponse("String error");

    expect(result).toEqual({
      error: "String error",
    });
  });

  it("should use default message when error message is empty", () => {
    const error = new Error("");
    const result = createErrorResponse(error);

    expect(result).toEqual({
      error: "Internal Server Error",
    });
  });

  it("should use custom default message", () => {
    const error = new Error("");
    const result = createErrorResponse(error, "Custom default message");

    expect(result).toEqual({
      error: "Custom default message",
    });
  });
});

describe("Route Configs", () => {
  describe("jsonRouteConfig", () => {
    it("should have correct size limit", () => {
      expect(jsonRouteConfig.api.bodyParser.sizeLimit).toBe("1mb");
    });

    it("should have correct maxDuration", () => {
      expect(jsonRouteConfig.maxDuration).toBe(30);
    });
  });

  describe("fileUploadRouteConfig", () => {
    it("should have correct size limit", () => {
      expect(fileUploadRouteConfig.api.bodyParser.sizeLimit).toBe("10mb");
    });

    it("should have extended maxDuration", () => {
      expect(fileUploadRouteConfig.maxDuration).toBe(60);
    });
  });

  describe("contentGenerationRouteConfig", () => {
    it("should have correct size limit", () => {
      expect(contentGenerationRouteConfig.api.bodyParser.sizeLimit).toBe("2mb");
    });

    it("should have extended maxDuration for AI calls", () => {
      expect(contentGenerationRouteConfig.maxDuration).toBe(120);
    });
  });

  describe("webhookRouteConfig", () => {
    it("should have correct size limit", () => {
      expect(webhookRouteConfig.api.bodyParser.sizeLimit).toBe("5mb");
    });

    it("should have correct maxDuration", () => {
      expect(webhookRouteConfig.maxDuration).toBe(60);
    });
  });

  describe("readOnlyRouteConfig", () => {
    it("should have minimal size limit", () => {
      expect(readOnlyRouteConfig.api.bodyParser.sizeLimit).toBe("100kb");
    });

    it("should have short maxDuration", () => {
      expect(readOnlyRouteConfig.maxDuration).toBe(15);
    });
  });
});

describe("ROUTE_SIZE_LIMITS", () => {
  it("should export correct size limits", () => {
    expect(ROUTE_SIZE_LIMITS.JSON_DEFAULT).toBe("1mb");
    expect(ROUTE_SIZE_LIMITS.FILE_UPLOAD).toBe("10mb");
    expect(ROUTE_SIZE_LIMITS.CONTENT_GENERATION).toBe("2mb");
    expect(ROUTE_SIZE_LIMITS.WEBHOOK).toBe("5mb");
    expect(ROUTE_SIZE_LIMITS.READ_ONLY).toBe("100kb");
  });
});

describe("createRouteConfig", () => {
  it("should create config with default values", () => {
    const config = createRouteConfig({});

    expect(config.api.bodyParser.sizeLimit).toBe("1mb");
    expect(config.maxDuration).toBe(30);
  });

  it("should create config with custom size limit", () => {
    const config = createRouteConfig({ sizeLimit: "5mb" });

    expect(config.api.bodyParser.sizeLimit).toBe("5mb");
    expect(config.maxDuration).toBe(30);
  });

  it("should create config with custom maxDuration", () => {
    const config = createRouteConfig({ maxDuration: 90 });

    expect(config.api.bodyParser.sizeLimit).toBe("1mb");
    expect(config.maxDuration).toBe(90);
  });

  it("should create config with all custom values", () => {
    const config = createRouteConfig({
      sizeLimit: "3mb",
      maxDuration: 45,
    });

    expect(config.api.bodyParser.sizeLimit).toBe("3mb");
    expect(config.maxDuration).toBe(45);
  });
});
