import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import { findTimerByMob } from "../helpers/timer.js";
import type { Command } from "./index.js";

export const setWarnTimeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("set_warn_time")
    .setDescription(
      "Set how long before a timer expires to send a warning alert. -1 disables warnings."
    )
    .addStringOption((opt) =>
      opt
        .setName("mob")
        .setDescription("Name of the mob/NPC")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("interval")
        .setDescription('Warning interval (e.g. "20 minutes", "-1" to disable)')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");
    const warnTime = interaction.options.getString("interval", true).trim();

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

    await prisma.timer.update({
      where: { id: timer.id },
      data: { warnTime },
    });

    await interaction.reply({
      content: `Alert warn time updated for **${timer.name}**.`,
      ephemeral: true,
    });
  },
};
