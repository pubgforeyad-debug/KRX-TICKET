require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials,
    Events
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

client.commands = new Collection();

// تحميل الأوامر
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        client.commands.set(command.data.name, command);
    }
}

// عند تشغيل البوت
client.once(Events.ClientReady, () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity("KRX Tickets");
});

// تنفيذ أوامر السلاش
client.on(Events.InteractionCreate, async interaction => {

    if (interaction.isChatInputCommand()) {

        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "❌ حدث خطأ.",
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: "❌ حدث خطأ.",
                    ephemeral: true
                });
            }
        }

    }

});

client.login(process.env.TOKEN);
