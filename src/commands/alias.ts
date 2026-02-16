import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import { findTimerByMob } from "../helpers/timer.js";
import type { Command } from "./index.js";

export const aliasCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("alias")
    .setDescription("Add or remove an alias on a timer")
    .addStringOption((opt) =>
      opt
        .setName("mob")
        .setDescription("Name of the mob/NPC")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("alias")
        .setDescription("The alias to add or remove")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");
    const aliasValue = interaction.options.getString("alias", true).trim();

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

    // Check if alias already exists - toggle it
    const existingAlias = await prisma.alias.findFirst({
      where: { timerId: timer.id, name: aliasValue },
    });

    if (existingAlias) {
      await prisma.alias.delete({ where: { id: existingAlias.id } });
      await interaction.reply({
        content: `Alias of **${aliasValue}** removed from timer **${timer.name}**!`,
        ephemeral: true,
      });
    } else {
      await prisma.alias.create({
        data: { timerId: timer.id, name: aliasValue },
      });
      await interaction.reply({
        content: `Alias of **${aliasValue}** added to timer **${timer.name}**!`,
        ephemeral: true,
      });
    }
  },
};
