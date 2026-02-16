import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import type { Command } from "./index.js";

export const timersCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("timers")
    .setDescription("List all registered timers"),

  async execute(interaction: ChatInputCommandInteraction) {
    const timers = await prisma.timer.findMany({
      where: { name: { not: "" } },
      orderBy: { name: "asc" },
    });

    const names = timers.map((t) => t.name);

    const timersString =
      names.length > 0 ? names.join("\n") : "No timers registered.";

    const content =
      timersString.length > 1950
        ? timersString.slice(0, 1947) + "..."
        : timersString;

    const lines: string[] = [];
    lines.push("```");
    lines.push("Currently registered timers:");
    lines.push("");
    lines.push(content);
    lines.push("```");

    await interaction.reply({ content: lines.join("\n"), ephemeral: true });
  },
};
