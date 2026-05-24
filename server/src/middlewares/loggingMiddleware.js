import morgan from "morgan";
import { logger } from "#utils/logger.js";

morgan.token("id", (req) => req.requestId || "-");

export const requestLogger = morgan(
  ":remote-addr :method :url :status :res[content-length] - :response-time ms :id",
  {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }
);
