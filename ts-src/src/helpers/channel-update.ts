import {
  EmbedBuilder,
  WebhookClient,
  type Client,
  type TextChannel,
} from "discord.js";
import type { Timer } from "@prisma/client";
import prisma from "../db.js";
import {
  TIMER_CHANNEL_WEBHOOK_URL,
  TIMER_CHANNEL_ID,
  USE_DISCORD_TIMESTAMPS,
  SHOW_FUTURE_WINDOW,
  CONDENSE_FUTURE_WINDOW,
} from "../config.js";
import {
  nextSpawnTimeStart,
  nextSpawnTimeEnd,
  inWindow,
  hasWindow,
  displayWindow,
} from "./timer.js";
import { formatTimeDistance } from "./duration.js";
import { getSettingByKey, saveSettingByKey } from "./settings.js";

const MAX_FIELDS_PER_EMBED = 25;
const MAX_DESCRIPTION_LENGTH = 4096;
const MAX_EMBEDS_PER_MESSAGE = 10;

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function chunkDescription(items: string[], separator: string): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const item of items) {
    const candidate = current ? current + separator + item : item;
    if (candidate.length > MAX_DESCRIPTION_LENGTH && current) {
      chunks.push(current);
      current = item;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Update the timer channel with current timer status using webhook embeds.
 */
export async function updateTimersChannel(client: Client): Promise<void> {
  if (!TIMER_CHANNEL_WEBHOOK_URL) return;

  const timers = await prisma.timer.findMany();

  const webhookClient = new WebhookClient({ url: TIMER_CHANNEL_WEBHOOK_URL });

  const now = new Date();
  const farFuture = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);

  // Sort timers by next spawn start time
  const sortedTimers = [...timers].sort((a, b) => {
    const aStart = nextSpawnTimeStart(a) ?? farFuture;
    const bStart = nextSpawnTimeStart(b) ?? farFuture;
    return aStart.getTime() - bStart.getTime();
  });

  const mobsInWindow: Array<{ field: { name: string; value: string }; percent: number }> = [];
  const upcomingWindow: Array<{ name: string; value: string }> = [];
  const futureWindow: string[] = [];

  for (const timer of sortedTimers) {
    if (!timer.lastTod) continue;

    const startsAt = nextSpawnTimeStart(timer);
    const endsAt = nextSpawnTimeEnd(timer);

    if (!startsAt || !endsAt) continue;

    if (inWindow(timer, now)) {
      if (endsAt > now) {
        const perc = (now.getTime() - startsAt.getTime()) / (endsAt.getTime() - startsAt.getTime());
        const numberOfBlocks = 14;
        const num = Math.round(numberOfBlocks * perc);

        let out: string;
        if (USE_DISCORD_TIMESTAMPS) {
          out = `Window ends <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n`;
        } else {
          out = `Remaining: ${formatTimeDistance(endsAt, now)}\n`;
        }

        for (let i = 0; i < numberOfBlocks; i++) {
          out += i >= num ? "\u2b1c" : "\ud83d\udfe9";
        }

        const dw = displayWindow(timer, "long");
        mobsInWindow.push({
          field: {
            name: `${timer.name}${dw ? ` (*${dw}*)` : ""}`,
            value: out,
          },
          percent: perc,
        });
      }
    } else if (startsAt.getTime() <= now.getTime() + 24 * 60 * 60 * 1000) {
      const dw = displayWindow(timer, "long");
      const nameStr = `${timer.name}${hasWindow(timer) && dw ? ` (*${dw}*)` : ""}`;

      if (USE_DISCORD_TIMESTAMPS) {
        upcomingWindow.push({
          name: nameStr,
          value: `Opens <t:${Math.floor(startsAt.getTime() / 1000)}:R>`,
        });
      } else {
        upcomingWindow.push({
          name: nameStr,
          value: `Opens in: ${formatTimeDistance(startsAt, now)}`,
        });
      }
    } else {
      if (CONDENSE_FUTURE_WINDOW) {
        futureWindow.push(
          `**${timer.name}** (<t:${Math.floor(startsAt.getTime() / 1000)}:R>)`
        );
      } else if (USE_DISCORD_TIMESTAMPS) {
        const dw = displayWindow(timer, "long");
        futureWindow.push(
          `**${timer.name}** ${hasWindow(timer) && dw ? `(*${dw}*)` : ""} - <t:${Math.floor(startsAt.getTime() / 1000)}:R>`
        );
      } else {
        const dw = displayWindow(timer, "long");
        futureWindow.push(
          `**${timer.name}** ${hasWindow(timer) && dw ? `(*${dw}*)` : ""} - ${formatTimeDistance(startsAt, now)}`
        );
      }
    }
  }

  // Sort mobs in window by percent descending
  mobsInWindow.sort((a, b) => -(a.percent - b.percent));

  const embeds: EmbedBuilder[] = [];

  const anyInWindow = mobsInWindow.length > 0;

  // In-window embed(s) — split across multiple embeds if >25 fields
  const inWindowFields = mobsInWindow.map((m) => ({
    name: m.field.name,
    value: m.field.value,
  }));
  const inWindowColor = anyInWindow ? 0xe67e22 : 0x2ecc71;
  const inWindowFooter = anyInWindow
    ? `These are currently in window! Be prepared! \u2022 Today at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`
    : `There is currently nothing in window! \u2022 Today at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`;

  if (anyInWindow) {
    const fieldChunks = chunkArray(inWindowFields, MAX_FIELDS_PER_EMBED);
    for (let i = 0; i < fieldChunks.length; i++) {
      const embed = new EmbedBuilder().setColor(inWindowColor).addFields(fieldChunks[i]);
      if (i === 0) embed.setTitle("Mobs In Window");
      if (i === fieldChunks.length - 1) embed.setFooter({ text: inWindowFooter });
      embeds.push(embed);
    }
  } else {
    embeds.push(
      new EmbedBuilder()
        .setColor(inWindowColor)
        .setTitle("Nothing Currently in Window")
        .setFooter({ text: inWindowFooter })
    );
  }

  // Upcoming embed(s) — split across multiple embeds if >25 fields
  if (upcomingWindow.length > 0) {
    const upcomingChunks = chunkArray(upcomingWindow, MAX_FIELDS_PER_EMBED);
    for (let i = 0; i < upcomingChunks.length; i++) {
      const embed = new EmbedBuilder().setColor(0x3498db).addFields(upcomingChunks[i]);
      if (i === 0) embed.setTitle("Mobs Entering Window In The Next 24 Hours");
      embeds.push(embed);
    }
  }

  // Future window embed(s) — split description if >4096 chars
  if (SHOW_FUTURE_WINDOW && futureWindow.length > 0) {
    const separator = CONDENSE_FUTURE_WINDOW ? ", " : "\n";
    const descChunks = chunkDescription(futureWindow, separator);
    for (let i = 0; i < descChunks.length; i++) {
      const embed = new EmbedBuilder().setDescription(descChunks[i]);
      if (i === 0) embed.setTitle("Future Windows");
      embeds.push(embed);
    }
  }

  // Discord allows at most 10 embeds per message
  embeds.splice(MAX_EMBEDS_PER_MESSAGE);

  // Send or update the webhook message
  const webhookMessageId = await getSettingByKey("webhook_message_id");

  try {
    if (!webhookMessageId) {
      const result = await webhookClient.send({ embeds });
      await saveSettingByKey("webhook_message_id", result.id);
    } else {
      try {
        await webhookClient.editMessage(webhookMessageId, { embeds });
      } catch (err: any) {
        if (err?.status === 404 || err?.message?.includes("404")) {
          const result = await webhookClient.send({ embeds });
          await saveSettingByKey("webhook_message_id", result.id);
        } else {
          throw err;
        }
      }
    }
  } catch (err) {
    console.error("Error updating timer channel:", err);
  }

  webhookClient.destroy();
}
