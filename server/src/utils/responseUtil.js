import { v4 as uuidv4 } from "uuid";
import path from "path";

export const attachRequestId = (req, res, next) => {
  if (!req.requestId) req.requestId = uuidv4();
  next();
};

export const globalResponse = (req, res, next) => {
  res.success = ({
    data = null,
    message = "Success",
    statusCode = 200,
    pagination = null,
  } = {}) => {
    const response = {
      success: true,
      statusCode,
      message,
      data,
      ...(pagination ? { pagination } : {}),
      request: {
        method: req.method,
        url: req.originalUrl,
        ...(process.env.NODE_ENV !== "production" ? { ip: req.ip } : {}),
        requestId: req.requestId || null,
      },
    };
    res.status(statusCode).json(response);
  };

  res.error = ({
    message = "Something went wrong",
    statusCode = 400,
    data = null,
    trace = null,
  } = {}) => {
    if (!trace && req.lastError instanceof Error) {
      trace = req.lastError;
    }

    let errorTrace = null;

    if (trace instanceof Error) {
      if (process.env.NODE_ENV !== "production" && trace.stack) {
        const stackLines = trace.stack.split("\n").slice(1);
        errorTrace = stackLines.map((line) => {
          const match = line.match(/\((.*):(\d+):(\d+)\)/);
          if (match) {
            const [_, filePath, lineNum, colNum] = match;
            return {
              file: path.relative(process.cwd(), filePath),
              line: parseInt(lineNum, 10),
              column: parseInt(colNum, 10),
              description: `${trace.name}: ${trace.message}`,
            };
          }
          return { raw: line.trim(), description: `${trace.name}: ${trace.message}` };
        });
      } else {
        errorTrace = { name: trace.name, message: trace.message };
      }
    } else if (trace && typeof trace === "object") {
      errorTrace = trace;
    } else if (typeof trace === "string") {
      errorTrace = { message: trace };
    }

    const response = {
      success: false,
      statusCode,
      message,
      data,
      ...(errorTrace ? { trace: errorTrace } : {}),
      request: {
        method: req.method,
        url: req.originalUrl,
        ...(process.env.NODE_ENV !== "production" ? { ip: req.ip } : {}),
        requestId: req.requestId || null,
      },
    };

    res.status(statusCode).json(response);
  };

  next();
};
