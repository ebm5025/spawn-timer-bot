import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { findTimerByMob } from "../helpers/timer.js";
import { buildShowMessage } from "../helpers/message.js";
import type { Command } from "./index.js";

export const showCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("show")
    .setDescription("Display configuration about a timer")
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

    const msg = await buildShowMessage(timer);
    await interaction.reply({ content: msg, ephemeral: true });
  },
};
