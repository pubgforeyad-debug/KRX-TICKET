const {
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

module.exports = {

async execute(message){

const embed = new EmbedBuilder()

.setColor("#5865F2")

.setTitle("🎫 KRX Ticket System")

.setDescription(`
**🇺🇸 Welcome!**

Choose your ticket type.

**🇸🇦 مرحبًا بك**

اختر نوع التذكرة.
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

.setCustomId("medi")

.setLabel("🤝 Mediator | وسيط")

.setStyle(ButtonStyle.Secondary)

);

await message.channel.send({

embeds:[embed],

components:[row]

});

}

};
