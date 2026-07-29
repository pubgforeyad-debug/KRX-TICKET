const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField,
  Events
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const config = require("./config.json");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

client.commands = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.modals = new Collection();

const eventsPath = path.join(__dirname, "events");
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter(file => file.endsWith(".js"));

  for (const file of eventFiles) {
    const event = require(`./events/${file}`);

    if (event.once) {
      client.once(event.name, (...args) =>
        event.execute(...args, client)
      );
    } else {
      client.on(event.name, (...args) =>
        event.execute(...args, client)
      );
    }
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`${client.user.tag} is online!`);

  client.user.setPresence({
    activities: [
      {
        name: "KRX Community",
        type: 3
      }
    ],
    status: "online"
  });
});
// تحميل الأوامر
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
  const folders = fs.readdirSync(commandsPath);

  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);

    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs
      .readdirSync(folderPath)
      .filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
      const command = require(path.join(folderPath, file));

      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
      }
    }
  }
}

// استقبال أوامر Slash
client.on(Events.InteractionCreate, async interaction => {

  if (interaction.isChatInputCommand()) {

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);

      if (interaction.replied || interaction.deferred) {
        interaction.followUp({
          content: "❌ حدث خطأ أثناء تنفيذ الأمر.",
          ephemeral: true
        });
      } else {
        interaction.reply({
          content: "❌ حدث خطأ أثناء تنفيذ الأمر.",
          ephemeral: true
        });
      }
    }
            }
    // الأزرار
  if (interaction.isButton()) {
    const button = client.buttons.get(interaction.customId);

    if (!button) return;

    try {
      await button.execute(interaction, client);
    } catch (error) {
      console.error(error);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "❌ حدث خطأ أثناء تنفيذ الزر.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "❌ حدث خطأ أثناء تنفيذ الزر.",
          ephemeral: true,
        });
      }
    }
  }

  // القوائم المنسدلة
  if (interaction.isStringSelectMenu()) {
    const menu = client.selectMenus.get(interaction.customId);

    if (!menu) return;

    try {
      await menu.execute(interaction, client);
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content: "❌ حدث خطأ أثناء تنفيذ القائمة.",
        ephemeral: true,
      });
    }
  }

  // النوافذ المنبثقة (Modals)
  if (interaction.isModalSubmit()) {
    const modal = client.modals.get(interaction.customId);

    if (!modal) return;

    try {
      await modal.execute(interaction, client);
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content: "❌ حدث خطأ أثناء إرسال النموذج.",
        ephemeral: true,
      });
    }
  }
});
// تسجيل الدخول إلى البوت
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("uncaughtExceptionMonitor", (err) => {
  console.error("Uncaught Exception Monitor:", err);
});

client.login(config.token);
