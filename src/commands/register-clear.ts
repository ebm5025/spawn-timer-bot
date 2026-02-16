import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import { findTimerByMob } from "../helpers/timer.js";
import type { Command } from "./index.js";

export const registerClearCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("register_clear")
    .setDescription(
      "Register/unregister a timer to be cleared when another timer's TOD is recorded (toggle)"
    )
    .addStringOption((opt) =>
      opt
        .setName("timer_to_clear")
        .setDescription("Timer that will be cleared")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("trigger_timer")
        .setDescription("Timer whose TOD triggers the clear")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const mob = interaction.options
      .getString("timer_to_clear", true)
      .replace(/`/g, "'");
    const parentMob = interaction.options
      .getString("trigger_timer", true)
      .replace(/`/g, "'");

    const [, foundTimer] = await findTimerByMob(mob);
    const [, parentTimer] = await findTimerByMob(parentMob);

    if (!foundTimer || !parentTimer) {
      await interaction.reply({
        content: `**${mob}** or **${parentMob}** is not a registered timer.`,
        ephemeral: true,
      });
      return;
    }

    if (foundTimer.clearParentTimerId === null) {
      await prisma.timer.update({
        where: { id: foundTimer.id },
        data: { clearParentTimerId: parentTimer.id },
      });
      await interaction.reply({
        content: `**${foundTimer.name}** will be cleared on tod of **${parentTimer.name}**.`,
        ephemeral: true,
      });
    } else {
      await prisma.timer.update({
        where: { id: foundTimer.id },
        data: { clearParentTimerId: null },
      });
      await interaction.reply({
        content: `**${foundTimer.name}** will no longer be cleared on tod of **${parentTimer.name}**.`,
        ephemeral: true,
      });
    }
  },
};
