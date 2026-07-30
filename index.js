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
const fs = require("fs");

// =========================
// تشغيل البوت
// =========================

const client = new Client({
intents:[
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.MessageContent,
GatewayIntentBits.DirectMessages
]
});

// =========================
// Config System
// =========================

const CONFIG_FILE = "./config.json";

let config = {
supportCategory:"",
staffCategory:"",
supportRole:"",
highRole:"",
ratingChannel:"",
claimLogChannel:""
};

if(fs.existsSync(CONFIG_FILE)){
config = JSON.parse(fs.readFileSync(CONFIG_FILE,"utf8"));
}

function saveConfig(){
fs.writeFileSync(CONFIG_FILE,JSON.stringify(config,null,2));
}

// =========================
// حفظ النقاط
// =========================

let points = {};

if(fs.existsSync("./points.json")){
points = JSON.parse(fs.readFileSync("./points.json","utf8"));
}

function savePoints(){
fs.writeFileSync(
"./points.json",
JSON.stringify(points,null,2)
);
}

// =========================

const claimedTickets = new Map();

client.once("ready",()=>{

console.log(`✅ ${client.user.tag} Online`);

});

// =========================
// أوامر الإعداد
// =========================

const waitingSetup = new Map();

client.on("messageCreate",async message=>{

if(message.author.bot) return;

if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
return;

// support category
if(message.content==="!supportlog"){
waitingSetup.set(message.author.id,"supportCategory");
return message.reply("📂 أرسل الآن ID كاتيجوري الدعم.");
}

// staff category
if(message.content==="!staff"){
waitingSetup.set(message.author.id,"staffCategory");
return message.reply("📂 أرسل الآن ID كاتيجوري التقديم.");
}

// support role
if(message.content==="!idstaff"){
waitingSetup.set(message.author.id,"supportRole");
return message.reply("🎖️ أرسل الآن ID رتبة الدعم.");
}

// high role
if(message.content==="!idhigh"){
waitingSetup.set(message.author.id,"highRole");
return message.reply("👑 أرسل الآن ID رتبة الإدارة العليا.");
}

// استقبال الـ ID

if(waitingSetup.has(message.author.id)){

const key = waitingSetup.get(message.author.id);

config[key]=message.content.trim();

saveConfig();

waitingSetup.delete(message.author.id);

return message.reply(`✅ تم حفظ ${key} بنجاح.`);
}

});
// =========================
// فتح التذكرة
// =========================

client.on(Events.InteractionCreate, async interaction => {

if(!interaction.isButton()) return;

let type = null;
let category = null;
let role = null;

if(interaction.customId === "apply_ticket"){
type = "تقديم";
category = config.staffCategory;
role = config.highRole;
}

if(interaction.customId === "support_ticket"){
type = "دعم";
category = config.supportCategory;
role = config.supportRole;
}

if(!type) return;

if(!category)
return interaction.reply({
content:"❌ لم يتم تحديد كاتيجوري لهذا النوع من التذاكر.",
ephemeral:true
});

if(!role)
return interaction.reply({
content:"❌ لم يتم تحديد الرتبة لهذا النوع من التذاكر.",
ephemeral:true
});

// منع فتح أكثر من تذكرة

const oldTicket = interaction.guild.channels.cache.find(c =>
c.topic === interaction.user.id
);

if(oldTicket){
return interaction.reply({
content:`❌ لديك تذكرة مفتوحة بالفعل: ${oldTicket}`,
ephemeral:true
});
}

// إنشاء التذكرة

const ticket = await interaction.guild.channels.create({

name:`🎫-${type}-${interaction.user.username}`,

type:ChannelType.GuildText,

parent:category,

topic:interaction.user.id,

permissionOverwrites:[

{
id:interaction.guild.id,
deny:[
PermissionsBitField.Flags.ViewChannel
]
},

{
id:interaction.user.id,
allow:[
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages,
PermissionsBitField.Flags.ReadMessageHistory
]
},

{
id:role,
allow:[
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages,
PermissionsBitField.Flags.ReadMessageHistory
]
}

]

});

// أزرار التذكرة

const row = new ActionRowBuilder()

.addComponents(

new ButtonBuilder()
.setCustomId("close_ticket")
.setLabel("🔒 إغلاق")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId("delete_ticket")
.setLabel("🗑️ حذف")
.setStyle(ButtonStyle.Secondary)

);

const embed = new EmbedBuilder()

.setColor("Blue")

.setTitle(`🎫 تذكرة ${type}`)

.setDescription(`مرحباً ${interaction.user}

يرجى كتابة تفاصيل طلبك.

**لاستلام التذكرة يكتب الإداري:**

\`دعم\``)

.setFooter({
text:"KRX Ticket System"
})

.setTimestamp();

await ticket.send({

content:`${interaction.user} <@&${role}>`,

embeds:[embed],

components:[row]

});
// =========================
// استلام التذكرة
// =========================

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

if(message.content !== "دعم") return;

if(!message.channel.name.startsWith("🎫-")) return;

// التحقق من أن الشخص إداري

const isAdmin =
message.member.roles.cache.has(config.supportRole) ||
message.member.roles.cache.has(config.highRole);

if(!isAdmin){
return message.reply("❌ ليس لديك صلاحية لاستلام التذكرة.");
}

// إذا كانت مستلمة

if(claimedTickets.has(message.channel.id)){

const adminId = claimedTickets.get(message.channel.id);

return message.reply(
`❌ تم استلام هذه التذكرة بالفعل بواسطة <@${adminId}>`
);

}

// تسجيل المستلم

claimedTickets.set(
message.channel.id,
message.author.id
);

// إضافة نقطتين

if(!points[message.author.id])
points[message.author.id]=0;

points[message.author.id]+=2;

savePoints();

// رسالة داخل التذكرة

await message.channel.send({

embeds:[
new EmbedBuilder()

.setColor("Green")

.setTitle("✅ تم استلام التذكرة")

.setDescription(
`👤 المستلم: ${message.author}

➕ حصل على **+2 نقطة**.

⭐ مجموع نقاطه الآن:
**${points[message.author.id]}**

يرجى متابعة العميل حتى انتهاء المشكلة.`
)

.setTimestamp()
]

});

// رسالة خاصة

try{

await message.author.send({

embeds:[

new EmbedBuilder()

.setColor("Green")

.setTitle("🎉 تم استلام تذكرة")

.setDescription(
`تم استلام التذكرة بنجاح.

➕ تمت إضافة **+2 نقطة**.

⭐ مجموع نقاطك الآن:
**${points[message.author.id]}**`
)

.setTimestamp()

]

});

}catch{}

// اللوج

if(config.claimLogChannel){

const log =
message.guild.channels.cache.get(config.claimLogChannel);

if(log){

await log.send({

embeds:[

new EmbedBuilder()

.setColor("Blue")

.setTitle("📋 استلام تذكرة")

.addFields(

{
name:"الإداري",
value:`${message.author}`,
inline:true
},

{
name:"التذكرة",
value:`${message.channel}`,
inline:true
},

{
name:"النقاط",
value:`${points[message.author.id]}`,
inline:true
}

)

.setTimestamp()

]

});

}

}

});
  // =========================
