import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import { findTimerByMob } from "../helpers/timer.js";
import type { Command } from "./index.js";

export const unregisterCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("unregister")
    .setDescription("Remove a previously registered timer")
    .addStringOption((opt) =>
      opt
        .setName("mob")
        .setDescription("Name of the mob/NPC to unregister")
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

    if (foundTimer) {
      await prisma.tod.deleteMany({ where: { timerId: foundTimer.id } });
      await prisma.alias.deleteMany({ where: { timerId: foundTimer.id } });
      await prisma.timer.delete({ where: { id: foundTimer.id } });
      await interaction.reply({
        content: `Registered timer for [${foundTimer.name}] removed.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `No timer registered for **${mob}**.`,
        ephemeral: true,
      });
    }
  },
};
