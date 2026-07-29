require("dotenv").config();

const { Client, GatewayIntentBits, Events } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, (client) => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  client.user.setActivity("KRX Tickets", {
    type: 3 // Watching
  });
});

client.login(process.env.TOKEN);
