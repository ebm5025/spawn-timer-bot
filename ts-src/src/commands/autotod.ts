import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import { findTimerByMob, hasWindow } from "../helpers/timer.js";
import type { Command } from "./index.js";

export const autotodCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("autotod")
    .setDescription(
      "Enable/disable automatic TOD when a timer expires (no-window timers only)"
    )
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

    if (hasWindow(timer)) {
      await interaction.reply({
        content:
          "Auto timer only allowed on timers that do not have a window or variance!",
        ephemeral: true,
      });
      return;
    }

    const newAutoTod = !timer.autoTod;
    await prisma.timer.update({
      where: { id: timer.id },
      data: { autoTod: newAutoTod },
    });

    await interaction.reply({
      content: `Auto timer ${newAutoTod ? "enabled" : "disabled"} for **${timer.name}**!`,
      ephemeral: true,
    });
  },
};
