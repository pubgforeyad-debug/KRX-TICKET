
const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Create the KRX Ticket Panel"),

    async execute(interaction) {

        const embed = new EmbedBuilder()
            .setColor("#5865F2")
            .setTitle("🎫 KRX Ticket System")
            .setDescription(`
## 🇺🇸 Welcome!
Choose the type of ticket you want to open by clicking one of the buttons below.

## 🇸🇦 مرحبًا بك!
اختر نوع التذكرة التي تريد فتحها بالضغط على أحد الأزرار بالأسفل.
            `);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId("support")
                    .setLabel("🛠️ Support | الدعم")
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId("application")
                    .setLabel("📋 Application | التقديم")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("mediatorticket")
                    .setLabel("🤝 Mediator | وسيط")
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }
};
