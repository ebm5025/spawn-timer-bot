import {
  Collection,
  type ChatInputCommandInteraction,
  type SlashCommandBuilder,
} from "discord.js";

export interface Command {
  data: SlashCommandBuilder | ReturnType<SlashCommandBuilder["toJSON"]> | any;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Import all commands
import { registerCommand } from "./register.js";
import { unregisterCommand } from "./unregister.js";
import { todCommand } from "./tod.js";
import { todRemoveCommand } from "./todremove.js";
import { todHistoryCommand } from "./todhistory.js";
import { skipCommand } from "./skip.js";
import { unskipCommand } from "./unskip.js";
import { showCommand } from "./show.js";
import { renameCommand } from "./rename.js";
import { aliasCommand } from "./alias.js";
import { autotodCommand } from "./autotod.js";
import { setWarnTimeCommand } from "./set-warn-time.js";
import { registerLinkCommand } from "./register-link.js";
import { registerClearCommand } from "./register-clear.js";
import { unlinkCommand } from "./unlink.js";
import { helpCommand } from "./help.js";
import { leaderboardCommand } from "./leaderboard.js";
import { scheduleCommand } from "./schedule.js";
import { timersCommand } from "./timers.js";
import { earthquakeCommand } from "./earthquake.js";

export const commands = new Collection<string, Command>();

const allCommands: Command[] = [
  registerCommand,
  unregisterCommand,
  todCommand,
  todRemoveCommand,
  todHistoryCommand,
  skipCommand,
  unskipCommand,
  showCommand,
  renameCommand,
  aliasCommand,
  autotodCommand,
  setWarnTimeCommand,
  registerLinkCommand,
  registerClearCommand,
  unlinkCommand,
  helpCommand,
  leaderboardCommand,
  scheduleCommand,
  timersCommand,
  earthquakeCommand,
];

for (const command of allCommands) {
  commands.set(command.data.name, command);
}
