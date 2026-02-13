import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import { findTimerByMob, nextSpawnTimeEnd } from "../helpers/timer.js";
import type { Command } from "./index.js";

export const skipCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Record a skipped spawn for a registered timer")
    .addStringOption((opt) =>
      opt
        .setName("mob")
        .setDescription("Name of the mob/NPC")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");
    const [timers, foundTimer] = await findTimerByMob(mob);

    if (timers.length > 1 && !foundTimer) {
      await interaction.reply({
        content: `Request returned multiple results, please be more specific:\n${timers.map((t) => `\`${t.name}\``).join("\n")}`,
        ephemeral: true,
      });
      return;
    }

    const timer = foundTimer ?? timers[0];
    if (!timer) {
      await interaction.reply({
        content: `No timer registered for **${mob}**.`,
        ephemeral: true,
      });
      return;
    }

    if (!timer.lastTod) {
      await interaction.reply({
        content: `Timer **${timer.name}** has no TOD recorded to skip!`,
        ephemeral: true,
      });
      return;
    }

    const endsAt = nextSpawnTimeEnd(timer);
    if (!endsAt || new Date() < endsAt) {
      await interaction.reply({
        content: `Timer **${timer.name}** has not expired yet. Unable to skip.`,
        ephemeral: true,
      });
      return;
    }

    await prisma.timer.update({
      where: { id: timer.id },
      data: { skipCount: (timer.skipCount ?? 0) + 1 },
    });

    await interaction.reply({
      content: `Skip recorded for **${timer.name}**! Updating window.`,
      ephemeral: true,
    });
  },
};
