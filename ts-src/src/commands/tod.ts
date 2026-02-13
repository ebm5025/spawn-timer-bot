import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import {
  findTimerByMob,
  hasWindow,
  nextSpawnTimeStart,
  nextSpawnTimeEnd,
  lastSpawnTimeStart,
} from "../helpers/timer.js";
import { parseTime } from "../parsers/time-parser.js";
import { formatDateFull } from "../helpers/format.js";
import type { Command } from "./index.js";

export const todCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("tod")
    .setDescription("Record a time of death for a registered timer")
    .addStringOption((opt) =>
      opt
        .setName("mob")
        .setDescription("Name of the mob/NPC")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("time")
        .setDescription('Time of death (e.g. "10 hours ago", "-20", "May 26 12pm"). Defaults to now.')
        .setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("skip_count")
        .setDescription("Set skip count for this TOD")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const mob = interaction.options.getString("mob", true).replace(/`/g, "'");
    const timeStr = interaction.options.getString("time");
    const skipCountArg = interaction.options.getInteger("skip_count");

    const now = new Date();

    const tod = timeStr ? parseTime(timeStr, now) : now;

    if (!tod) {
      await interaction.reply({
        content: "Unable to record that time of death. Please try again.",
        ephemeral: true,
      });
      return;
    }

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

    // Handle skip count
    if (skipCountArg && skipCountArg > 0) {
      await prisma.timer.update({
        where: { id: timer.id },
        data: { skipCount: skipCountArg },
      });
      timer.skipCount = skipCountArg;
    } else {
      timer.skipCount = 0;
    }

    const todEpoch = tod.getTime() / 1000;

    // Validation: future dates
    if (tod > now) {
      await interaction.reply({
        content: "Time of death unable to be recorded due to time in the future.",
        ephemeral: true,
      });
      return;
    }

    // Validation: out of window (for timers with windows)
    const lastSpawn = lastSpawnTimeStart(timer, todEpoch);
    const nextSpawnStart = nextSpawnTimeStart(timer, todEpoch);
    const nextSpawnEnd = nextSpawnTimeEnd(timer, todEpoch);

    if (
      hasWindow(timer) &&
      nextSpawnStart &&
      nextSpawnEnd &&
      (now < lastSpawn! || nextSpawnEnd < now)
    ) {
      await interaction.reply({
        content: "Current time is outside of potential window and would have expired by now. Please try again.",
        ephemeral: true,
      });
      return;
    }

    if (!hasWindow(timer) && lastSpawn && timeStr && tod < lastSpawn) {
      await interaction.reply({
        content: "Time of death is older than potential spawn timer. Please try again.",
        ephemeral: true,
      });
      return;
    }

    // Record the TOD
    await prisma.timer.update({
      where: { id: timer.id },
      data: {
        lastTod: todEpoch,
        alerted: null,
        alertingSoon: false,
        skipCount: skipCountArg && skipCountArg > 0 ? skipCountArg : 0,
      },
    });

    await prisma.tod.create({
      data: {
        timerId: timer.id,
        userId: interaction.user.id,
        username: interaction.user.username,
        displayName: interaction.user.displayName,
        tod: todEpoch,
      },
    });

    const todTimerNames = [timer.name];

    // Handle linked timers
    const linkedTimers = await prisma.timer.findMany({
      where: { linkedTimerId: timer.id },
    });

    for (const linkedTimer of linkedTimers) {
      todTimerNames.push(linkedTimer.name);

      await prisma.timer.update({
        where: { id: linkedTimer.id },
        data: {
          lastTod: todEpoch,
          alerted: null,
          alertingSoon: false,
        },
      });

      await prisma.tod.create({
        data: {
          timerId: linkedTimer.id,
          userId: interaction.user.id,
          username: interaction.user.username,
          displayName: interaction.user.displayName,
          tod: todEpoch,
        },
      });
    }

    // Handle clear timers
    const clearTimers = await prisma.timer.findMany({
      where: { clearParentTimerId: timer.id },
    });

    for (const clearTimer of clearTimers) {
      await prisma.timer.update({
        where: { id: clearTimer.id },
        data: {
          lastTod: null,
          alerted: null,
          alertingSoon: false,
        },
      });
    }

    await interaction.reply({
      content: `Time of death for **${todTimerNames.join(", ")}** recorded as ${formatDateFull(tod)}!`,
      ephemeral: true,
    });
  },
};
