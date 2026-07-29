require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
    new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Send the KRX Ticket Panel")
        .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("🔄 Registering slash commands...");

        await rest.put(
            Routes.applicationGuildCommands(
                "1531918719402377226",
                "1521797422941212742"
            ),
            { body: commands }
        );

        console.log("✅ Slash commands registered successfully.");
    } catch (error) {
        console.error(error);
    }
})();
