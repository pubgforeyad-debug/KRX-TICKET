const {
Client,
GatewayIntentBits,
ChannelType,
PermissionsBitField,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
EmbedBuilder,
Events
} = require("discord.js");

require("dotenv").config();

const client = new Client({
intents:[
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.DirectMessages
]
});

const TICKET_CATEGORY="1531926623580979230";
const RATING_CHANNEL="1531943465091596402";
const CLAIM_LOG_CHANNEL="1531943869682548826";

const APPLY_ADMIN=[
"1528157507665658018",
"1528157508869558463"
];

const SUPPORT_ADMIN=[
"1528157557192134726",
"1528157558416609331"
];

const claimedTickets=new Map();

client.once("ready",()=>{
console.log(`${client.user.tag} Online`);
});

client.on("messageCreate",async message=>{

if(message.author.bot)return;

if(message.content==="!setup1"){

const embed=new EmbedBuilder()
.setColor("Blue")
.setTitle("📝 تقديم إدارة | KRX")
.setDescription("اضغط الزر لفتح تذكرة تقديم الإدارة.")
.setTimestamp();

const row=new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("apply_ticket")
.setLabel("📝 تقديم إدارة")
.setStyle(ButtonStyle.Success)
);

return message.channel.send({
embeds:[embed],
components:[row]
});
}

if(message.content==="!setup2"){

const embed=new EmbedBuilder()
.setColor("Blurple")
.setTitle("🎧 الدعم الفني | KRX")
.setDescription("اضغط الزر لفتح تذكرة الدعم.")
.setTimestamp();

const row=new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("support_ticket")
.setLabel("🎧 دعم")
.setStyle(ButtonStyle.Primary)
);

return message.channel.send({
embeds:[embed],
components:[row]
});

}

});

client.on(Events.InteractionCreate,async interaction=>{

if(!interaction.isButton())return;

let type;
let roles;

if(interaction.customId==="apply_ticket"){
type="تقديم";
roles=APPLY_ADMIN;
}

if(interaction.customId==="support_ticket"){
type="دعم";
roles=SUPPORT_ADMIN;
}

if(!type)return;

const old=interaction.guild.channels.cache.find(c=>
c.parentId===TICKET_CATEGORY &&
c.name.includes(interaction.user.id)
);

if(old){
return interaction.reply({
content:`❌ لديك تذكرة مفتوحة بالفعل: ${old}`,
ephemeral:true
});
}

const channel=await interaction.guild.channels.create({

name:`ticket-${interaction.user.id}`,

type:ChannelType.GuildText,

parent:TICKET_CATEGORY,

permissionOverwrites:[

{
id:interaction.guild.id,
deny:[PermissionsBitField.Flags.ViewChannel]
},

{
id:interaction.user.id,
allow:[
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
},

...roles.map(r=>({
id:r,
allow:[
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
}))
]

});

const buttons=new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("close_ticket")
.setLabel("🔒 إغلاق")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId("add_member")
.setLabel("➕ عضو")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("remove_member")
.setLabel("➖ عضو")
.setStyle(ButtonStyle.Secondary)

);

const mention=roles.map(r=>`<@&${r}>`).join(" ");

await channel.send({
content:`${interaction.user} ${mention}`,
embeds:[
new EmbedBuilder()
.setColor("Blue")
.setTitle("🎫 تذكرة جديدة")
.setDescription(`مرحباً ${interaction.user}

اكتب مشكلتك وانتظر الإدارة.

📌 للاستلام اكتب:
\`دعم\``)
],
components:[buttons]
});

interaction.reply({
content:`✅ تم فتح التذكرة ${channel}`,
ephemeral:true
});

});
// ======================
// استلام التذكرة
// ======================

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

if(message.content !== "دعم") return;

if(!message.channel.name.startsWith("ticket-")) return;

const isAdmin =
SUPPORT_ADMIN.some(r=>message.member.roles.cache.has(r)) ||
APPLY_ADMIN.some(r=>message.member.roles.cache.has(r));

if(!isAdmin){
return message.reply("❌ ليس لديك صلاحية لاستلام التذكرة.");
}

if(claimedTickets.has(message.channel.id)){

const adminId = claimedTickets.get(message.channel.id);

return message.reply(
`❌ هذه التذكرة مستلمة بالفعل بواسطة <@${adminId}>`
);

}

claimedTickets.set(
message.channel.id,
message.author.id
);

const embed = new EmbedBuilder()

.setColor("Green")

.setTitle("✅ تم استلام التذكرة")

.setDescription(
`👤 الإدارة: ${message.author}

يرجى انتظار متابعة طلبك.`
)

.setTimestamp();

await message.channel.send({
embeds:[embed]
});

try{

await message.author.send(
`🎉 تم استلام تذكرة **${message.channel.name}**

شكراً لك على سرعة الاستجابة 💙`
);

}catch{}

const log =
message.guild.channels.cache.get(CLAIM_LOG_CHANNEL);

if(log){

log.send({

embeds:[
new EmbedBuilder()
.setColor("Blue")
.setTitle("📋 سجل استلام")
.addFields(
{name:"الإداري",value:`${message.author}`,inline:true},
{name:"التذكرة",value:`${message.channel}`,inline:true}
)
.setTimestamp()
]

});

}

});


