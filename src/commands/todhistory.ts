import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import { findTimerByMob } from "../helpers/timer.js";
import { formatDateShort } from "../helpers/format.js";
import type { Command } from "./index.js";

export const todHistoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("todhistory")
    .setDescription("Show last 10 TODs recorded for a registered timer")
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

    const tods = await prisma.tod.findMany({
      where: { timerId: timer.id },
      orderBy: { tod: "desc" },
      take: 10,
    });

    const lines: string[] = [];
    lines.push("```");
    lines.push(`Last 10 TODs for ${timer.name}:`);
    lines.push("");

    for (const todRecord of tods) {
      const todDate = new Date(todRecord.tod * 1000);
      lines.push(formatDateShort(todDate));
    }

    lines.push("```");

    await interaction.reply({ content: lines.join("\n"), ephemeral: true });
  },
};
