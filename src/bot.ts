import {
  Client,
  Events,
  GatewayIntentBits,
  type TextChannel,
} from "discord.js";
import {
  TOKEN,
  TIMER_ALERT_CHANNEL_ID,
  TIMER_CHANNEL_REFRESH_RATE,
  TIMER_ALERT_CHANNEL_REFRESH_RATE,
  USE_EVERYONE_ALERT,
} from "./config.js";
import { commands } from "./commands/index.js";
import prisma from "./db.js";
import {
  inWindow,
  alertingSoon,
  pastPossibleSpawnTime,
  hasWindow,
  nextSpawnTimeStart,
  nextSpawnTimeEnd,
} from "./helpers/timer.js";
import { formatTimeDistance } from "./helpers/duration.js";
import { updateTimersChannel } from "./helpers/channel-update.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    console.error(`Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing /${interaction.commandName}:`, error);
    const reply = {
      content: "There was an error while executing this command!",
      ephemeral: true,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Timer tracking state
let lastTimerUpdate: Date | null = null;
let lastAlertUpdate: Date | null = null;
let sendTimerChannelUpdate = true;

/**
 * Main timer monitoring loop.
 * Checks timer windows, sends alerts, and updates the timer channel.
 */
async function timerLoop(): Promise<void> {
  const now = new Date();

  // Check if we should update alerts
  const shouldCheckAlerts =
    !lastAlertUpdate ||
    now.getTime() >= lastAlertUpdate.getTime() + TIMER_ALERT_CHANNEL_REFRESH_RATE * 1000;

  // Check if we should update the timer channel
  const shouldUpdateChannel =
    !lastTimerUpdate ||
    now.getTime() >= lastTimerUpdate.getTime() + TIMER_CHANNEL_REFRESH_RATE * 1000;

  if (shouldUpdateChannel) {
    lastTimerUpdate = now;
    sendTimerChannelUpdate = true;
  }

  if (shouldCheckAlerts) {
    lastAlertUpdate = now;

    try {
      const timers = await prisma.timer.findMany();
      const everyoneAlert = USE_EVERYONE_ALERT ? "@everyone " : "";

      for (const timer of timers) {
        let canAutoTod = false;
        let saveTimer = false;
        const updates: Record<string, any> = {};

        if (!timer.alerted) {
          const nextSpawnEnd = nextSpawnTimeEnd(timer);

          if (inWindow(timer, now)) {
            if (hasWindow(timer)) {
              // Has window - show "in window" message
              if (TIMER_ALERT_CHANNEL_ID) {
                try {
                  const channel = (await client.channels.fetch(
                    TIMER_ALERT_CHANNEL_ID
                  )) as TextChannel;
                  if (channel && nextSpawnEnd) {
                    await channel.send(
                      `${everyoneAlert}**${timer.name}** is in window for ${formatTimeDistance(nextSpawnEnd, now)}!`
                    );
                  }
                } catch {
                  // Channel may not be accessible
                }
              }
            } else {
              // No window - timer is up
              if (TIMER_ALERT_CHANNEL_ID) {
                try {
                  const channel = (await client.channels.fetch(
                    TIMER_ALERT_CHANNEL_ID
                  )) as TextChannel;
                  if (channel) {
                    await channel.send(
                      `${everyoneAlert}**${timer.name}** timer is up!`
                    );
                  }
                } catch {
                  // Channel may not be accessible
                }
              }
              canAutoTod = true;
            }
            updates.alerted = true;
            saveTimer = true;
          } else if (
            alertingSoon(timer, now) &&
            !timer.alertingSoon
          ) {
            if (timer.warnTime !== "-1") {
              const nextSpawnStart = nextSpawnTimeStart(timer);
              if (TIMER_ALERT_CHANNEL_ID && nextSpawnStart) {
                try {
                  const channel = (await client.channels.fetch(
                    TIMER_ALERT_CHANNEL_ID
                  )) as TextChannel;
                  if (channel) {
                    if (hasWindow(timer)) {
                      await channel.send(
                        `${everyoneAlert}**${timer.name}** will be in window in ${formatTimeDistance(nextSpawnStart, now)}!`
                      );
                    } else {
                      await channel.send(
                        `${everyoneAlert}**${timer.name}** is up in ${formatTimeDistance(nextSpawnStart, now)}!`
                      );
                    }
                  }
                } catch {
                  // Channel may not be accessible
                }
              }
            }
            updates.alertingSoon = true;
            saveTimer = true;
          }
        }

        if (pastPossibleSpawnTime(timer, now)) {
          updates.alerted = null;
          updates.alertingSoon = false;
          updates.lastTod = null;
          saveTimer = true;
        }

        if (saveTimer) {
          if (canAutoTod && timer.autoTod) {
            const todEpoch = now.getTime() / 1000;
            updates.lastTod = todEpoch;
            updates.alerted = null;
            updates.alertingSoon = false;
            updates.skipCount = 0;

            await prisma.tod.create({
              data: {
                timerId: timer.id,
                tod: todEpoch,
              },
            });
          }

          await prisma.timer.update({
            where: { id: timer.id },
            data: updates,
          });

          sendTimerChannelUpdate = true;
        }
      }
    } catch (err) {
      console.error("Error in timer alert loop:", err);
    }
  }

  if (sendTimerChannelUpdate) {
    try {
      await updateTimersChannel(client);
    } catch (err) {
      console.error("Error updating timers channel:", err);
    }
    sendTimerChannelUpdate = false;
  }
}

// Bot ready event
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot ready! Logged in as ${readyClient.user.tag}`);

  // Start the timer monitoring loop
  setInterval(timerLoop, 1000);
});

// Start the bot
console.log("Starting up...");
client.login(TOKEN);
