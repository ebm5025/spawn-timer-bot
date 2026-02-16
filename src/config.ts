import dotenv from "dotenv";

dotenv.config();

export const TOKEN = process.env.TOKEN ?? "";
export const CLIENT_ID = process.env.CLIENT_ID ?? "";
export const BOT_NAME = process.env.BOT_NAME ?? "SpawnTimerBot";

export const DATABASE_URL = process.env.DATABASE_URL ?? "";

export const COMMAND_CHANNEL_ID = process.env.TIMER_COMMAND_CHANNEL_ID ?? "";
export const TIMER_CHANNEL_ID = process.env.TIMER_CHANNEL_ID ?? "";
export const TIMER_ALERT_CHANNEL_ID = process.env.TIMER_ALERT_CHANNEL_ID ?? "";
export const TIMER_CHANNEL_WEBHOOK_URL =
  process.env.TIMER_CHANNEL_WEBHOOK_URL ?? "";

export const TIMER_CHANNEL_REFRESH_RATE = parseInt(
  process.env.TIMER_CHANNEL_REFRESH_RATE ?? "10",
  10
);
export const TIMER_ALERT_CHANNEL_REFRESH_RATE = parseInt(
  process.env.TIMER_ALERT_CHANNEL_REFRESH_RATE ?? "1",
  10
);

export const USE_EVERYONE_ALERT =
  process.env.USE_EVERYONE_ALERT === "true";
export const USE_DISCORD_TIMESTAMPS =
  process.env.USE_DISCORD_TIMESTAMPS === "true";
export const SHOW_FUTURE_WINDOW =
  process.env.SHOW_FUTURE_WINDOW === "true";
export const CONDENSE_FUTURE_WINDOW =
  process.env.CONDENSE_FUTURE_WINDOW === "true";

export const EARTHQUAKE_ALERT_CHANNEL_ID =
  process.env.EARTHQUAKE_ALERT_CHANNEL_ID ?? "";
export const EARTHQUAKE_ALERT_MESSAGE =
  process.env.EARTHQUAKE_ALERT_MESSAGE ?? "";

export const TZ = process.env.TZ ?? "America/New_York";
