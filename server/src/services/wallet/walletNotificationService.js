import { emitToUser } from "#socket/server.js";
import { logger } from "#utils/logger.js";

const SEND_WALLET_EMAIL = process.env.WALLET_NOTIFY_EMAIL === "true";
const SEND_WALLET_SMS = process.env.WALLET_NOTIFY_SMS === "true";
const SEND_WALLET_OTP = process.env.WALLET_NOTIFY_OTP === "true";

const logDeferredNotifier = (channel, payload) => {
  // Out-of-band channels are intentionally scaffold-only for now.
  logger.info("wallet.notification.%s.deferred", channel, payload);
};

export const notifyWalletSocket = (userId, event, payload) => {
  emitToUser(userId, event, payload);
};

export const notifyWalletOutOfBand = ({ userId, channel, template, payload }) => {
  if (SEND_WALLET_EMAIL) {
    logDeferredNotifier("email", { userId, channel, template, payload });
  }

  if (SEND_WALLET_SMS) {
    logDeferredNotifier("sms", { userId, channel, template, payload });
  }

  if (SEND_WALLET_OTP) {
    logDeferredNotifier("otp", { userId, channel, template, payload });
  }
};
