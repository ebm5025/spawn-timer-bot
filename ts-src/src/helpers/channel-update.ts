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

  // In-window embed
  const inWindowEmbed = new EmbedBuilder()
    .setColor(anyInWindow ? 0xe67e22 : 0x2ecc71)
    .setTitle(anyInWindow ? "Mobs In Window" : "Nothing Currently in Window")
    .setFooter({
      text: anyInWindow
        ? `These are currently in window! Be prepared! \u2022 Today at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`
        : `There is currently nothing in window! \u2022 Today at ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}`,
    });

  if (anyInWindow) {
    inWindowEmbed.addFields(
      mobsInWindow.map((m) => ({
        name: m.field.name,
        value: m.field.value,
      }))
    );
  }
  embeds.push(inWindowEmbed);

  // Upcoming embed
  if (upcomingWindow.length > 0) {
    const upcomingEmbed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("Mobs Entering Window In The Next 24 Hours")
      .addFields(upcomingWindow);
    embeds.push(upcomingEmbed);
  }

  // Future window embed
  if (SHOW_FUTURE_WINDOW && futureWindow.length > 0) {
    const futureEmbed = new EmbedBuilder()
      .setTitle("Future Windows")
      .setDescription(
        CONDENSE_FUTURE_WINDOW
          ? futureWindow.join(", ")
          : futureWindow.join("\n")
      );
    embeds.push(futureEmbed);
  }

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
