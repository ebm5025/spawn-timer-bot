import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import type { Command } from "./index.js";

export const unlinkCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("unlink")
    .setDescription("Remove a link from a timer")
    .addStringOption((opt) =>
      opt
        .setName("mob")
        .setDescription("Name of the timer to remove the link from")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");

    const timer = await prisma.timer.findFirst({
      where: { name: { equals: mob, mode: "insensitive" } },
    });

    if (!timer) {
      await interaction.reply({
        content: `**${mob}** is not a registered timer.`,
        ephemeral: true,
      });
      return;
    }

    if (!timer.linkedTimerId) {
      await interaction.reply({
        content: `**${timer.name}** does not have a linked timer.`,
        ephemeral: true,
      });
      return;
    }

    const linkedTimer = await prisma.timer.findUnique({
      where: { id: timer.linkedTimerId },
    });

    await prisma.timer.update({
      where: { id: timer.id },
      data: { linkedTimerId: null },
    });

    await interaction.reply({
      content: `Link for **${mob}** to **${linkedTimer?.name ?? "unknown"}** has been removed.`,
      ephemeral: true,
    });
  },
};
