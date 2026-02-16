import { REST, Routes } from "discord.js";
import { TOKEN, CLIENT_ID } from "./config.js";
import { commands } from "./commands/index.js";

async function main() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  const commandData = commands.map((cmd) => cmd.data.toJSON());

  console.log(`Registering ${commandData.length} slash commands...`);

  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {
      body: commandData,
    });
    console.log("Successfully registered commands.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
}

main();
