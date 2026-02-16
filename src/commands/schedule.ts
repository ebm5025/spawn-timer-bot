import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import prisma from "../db.js";
import { nextSpawnTimeStart } from "../helpers/timer.js";
import { formatScheduleDay, formatScheduleTime } from "../helpers/format.js";
import type { Command } from "./index.js";

export const scheduleCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Show a human-readable schedule for the next 7 days"),

  async execute(interaction: ChatInputCommandInteraction) {
    const timers = await prisma.timer.findMany();

    const days = new Map<
      string,
      Array<{ name: string; time: Date }>
    >();

    for (const timer of timers) {
      const nextSpawn = nextSpawnTimeStart(timer);
      if (nextSpawn) {
        const dayKey = nextSpawn.toISOString().split("T")[0];
        if (!days.has(dayKey)) {
          days.set(dayKey, []);
        }
        days.get(dayKey)!.push({ name: timer.name, time: nextSpawn });
      }
    }

    const output: string[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() + i);
      const dayKey = day.toISOString().split("T")[0];

      const dayTimers = days.get(dayKey) ?? [];
      if (dayTimers.length > 0) {
        dayTimers.sort((a, b) => a.time.getTime() - b.time.getTime());
        output.push(`**${formatScheduleDay(day)}**`);
        for (const t of dayTimers) {
          output.push(`${t.name} - ${formatScheduleTime(t.time)}`);
        }
        output.push("");
      }
    }

    if (output.length === 0) {
      output.push("No timers scheduled for the next 7 days.");
    }

    await interaction.reply({
      content: output.join("\n"),
      ephemeral: true,
    });
  },
};
