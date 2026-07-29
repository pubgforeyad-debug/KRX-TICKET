require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    Partials,
    Events
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

client.once(Events.ClientReady, () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    client.user.setActivity("KRX Tickets");
});

client.on(Events.MessageCreate, async (message) => {

    if (message.author.bot) return;

    if (message.content.toLowerCase() === "!setup") {

        const setup = require("./commands/setup");

        await setup.execute(message);

    }

});

client.login(process.env.TOKEN);
