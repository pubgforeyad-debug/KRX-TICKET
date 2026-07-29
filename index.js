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
// الإعدادات
// =========================

const TICKET_CATEGORY = "1531926623580979230";
const RATING_CHANNEL = "1531943465091596402";
const CLAIM_LOG_CHANNEL = "1531943869682548826";

const APPLY_ADMIN = [
"1528157507665658018",
"1528157508869558463"
];

const SUPPORT_ADMIN = [
"1528157557192134726",
"1528157558416609331"
];

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
// التذاكر المستلمة
// =========================

const claimedTickets = new Map();

// =========================

client.once("ready",()=>{

console.log(`✅ ${client.user.tag} Online`);

});

// =========================
// إرسال بانل التقديم
// =========================

client.on("messageCreate",async message=>{

if(message.author.bot) return;

if(message.content==="!setup1"){

const embed=new EmbedBuilder()

.setColor("Blue")

.setTitle("📝 تقديم الإدارة | KRX")

.setDescription("اضغط الزر لفتح تذكرة تقديم الإدارة.")

.setTimestamp();

const row=new ActionRowBuilder()

.addComponents(

new ButtonBuilder()

.setCustomId("apply_ticket")

.setLabel("📝 تقديم")

.setStyle(ButtonStyle.Success)

);

return message.channel.send({

embeds:[embed],

components:[row]

});

}

// =========================
// إرسال بانل الدعم
// =========================

if(message.content==="!setup2"){

const embed=new EmbedBuilder()

.setColor("Blurple")

.setTitle("🎧 الدعم الفني | KRX")

.setDescription("اضغط الزر لفتح تذكرة الدعم.")

.setTimestamp();

const row=new ActionRowBuilder()

.addComponents(

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
// =========================
// فتح التذكرة
// =========================

client.on(Events.InteractionCreate, async interaction => {

if(!interaction.isButton()) return;

let type = null;
let roles = [];

if(interaction.customId === "apply_ticket"){
type = "تقديم";
roles = APPLY_ADMIN;
}

if(interaction.customId === "support_ticket"){
type = "دعم";
roles = SUPPORT_ADMIN;
}

if(!type) return;

// منع فتح أكثر من تذكرة

const oldTicket = interaction.guild.channels.cache.find(c =>
c.parentId === TICKET_CATEGORY &&
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

parent:TICKET_CATEGORY,

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

...roles.map(role=>({

id:role,

allow:[
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages,
PermissionsBitField.Flags.ReadMessageHistory
]

}))

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

const mention = roles
.map(r=>`<@&${r}>`)
.join(" ");

const embed = new EmbedBuilder()

.setColor("Blue")

.setTitle("🎫 تذكرة جديدة | KRX")

.setDescription(
`مرحباً ${interaction.user}

يرجى شرح مشكلتك.

**لاستلام التذكرة يكتب الإداري:**

\`دعم\``
)

.setFooter({
text:"KRX Ticket System"
})

.setTimestamp();

await ticket.send({

content:`${interaction.user} ${mention}`,

embeds:[embed],

components:[row]

});

await interaction.reply({

content:`✅ تم فتح التذكرة ${ticket}`,

ephemeral:true

});

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
SUPPORT_ADMIN.some(r=>message.member.roles.cache.has(r)) ||
APPLY_ADMIN.some(r=>message.member.roles.cache.has(r));

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

const log =
message.guild.channels.cache.get(CLAIM_LOG_CHANNEL);

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
// !point @user 10
// =========================

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

if(!message.content.startsWith("+point ")) return;

const isAdmin =
SUPPORT_ADMIN.some(r=>message.member.roles.cache.has(r)) ||
APPLY_ADMIN.some(r=>message.member.roles.cache.has(r));

if(!isAdmin)
return message.reply("❌ ليس لديك صلاحية.");

const member = message.mentions.members.first();

const amount = Number(message.content.split(" ")[2]);

if(!member || isNaN(amount))
return message.reply("الاستخدام:\n!point @user 10");

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
// -point @user 10
// =========================

client.on("messageCreate", async (message) => {

if(message.author.bot) return;

if(!message.content.startsWith("-point ")) return;

const isAdmin =
SUPPORT_ADMIN.some(r=>message.member.roles.cache.has(r)) ||
APPLY_ADMIN.some(r=>message.member.roles.cache.has(r));

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
SUPPORT_ADMIN.some(r=>message.member.roles.cache.has(r)) ||
APPLY_ADMIN.some(r=>message.member.roles.cache.has(r));

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
// زر الإغلاق والتقييم
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
interaction.guild.channels.cache.get(RATING_CHANNEL);

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
value:`${interaction.channel.name}`,
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
// تشغيل البوت
// =========================

client.login(process.env.TOKEN);