// عرض نقاطك
// =========================

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

if(message.content !== "!points") return;

const myPoints = points[message.author.id] || 0;

const embed = new EmbedBuilder()

.setColor("Gold")

.setTitle("⭐ نقاطك")

.setDescription(`لديك **${myPoints}** نقطة.`)

.setTimestamp();

message.reply({embeds:[embed]});

});

// =========================
// إضافة نقاط
// =========================

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

if(!message.content.startsWith("+point ")) return;

const isAdmin =
message.member.roles.cache.has(config.supportRole) ||
message.member.roles.cache.has(config.highRole);

if(!isAdmin)
return message.reply("❌ ليس لديك صلاحية.");

const member = message.mentions.members.first();

const amount = Number(message.content.split(" ")[2]);

if(!member || isNaN(amount))
return message.reply("الاستخدام:\n+point @user 10");

if(!points[member.id]) points[member.id]=0;

points[member.id]+=amount;

savePoints();

message.channel.send(
`✅ تمت إضافة **${amount}** نقطة إلى ${member}\n⭐ المجموع: **${points[member.id]}**`
);

try{

await member.send(
`🎉 تمت إضافة **${amount}** نقطة إلى حسابك.\n⭐ مجموع نقاطك الآن: **${points[member.id]}**`
);

}catch{}

});

// =========================
// خصم نقاط
// =========================

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

if(!message.content.startsWith("-point ")) return;

const isAdmin =
message.member.roles.cache.has(config.supportRole) ||
message.member.roles.cache.has(config.highRole);

if(!isAdmin)
return message.reply("❌ ليس لديك صلاحية.");

const member = message.mentions.members.first();

const amount = Number(message.content.split(" ")[2]);

if(!member || isNaN(amount))
return message.reply("الاستخدام:\n-point @user 10");

if(!points[member.id]) points[member.id]=0;

points[member.id]-=amount;

if(points[member.id] < 0)
points[member.id]=0;

savePoints();

message.channel.send(
`➖ تم خصم **${amount}** نقطة من ${member}\n⭐ المجموع: **${points[member.id]}**`
);

try{

await member.send(
`⚠️ تم خصم **${amount}** نقطة من حسابك.\n⭐ مجموع نقاطك الآن: **${points[member.id]}**`
);

}catch{}

});

// =========================
// أفضل الإداريين
// =========================

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

if(message.content !== "$top") return;

const top = Object.entries(points)
.sort((a,b)=>b[1]-a[1])
.slice(0,10);

if(top.length===0)
return message.reply("❌ لا توجد نقاط.");

const embed = new EmbedBuilder()

