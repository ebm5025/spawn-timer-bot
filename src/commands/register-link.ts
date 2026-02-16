import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import { findTimerByMob } from "../helpers/timer.js";
import type { Command } from "./index.js";

export const registerLinkCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("register_link")
    .setDescription(
      "Link a timer to auto-set TOD when another timer's TOD is set (toggle)"
    )
    .addStringOption((opt) =>
      opt
        .setName("timer")
        .setDescription("Timer to link (will get auto-TOD)")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("link_to")
        .setDescription("Timer to link to (the parent)")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const linkedMob = interaction.options.getString("timer", true).replace(/`/g, "'");
    const mob = interaction.options.getString("link_to", true).replace(/`/g, "'");

    const [, foundTimer] = await findTimerByMob(mob);
    const [, foundLinkedTimer] = await findTimerByMob(linkedMob);

    if (!foundTimer || !foundLinkedTimer) {
      await interaction.reply({
        content: `**${mob}** or **${linkedMob}** is not a registered timer.`,
        ephemeral: true,
      });
      return;
    }

    if (foundLinkedTimer.linkedTimerId === null) {
      await prisma.timer.update({
        where: { id: foundLinkedTimer.id },
        data: { linkedTimerId: foundTimer.id },
      });
      await interaction.reply({
        content: `**${foundLinkedTimer.name}** has been linked to **${foundTimer.name}**.`,
        ephemeral: true,
      });
    } else {
      await prisma.timer.update({
        where: { id: foundLinkedTimer.id },
        data: { linkedTimerId: null },
      });
      await interaction.reply({
        content: `**${foundLinkedTimer.name}** has been unlinked from **${foundTimer.name}**.`,
        ephemeral: true,
      });
    }
  },
};