// ======================
// إضافة عضو
// ======================

client.on("messageCreate",async(message)=>{

if(message.author.bot) return;

if(!message.content.startsWith("$add")) return;

if(!message.channel.name.startsWith("ticket-")) return;

const member =
message.mentions.members.first();

if(!member)
return message.reply("❌ قم بمنشن العضو.");

await message.channel.permissionOverwrites.edit(
member.id,
{
ViewChannel:true,
SendMessages:true
}
);

message.reply(`✅ تمت إضافة ${member}`);

});


// ======================
// إزالة عضو
// ======================

client.on("messageCreate",async(message)=>{

if(message.author.bot) return;

if(!message.content.startsWith("$remove")) return;

if(!message.channel.name.startsWith("ticket-")) return;

const member =
message.mentions.members.first();

if(!member)
return message.reply("❌ قم بمنشن العضو.");

await message.channel.permissionOverwrites.delete(
member.id
);

message.reply(`✅ تمت إزالة ${member}`);

});
// ======================
// زر إغلاق التذكرة
// ======================

client.on(Events.InteractionCreate, async (interaction) => {

if(!interaction.isButton()) return;

if(interaction.customId !== "close_ticket") return;

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("rate_1")
.setLabel("⭐")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("rate_2")
.setLabel("⭐⭐")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("rate_3")
.setLabel("⭐⭐⭐")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("rate_4")
.setLabel("⭐⭐⭐⭐")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("rate_5")
.setLabel("⭐⭐⭐⭐⭐")
.setStyle(ButtonStyle.Success)

);

await interaction.reply({

embeds:[
new EmbedBuilder()
.setColor("Blue")
.setTitle("⭐ تقييم الخدمة")
.setDescription("يرجى اختيار تقييمك قبل حذف التذكرة.")
],

components:[row]

});

});


// ======================
// استقبال التقييم
// ======================

client.on(Events.InteractionCreate, async (interaction)=>{

if(!interaction.isButton()) return;

if(!interaction.customId.startsWith("rate_")) return;

const rate = interaction.customId.split("_")[1];

const log =
interaction.guild.channels.cache.get(RATING_CHANNEL);

if(log){

await log.send({

embeds:[
new EmbedBuilder()
.setColor("Yellow")
.setTitle("⭐ تقييم جديد")
.addFields(
{name:"العضو",value:`${interaction.user}`,inline:true},
{name:"التقييم",value:`${"⭐".repeat(Number(rate))}`,inline:true},
{name:"التذكرة",value:`${interaction.channel}`,inline:false}
)
.setTimestamp()
]

});

}

await interaction.reply({
content:`💙 شكراً لك، تم تسجيل تقييم ${rate}/5`,
ephemeral:true
});

setTimeout(async()=>{

try{

await interaction.channel.delete();

}catch{}

},5000);

});


// ======================
// حذف يدوي
// ======================

client.on("messageCreate", async(message)=>{

if(message.author.bot) return;

if(message.content !== "!delete") return;

if(!message.channel.name.startsWith("ticket-")) return;

await message.reply("🗑️ سيتم حذف التذكرة بعد 5 ثوانٍ.");

setTimeout(async()=>{

try{

await message.channel.delete();

}catch{}

},5000);

});


// ======================
// تشغيل البوت
// ======================

client.login(process.env.TOKEN);