.setColor("Gold")

.setTitle("🏆 أفضل الإداريين")

.setDescription(

top.map((x,i)=>

`**${i+1}.** <@${x[0]}> — ⭐ **${x[1]}**`

).join("\n")

)

.setTimestamp();

message.channel.send({

embeds:[embed]

});

});
  // =========================
// تغيير اسم التذكرة
// =========================

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

if(!message.channel.name.startsWith("🎫-")) return;

if(!message.content.startsWith("!rename ")) return;

const isAdmin =
message.member.roles.cache.has(config.supportRole) ||
message.member.roles.cache.has(config.highRole);

if(!isAdmin)
return message.reply("❌ ليس لديك صلاحية.");

const newName = message.content.slice(8).trim();

if(!newName)
return message.reply("مثال:\n!rename مشكلة-الدفع");

await message.channel.setName(`🎫-${newName}`);

message.reply(`✅ تم تغيير اسم التذكرة إلى **🎫-${newName}**`);

});

// =========================
// حذف التذكرة
// =========================

client.on("messageCreate", async(message)=>{

if(message.author.bot) return;

if(message.content !== "!delete") return;

if(!message.channel.name.startsWith("🎫-")) return;

message.reply("🗑️ سيتم حذف التذكرة بعد 5 ثوانٍ.");

setTimeout(async()=>{

try{
await message.channel.delete();
}catch{}

},5000);

});

// =========================
// تحديد روم اللوج
// =========================

client.on("messageCreate",async message=>{

if(message.author.bot) return;

if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
return;

if(message.content==="!claimlog"){
return message.reply("📋 أرسل الآن ID روم لوج استلام التذاكر.");
}

if(message.content==="!ratinglog"){
return message.reply("⭐ أرسل الآن ID روم التقييم.");
}

if(message.reference) return;

if(config.claimLogChannel==="" && /^[0-9]{17,20}$/.test(message.content)){
config.claimLogChannel=message.content;
saveConfig();
return message.reply("✅ تم حفظ روم لوج الاستلام.");
}

if(config.ratingChannel==="" && /^[0-9]{17,20}$/.test(message.content)){
config.ratingChannel=message.content;
saveConfig();
return message.reply("✅ تم حفظ روم التقييم.");
}

});

// =========================
// زر الإغلاق
// =========================

client.on(Events.InteractionCreate, async(interaction)=>{

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

interaction.reply({

embeds:[
new EmbedBuilder()
.setColor("Blue")
.setTitle("⭐ تقييم الخدمة")
.setDescription("اختر تقييمك قبل حذف التذكرة.")
],

components:[row]

});

});

// =========================
// استقبال التقييم
// =========================

client.on(Events.InteractionCreate, async(interaction)=>{

if(!interaction.isButton()) return;

if(!interaction.customId.startsWith("rate_")) return;

const rate = interaction.customId.split("_")[1];

const channel =
interaction.guild.channels.cache.get(config.ratingChannel);

if(channel){

channel.send({

embeds:[

new EmbedBuilder()

.setColor("Yellow")

.setTitle("⭐ تقييم جديد")

.addFields(

{
name:"العضو",
value:`${interaction.user}`,
inline:true
},

{
name:"التقييم",
value:`${"⭐".repeat(Number(rate))}`,
inline:true
},

{
name:"التذكرة",
value:`${interaction.channel}`,
inline:false
}

)

.setTimestamp()

]

});

}

interaction.reply({

content:`💙 شكراً لتقييمك ${rate}/5`,

ephemeral:true

});

setTimeout(async()=>{

try{
await interaction.channel.delete();
}catch{}

},5000);

});

// =========================
// إرسال DM
// =========================

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

if(!message.content.startsWith("!dm")) return;

if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
return message.reply("❌ ليس لديك صلاحية.");

const member = message.mentions.members.first();

if(!member) return message.reply("منشن العضو.");

const text = message.content.split(" ").slice(2).join(" ");

if(!text) return message.reply("اكتب الرسالة.");

try{

await member.send(text);

message.reply("✅ تم إرسال الرسالة.");

}catch{

message.reply("❌ الخاص مغلق.");

}

});

// =========================
// إرسال للجميع
// =========================

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

if(!message.content.startsWith("!dms")) return;

if(!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
return message.reply("❌ ليس لديك صلاحية.");

const text = message.content.split(" ").slice(1).join(" ");

if(!text) return message.reply("اكتب الرسالة.");

let sent = 0;
let failed = 0;

for(const member of message.guild.members.cache.values()){

if(member.user.bot) continue;

try{
await member.send(text);
sent++;
}catch{
failed++;
}

}

message.reply(`✅ تم الإرسال إلى ${sent}\n❌ فشل ${failed}`);

});

// =========================
// تشغيل البوت
// =========================

client.login(process.env.TOKEN);
await interaction.reply({

content:`✅ تم فتح التذكرة ${ticket}`,

ephemeral:true

});

});
