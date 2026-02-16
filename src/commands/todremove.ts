import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import { findTimerByMob } from "../helpers/timer.js";
import type { Command } from "./index.js";

export const todRemoveCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("todremove")
    .setDescription("Remove the current time of death for a registered timer")
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

    await prisma.timer.update({
      where: { id: timer.id },
      data: {
        lastTod: null,
        alertingSoon: false,
        alerted: null,
        skipCount: 0,
      },
    });

    await interaction.reply({
      content: `Time of death removed for **${timer.name}**!`,
      ephemeral: true,
    });
  },
};
