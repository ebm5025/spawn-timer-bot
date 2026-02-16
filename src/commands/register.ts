import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import { parseDuration } from "../helpers/duration.js";
import { buildShowMessage } from "../helpers/message.js";
import type { Command } from "./index.js";

export const registerCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register a new spawn timer to track")
    .addStringOption((opt) =>
      opt
        .setName("mob")
        .setDescription("Name of the mob/NPC")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("window_start")
        .setDescription('Respawn time or window start (e.g. "1 day", "18 hours")')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("window_end")
        .setDescription('Window end time (e.g. "7 days")')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("variance")
        .setDescription('Variance/jitter (e.g. "8 hours", "10 minutes")')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");
    const windowStart = interaction.options.getString("window_start", true).trim();
    const windowEnd = interaction.options.getString("window_end")?.trim() ?? null;
    const variance = interaction.options.getString("variance")?.trim() ?? null;

    // Validate formats
    if (!windowStart.match(/^\d/) || parseDuration(windowStart) === null) {
      await interaction.reply({
        content: `Window Start/Spawn time [${windowStart}] is an invalid format. Please use something like '8 hours' or '6 minutes'.`,
        ephemeral: true,
      });
      return;
    }

    if (windowEnd && (!windowEnd.match(/^\d/) || parseDuration(windowEnd) === null)) {
      await interaction.reply({
        content: `Window End [${windowEnd}] is an invalid format. Please use something like '8 hours' or '6 minutes'.`,
        ephemeral: true,
      });
      return;
    }

    if (variance && (!variance.match(/^\d/) || parseDuration(variance) === null)) {
      await interaction.reply({
        content: `Variance [${variance}] is an invalid format. Please use something like '8 hours' or '6 minutes'.`,
        ephemeral: true,
      });
      return;
    }

    // Upsert the timer
    let timer = await prisma.timer.findFirst({
      where: { name: { equals: mob, mode: "insensitive" } },
    });

    if (timer) {
      timer = await prisma.timer.update({
        where: { id: timer.id },
        data: {
          name: mob,
          windowStart,
          windowEnd,
          variance,
          skipCount: 0,
        },
      });
    } else {
      timer = await prisma.timer.create({
        data: {
          name: mob,
          windowStart,
          windowEnd,
          variance,
          skipCount: 0,
        },
      });
    }

    let windowDesc = windowEnd
      ? `with window between ${windowStart} and ${windowEnd}`
      : `with respawn time of ${windowStart}`;

    if (variance) {
      windowDesc += ` with variance of ${variance}`;
    }

    const showMsg = await buildShowMessage(timer);
    await interaction.reply({
      content: `Timer for **${mob}** ${windowDesc} registered!\n${showMsg}`,
      ephemeral: true,
    });
  },
};
