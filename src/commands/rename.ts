import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import type { Command } from "./index.js";

export const renameCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("rename")
    .setDescription("Rename an existing timer")
    .addStringOption((opt) =>
      opt
        .setName("mob")
        .setDescription("Current name of the mob/NPC")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("new_name")
        .setDescription("New name for the timer")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const mob = interaction.options.getString("mob", true);
    const newName = interaction.options.getString("new_name", true).replace(/`/g, "'");

    const timer = await prisma.timer.findFirst({
      where: { name: { equals: mob, mode: "insensitive" } },
    });

    if (!timer) {
      await interaction.reply({
        content: `No timer registered for **${mob}**.`,
        ephemeral: true,
      });
      return;
    }

    await prisma.timer.update({
      where: { id: timer.id },
      data: { name: newName },
    });

    await interaction.reply({
      content: `Timer for **${mob}** has been renamed to **${newName}**.`,
      ephemeral: true,
    });
  },
};
