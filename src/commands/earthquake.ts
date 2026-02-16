import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import {
  TIMER_ALERT_CHANNEL_ID,
  EARTHQUAKE_ALERT_CHANNEL_ID,
  EARTHQUAKE_ALERT_MESSAGE,
} from "../config.js";
import type { Command } from "./index.js";
import prisma from "../db.js";

export const earthquakeCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("earthquake")
    .setDescription(
      "Reset the TOD for ALL timers. Warning: this clears everything!"
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await prisma.timer.updateMany({
      data: {
        lastTod: null,
        alerted: false,
        alertingSoon: false,
        skipCount: 0,
      },
    });

    await interaction.reply("Quake has been registered!");

    // Send alert to timer alert channel
    if (TIMER_ALERT_CHANNEL_ID) {
      try {
        const alertChannel = (await interaction.client.channels.fetch(
          TIMER_ALERT_CHANNEL_ID
        )) as TextChannel;
        if (alertChannel) {
          await alertChannel.send("**QUAKE**");
        }
      } catch {
        // Channel may not be accessible
      }
    }

    // Send alert to earthquake alert channel if configured
    if (EARTHQUAKE_ALERT_CHANNEL_ID) {
      try {
        const quakeChannel = (await interaction.client.channels.fetch(
          EARTHQUAKE_ALERT_CHANNEL_ID
        )) as TextChannel;
        if (quakeChannel) {
          await quakeChannel.send(
            EARTHQUAKE_ALERT_MESSAGE || "QUAKE"
          );
        }
      } catch {
        // Channel may not be accessible
      }
    }
  },
};
