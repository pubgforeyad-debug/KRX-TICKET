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
// CONFIG
// =========================

const configPath = "./config.json";

let config = {};

try{

config = require(configPath);

}catch{

config = {};

}


function saveConfig(){

fs.writeFileSync(

configPath,

JSON.stringify(config,null,2)

);

}


// =========================
// HELPERS
// =========================

function getStaffRoles(){

return [

config.STAFF_ROLE,

config.HIGH_ROLE

].filter(Boolean);

}


function hasStaffPermission(message){

if(!message.guild || !message.member)
return false;


// صاحب السيرفر
if(message.author.id === message.guild.ownerId)
return true;


// Administrator
if(
message.member.permissions.has(
PermissionsBitField.Flags.Administrator
)
){

return true;

}


// رتبة Staff أو High
return getStaffRoles().some(roleId =>

message.member.roles.cache.has(roleId)

);

}


// =========================
// حفظ IDs من داخل ديسكورد
// =========================

client.on("messageCreate", async message=>{


if(message.author.bot || !message.guild)
return;


const isOwner =

message.author.id === message.guild.ownerId;


const isAdministrator =

message.member.permissions.has(

PermissionsBitField.Flags.Administrator

);


// فقط الأونر أو Administrator
if(!isOwner && !isAdministrator)
return;



// =========================
// !idstaff
// =========================

if(message.content.startsWith("!idstaff ")){


const id =

message.content
.trim()
.split(/\s+/)[1];


const role =

message.guild.roles.cache.get(id);


if(!role){

return message.reply(

"❌ اكتب ID رتبة Staff صحيحة.\nمثال: `!idstaff 123456789`"

);

}


config.STAFF_ROLE = role.id;


saveConfig();


return message.reply(

`✅ تم حفظ رتبة الاستف: ${role}`

);

}



// =========================
// !idhigh
// =========================

if(message.content.startsWith("!idhigh ")){


const id =

message.content
.trim()
.split(/\s+/)[1];


const role =

message.guild.roles.cache.get(id);


if(!role){

return message.reply(

"❌ اكتب ID رتبة الإدارة العليا صحيحة.\nمثال: `!idhigh 123456789`"

);

}


config.HIGH_ROLE = role.id;


saveConfig();


return message.reply(

`✅ تم حفظ رتبة الإدارة العليا: ${role}`

);

}



// =========================
// !idticket
// =========================

if(message.content.startsWith("!idticket ")){


const id =

message.content
.trim()
.split(/\s+/)[1];


const category =

message.guild.channels.cache.get(id);


if(
!category ||
category.type !== ChannelType.GuildCategory
){

return message.reply(

"❌ اكتب ID كاتيجوري صحيح.\nمثال: `!idticket 123456789`"

);

}


config.TICKET_CATEGORY = category.id;


saveConfig();


return message.reply(

`✅ تم حفظ كاتيجوري التذاكر: **${category.name}**`

);

}


});



// =========================
// POINTS
// =========================

let points = {};


if(fs.existsSync("./points.json")){


points =

JSON.parse(

fs.readFileSync(
"./points.json",
"utf8"
)

);


}


function savePoints(){


fs.writeFileSync(

"./points.json",

JSON.stringify(
points,
null,
2
)

);


}



// =========================
// SHOP
// =========================

let shop=[];


if(fs.existsSync("./shop.json")){


shop =

JSON.parse(

fs.readFileSync(
"./shop.json",
"utf8"
)

);


}


function saveShop(){


fs.writeFileSync(

"./shop.json",

JSON.stringify(
shop,
null,
2
)

);


}



// =========================
// READY
// =========================

client.once("ready",()=>{


console.log(

`✅ ${client.user.tag} Online`

);


});



// =========================
// SETUP PANELS
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;



// =========================
// APPLY PANEL
// !setup1
// =========================

if(message.content==="!setup1"){


const embed =

new EmbedBuilder()

.setColor("Blue")

.setTitle(
"📝 تقديم الإدارة | KRX"
)

.setDescription(

"اضغط الزر لفتح تذكرة التقديم."

)

.setTimestamp();



const row =

new ActionRowBuilder()

.addComponents(


new ButtonBuilder()

.setCustomId(
"apply_ticket"
)

.setLabel(
"📝 تقديم"
)

.setStyle(
ButtonStyle.Success
)


);



await message.channel.send({


embeds:[
embed
],


components:[
row
]


});


}



// =========================
// SUPPORT PANEL
// !setup2
// =========================

if(message.content==="!setup2"){


const embed =

new EmbedBuilder()

.setColor("Blurple")

.setTitle(
"🎧 الدعم الفني | KRX"
)

.setDescription(

"اضغط الزر لفتح تذكرة الدعم."

)

.setTimestamp();



const row =

new ActionRowBuilder()

.addComponents(


new ButtonBuilder()

.setCustomId(
"support_ticket"
)

.setLabel(
"🎧 دعم"
)

.setStyle(
ButtonStyle.Primary
)


);



await message.channel.send({


embeds:[
embed
],


components:[
row
]


});


}


});



// =========================
// فتح التذاكر
// =========================

client.on(
Events.InteractionCreate,
async interaction => {


if(!interaction.isButton())
return;


if(
![
"apply_ticket",
"support_ticket"
].includes(interaction.customId)
)
return;



const isApply =

interaction.customId ===
"apply_ticket";


const type =

isApply
?
"تقديم"
:
"دعم";



let roles =
getStaffRoles();



// لازم تحدد الرتب الأول
if(
!config.STAFF_ROLE &&
!config.HIGH_ROLE
){


return interaction.reply({


content:

"❌ لم يتم تحديد رتب الإدارة بعد.\nاستخدم `!idstaff ID` و `!idhigh ID` أولاً.",


ephemeral:true


});


}



// لازم تحدد الكاتيجوري
if(!config.TICKET_CATEGORY){


return interaction.reply({


content:

"❌ لم يتم تحديد كاتيجوري التذاكر.\nاستخدم `!idticket ID` أولاً.",


ephemeral:true


});


}



// نتأكد أن الرتب موجودة
roles = roles.filter(

roleId =>

interaction.guild.roles.cache.has(
roleId
)

);



await interaction.deferReply({

ephemeral:true

});


try{


const oldTicket =

interaction.guild.channels.cache.find(

channel =>

channel.topic ===
interaction.user.id

);


// منع فتح أكثر من تذكرة
if(oldTicket){


return interaction.editReply(

`❌ لديك تذكرة مفتوحة بالفعل ${oldTicket}`

);


}



// =========================
// التحقق من الكاتيجوري
// =========================

const category =

interaction.guild.channels.cache.get(

config.TICKET_CATEGORY

);


if(
!category ||
category.type !== ChannelType.GuildCategory
){


return interaction.editReply(

"❌ كاتيجوري التذاكر المحفوظ غير موجود.\nاستخدم `!idticket ID` من جديد."

);


}



// =========================
// صلاحيات التذكرة
// =========================

const permissionOverwrites = [


{

id:
interaction.guild.id,

deny:[

PermissionsBitField.Flags.ViewChannel

]

},


{

id:
interaction.user.id,

allow:[

PermissionsBitField.Flags.ViewChannel,

PermissionsBitField.Flags.SendMessages,

PermissionsBitField.Flags.ReadMessageHistory,

PermissionsBitField.Flags.AttachFiles

]

},


...roles.map(

roleId => ({


id:roleId,


allow:[

PermissionsBitField.Flags.ViewChannel,

PermissionsBitField.Flags.SendMessages,

PermissionsBitField.Flags.ReadMessageHistory,

PermissionsBitField.Flags.AttachFiles

]


})

)


];



// =========================
// إنشاء التذكرة
// =========================

const safeUsername =

interaction.user.username

.toLowerCase()

.replace(
/[^a-z0-9_\-\u0600-\u06FF]/g,
"-"
)

.slice(
0,
40
);



const ticket =

await interaction.guild.channels.create({


name:

`ticket-${type}-${safeUsername}`,


type:

ChannelType.GuildText,


parent:

category.id,


topic:

interaction.user.id,


permissionOverwrites


});
  // =========================
// رسالة داخل التذكرة
// =========================

const row =

new ActionRowBuilder()

.addComponents(


new ButtonBuilder()

.setCustomId(
"close_ticket"
)

.setLabel(
"🔒 إغلاق"
)

.setStyle(
ButtonStyle.Danger
),


new ButtonBuilder()

.setCustomId(
"delete_ticket"
)

.setLabel(
"🗑️ حذف"
)

.setStyle(
ButtonStyle.Secondary
)


);



const mention =

roles
.map(
r => `<@&${r}>`
)
.join(" ");



const embed =

new EmbedBuilder()

.setColor("Blue")

.setTitle(
"🎫 تذكرة جديدة | KRX"
)

.setDescription(

`مرحباً ${interaction.user}

اكتب تفاصيل طلبك.

لاستلام التذكرة اكتب:

\`دعم\``

)

.setTimestamp();



await ticket.send({


content:

`${interaction.user}${mention ? ` ${mention}` : ""}`,


embeds:[
embed
],


components:[
row
],


allowedMentions:{

users:[
interaction.user.id
],

roles:
roles

}


});



await interaction.editReply(

`✅ تم فتح التذكرة ${ticket}`

);


}catch(error){


console.error(
"TICKET CREATE ERROR:",
error
);


await interaction.editReply(

"❌ حصل خطأ أثناء فتح التذكرة.\nتأكد أن البوت لديه صلاحية Manage Channels وأن الـ IDs صحيحة."

).catch(()=>{});


}


});



// =========================
// استلام التذكرة + نقاط
// =========================

const claimedTickets =
new Map();



client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(message.content!=="دعم")
return;


if(
!message.channel.name.startsWith(
"ticket-"
)
)
return;



const admin =
hasStaffPermission(message);



if(!admin){


return message.reply(

"❌ ليس لديك صلاحية لاستلام التذكرة."

);


}



if(
claimedTickets.has(
message.channel.id
)
){


return message.reply(

`❌ التذكرة مستلمة بالفعل بواسطة <@${claimedTickets.get(message.channel.id)}>`

);


}



claimedTickets.set(

message.channel.id,

message.author.id

);



if(
!points[
message.author.id
]
){

points[
message.author.id
] = 0;

}



points[
message.author.id
] += 2;


savePoints();



await message.channel.send({


embeds:[


new EmbedBuilder()

.setColor("Green")

.setTitle(
"✅ تم استلام التذكرة"
)

.setDescription(

`👤 الإداري:
${message.author}

⭐ حصل على +2 نقطة

⭐ نقاطه الآن:
${points[message.author.id]}`

)


]


});



try{


await message.author.send(

`🎉 تم استلام التذكرة بنجاح.

⭐ حصلت على +2 نقطة.

⭐ نقاطك الآن:
${points[message.author.id]}`

);


}catch{}


});



// =========================
// عرض النقاط
// !points
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(message.content!=="!points")
return;



const userPoints =

points[
message.author.id
] || 0;



const embed =

new EmbedBuilder()

.setColor("Gold")

.setTitle(
"⭐ نقاطك"
)

.setDescription(

`لديك **${userPoints}** نقطة.`

)

.setTimestamp();



await message.reply({

embeds:[
embed
]

});


});



// =========================
// إضافة نقاط
// +point @user 10
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
!message.content.startsWith(
"+point "
)
)
return;



const admin =
hasStaffPermission(message);



if(!admin){


return message.reply(

"❌ ليس لديك صلاحية لإضافة النقاط."

);


}



const member =

message.mentions.members.first();



const args =

message.content

.trim()

.split(/\s+/);



const amount =

Number(
args[2]
);



if(
!member ||
!Number.isInteger(amount) ||
amount <= 0
){


return message.reply(

"❌ الاستخدام الصحيح:\n`+point @user 10`"

);


}



if(
!points[
member.id
]
){

points[
member.id
] = 0;

}



points[
member.id
] += amount;


savePoints();



await message.channel.send(

`✅ تمت إضافة **${amount}** نقطة إلى ${member}

⭐ نقاطه الآن:
**${points[member.id]}**`

);


});



// =========================
// خصم نقاط
// -point @user 10
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
!message.content.startsWith(
"-point "
)
)
return;



const admin =
hasStaffPermission(message);



if(!admin){


return message.reply(

"❌ ليس لديك صلاحية لخصم النقاط."

);


}



const member =

message.mentions.members.first();



const args =

message.content

.trim()

.split(/\s+/);



const amount =

Number(
args[2]
);



if(
!member ||
!Number.isInteger(amount) ||
amount <= 0
){


return message.reply(

"❌ الاستخدام الصحيح:\n`-point @user 10`"

);


}



if(
!points[
member.id
]
){

points[
member.id
] = 0;

}



points[
member.id
] -= amount;



if(
points[
member.id
] < 0
){

points[
member.id
] = 0;

}



savePoints();



await message.channel.send(

`➖ تم خصم **${amount}** نقطة من ${member}

⭐ نقاطه الآن:
**${points[member.id]}**`

);


});



// =========================
// أفضل الإداريين
// $top
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(message.content!=="$top")
return;



const top =

Object.entries(points)

.sort(
(a,b)=>
b[1]-a[1]
)

.slice(
0,
10
);



if(!top.length){


return message.reply(

"❌ لا يوجد نقاط حتى الآن."

);


}



const description =

top

.map(

([userId,userPoints],index)=>

`${index+1}- <@${userId}> ⭐ ${userPoints}`

)

.join("\n");



await message.channel.send({


embeds:[


new EmbedBuilder()

.setColor("Gold")

.setTitle(
"🏆 أفضل الإداريين"
)

.setDescription(
description
)


]


});


});



// =========================
// SHOP
// !shop
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(message.content!=="!shop")
return;



if(!shop.length){


return message.reply(

"🛒 الشوب فارغ."

);


}



const embed =

new EmbedBuilder()

.setColor("Gold")

.setTitle(
"🛒 متجر النقاط"
)

.setDescription(

shop.map(

(item,index)=>

`${index+1}- **${item.name}**
⭐ السعر: ${item.price}`

)

.join("\n\n")

);



await message.reply({

embeds:[
embed
]

});


});
// =========================
// شراء من المتجر
// !buy رقم
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
!message.content.startsWith(
"!buy "
)
)
return;



const id =

Number(

message.content
.trim()
.split(/\s+/)[1]

) - 1;



if(
!Number.isInteger(id) ||
id < 0 ||
!shop[id]
){


return message.reply(

"❌ المنتج غير موجود.\nمثال: `!buy 1`"

);


}



const item =
shop[id];



const userPoints =

points[
message.author.id
] || 0;



if(
userPoints <
item.price
){


return message.reply(

`❌ لا تملك نقاط كافية.

⭐ نقاطك:
${userPoints}

🛒 سعر المنتج:
${item.price}`

);


}



points[
message.author.id
] -= item.price;


savePoints();



await message.reply(

`✅ اشتريت **${item.name}**

⭐ تم خصم:
${item.price}

⭐ نقاطك الآن:
${points[message.author.id]}`

);


});



// =========================
// إضافة منتج
// !addshop اسم السعر
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
!message.content.startsWith(
"!addshop "
)
)
return;



if(
message.author.id !==
message.guild.ownerId
){


return message.reply(

"❌ هذا الأمر لصاحب السيرفر فقط."

);


}



const args =

message.content

.trim()

.split(/\s+/)

.slice(1);



const price =

Number(

args.pop()

);



const name =

args.join(" ");



if(
!name ||
!Number.isInteger(price) ||
price <= 0
){


return message.reply(

"❌ الاستخدام الصحيح:\n`!addshop VIP 100`"

);


}



shop.push({

name:name,

price:price

});


saveShop();



await message.reply(

`✅ تمت إضافة المنتج:

🛒 ${name}

⭐ السعر:
${price}`

);


});



// =========================
// حذف منتج
// !delshop رقم
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
!message.content.startsWith(
"!delshop "
)
)
return;



if(
message.author.id !==
message.guild.ownerId
){


return message.reply(

"❌ هذا الأمر لصاحب السيرفر فقط."

);


}



const id =

Number(

message.content
.trim()
.split(/\s+/)[1]

) - 1;



if(
!Number.isInteger(id) ||
id < 0 ||
!shop[id]
){


return message.reply(

"❌ المنتج غير موجود."

);


}



const removed =

shop.splice(
id,
1
)[0];


saveShop();



await message.reply(

`🗑️ تم حذف المنتج:

**${removed.name}**`

);


});



// =========================
// تغيير اسم التذكرة
// !rename الاسم
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
!message.content.startsWith(
"!rename "
)
)
return;



if(
!message.channel.name.startsWith(
"ticket-"
)
)
return;



const admin =
hasStaffPermission(message);



if(!admin){


return message.reply(

"❌ ليس لديك صلاحية لتغيير اسم التذكرة."

);


}



const name =

message.content

.slice(8)

.trim();



if(!name){


return message.reply(

"❌ مثال:\n`!rename مشكلة-شراء`"

);


}



const safeName =

name

.toLowerCase()

.replace(
/[^a-z0-9_\-\u0600-\u06FF]/g,
"-"
)

.slice(
0,
70
);



await message.channel.setName(

`ticket-${safeName}`

);



await message.reply(

"✅ تم تغيير اسم التذكرة."

);


});



// =========================
// حذف التذكرة بالأمر
// !delete
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
message.content !==
"!delete"
)
return;



if(
!message.channel.name.startsWith(
"ticket-"
)
)
return;



const admin =
hasStaffPermission(message);



if(!admin){


return message.reply(

"❌ ليس لديك صلاحية لحذف التذكرة."

);


}



await message.reply(

"🗑️ سيتم حذف التذكرة بعد 5 ثواني."

);



setTimeout(()=>{


message.channel.delete()

.catch(()=>{});


},5000);


});



// =========================
// زر إغلاق التذكرة
// =========================

client.on(
Events.InteractionCreate,
async interaction=>{


if(!interaction.isButton())
return;


if(
interaction.customId !==
"close_ticket"
)
return;



if(
!interaction.channel ||
!interaction.channel.name.startsWith(
"ticket-"
)
){


return interaction.reply({

content:
"❌ هذا الزر يعمل داخل التذاكر فقط.",

ephemeral:true

});


}



const isOwner =

interaction.user.id ===
interaction.guild.ownerId;


const isAdmin =

interaction.member.permissions.has(

PermissionsBitField.Flags.Administrator

);


const staffRole =

getStaffRoles()

.some(

roleId =>

interaction.member.roles.cache.has(
roleId
)

);



if(
!isOwner &&
!isAdmin &&
!staffRole
){


return interaction.reply({

content:
"❌ ليس لديك صلاحية لإغلاق التذكرة.",

ephemeral:true

});


}



// =========================
// أزرار التقييم
// =========================

const row =

new ActionRowBuilder()

.addComponents(


new ButtonBuilder()

.setCustomId(
"rate_1"
)

.setLabel(
"⭐"
)

.setStyle(
ButtonStyle.Secondary
),


new ButtonBuilder()

.setCustomId(
"rate_2"
)

.setLabel(
"⭐⭐"
)

.setStyle(
ButtonStyle.Secondary
),


new ButtonBuilder()

.setCustomId(
"rate_3"
)

.setLabel(
"⭐⭐⭐"
)

.setStyle(
ButtonStyle.Secondary
),


new ButtonBuilder()

.setCustomId(
"rate_4"
)

.setLabel(
"⭐⭐⭐⭐"
)

.setStyle(
ButtonStyle.Secondary
),


new ButtonBuilder()

.setCustomId(
"rate_5"
)

.setLabel(
"⭐⭐⭐⭐⭐"
)

.setStyle(
ButtonStyle.Success
)


);



await interaction.reply({


embeds:[


new EmbedBuilder()

.setColor("Blue")

.setTitle(
"⭐ تقييم الخدمة"
)

.setDescription(

"اختر تقييمك قبل حذف التذكرة."

)


],


components:[
row
]


});


});



// =========================
// زر حذف التذكرة
// =========================

client.on(
Events.InteractionCreate,
async interaction=>{


if(!interaction.isButton())
return;


if(
interaction.customId !==
"delete_ticket"
)
return;



if(
!interaction.channel ||
!interaction.channel.name.startsWith(
"ticket-"
)
){


return interaction.reply({

content:
"❌ هذا الزر يعمل داخل التذاكر فقط.",

ephemeral:true

});


}



const isOwner =

interaction.user.id ===
interaction.guild.ownerId;


const isAdmin =

interaction.member.permissions.has(

PermissionsBitField.Flags.Administrator

);


const staffRole =

getStaffRoles()

.some(

roleId =>

interaction.member.roles.cache.has(
roleId
)

);



if(
!isOwner &&
!isAdmin &&
!staffRole
){


return interaction.reply({

content:
"❌ ليس لديك صلاحية لحذف التذكرة.",

ephemeral:true

});


}



await interaction.reply(

"🗑️ سيتم حذف التذكرة بعد 3 ثواني."

);



setTimeout(()=>{


interaction.channel.delete()

.catch(()=>{});


},3000);


});



// =========================
// استقبال التقييم
// =========================

client.on(
Events.InteractionCreate,
async interaction=>{


if(!interaction.isButton())
return;


if(
!interaction.customId.startsWith(
"rate_"
)
)
return;



const rate =

interaction.customId
.split("_")[1];



if(
!["1","2","3","4","5"]
.includes(rate)
)
return;



const channel =

interaction.guild.channels.cache.get(

config.RATING_CHANNEL

);



if(channel){


await channel.send({


embeds:[


new EmbedBuilder()

.setColor("Yellow")

.setTitle(
"⭐ تقييم جديد"
)

.addFields(


{

name:
"العضو",

value:
`${interaction.user}`

},


{

name:
"التقييم",

value:
"⭐".repeat(
Number(rate)
)

}


)


]


});


}



await interaction.reply({

content:
`💙 شكراً لتقييمك ${rate}/5`,

ephemeral:true

});



setTimeout(()=>{


interaction.channel.delete()

.catch(()=>{});


},5000);


});
// =========================
// DM لشخص
// !dm @user الرسالة
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
!message.content.startsWith(
"!dm "
)
)
return;



const admin =
hasStaffPermission(message);



if(!admin){


return message.reply(

"❌ ليس لديك صلاحية لاستخدام الأمر."

);


}



const member =

message.mentions.members.first();



const text =

message.content

.trim()

.split(/\s+/)

.slice(2)

.join(" ");



if(
!member ||
!text
){


return message.reply(

"❌ الاستخدام الصحيح:\n`!dm @user الرسالة`"

);


}



try{


await member.send(

text

);



await message.reply(

"✅ تم إرسال الرسالة في الخاص."

);


}catch(error){


console.error(
"DM ERROR:",
error
);



await message.reply(

"❌ لم أستطع إرسال الرسالة.\nممكن يكون الخاص عند العضو مقفول."

);


}


});



// =========================
// DMS للجميع
// !dms الرسالة
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
!message.content.startsWith(
"!dms "
)
)
return;



const admin =
hasStaffPermission(message);



if(!admin){


return message.reply(

"❌ ليس لديك صلاحية لاستخدام الأمر."

);


}



const text =

message.content

.trim()

.split(/\s+/)

.slice(1)

.join(" ");



if(!text){


return message.reply(

"❌ الاستخدام الصحيح:\n`!dms الرسالة`"

);


}



// نحاول جلب كل الأعضاء
try{


await message.guild.members.fetch();


}catch(error){


console.error(
"MEMBERS FETCH ERROR:",
error
);


}



let sent = 0;

let failed = 0;



await message.reply(

"📨 بدأ إرسال الرسالة للأعضاء."

);



for(
const member
of
message.guild.members.cache.values()
){


// نتجاهل البوتات
if(member.user.bot)
continue;



try{


await member.send(

`${text}

<@${member.id}>`

);


sent++;


}catch(error){


failed++;


}



// تأخير بسيط لتقليل مشاكل Rate Limit
await new Promise(

resolve =>

setTimeout(
resolve,
1000
)

);


}



await message.channel.send(

`✅ انتهى الإرسال.

📨 تم الإرسال:
**${sent}**

❌ فشل:
**${failed}**`

);


});



// =========================
// عرض إعدادات البوت
// !ids
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
message.content !==
"!ids"
)
return;



const admin =
hasStaffPermission(message);



if(!admin){


return message.reply(

"❌ ليس لديك صلاحية."

);


}



const staff =

config.STAFF_ROLE
?
`<@&${config.STAFF_ROLE}>`
:
"❌ غير محدد";



const high =

config.HIGH_ROLE
?
`<@&${config.HIGH_ROLE}>`
:
"❌ غير محدد";



const category =

config.TICKET_CATEGORY
?
`<#${config.TICKET_CATEGORY}>`
:
"❌ غير محدد";



const rating =

config.RATING_CHANNEL
?
`<#${config.RATING_CHANNEL}>`
:
"❌ غير محدد";



const embed =

new EmbedBuilder()

.setColor("Blue")

.setTitle(
"⚙️ إعدادات KRX"
)

.addFields(


{

name:
"👮 Staff",

value:
staff

},


{

name:
"👑 High Staff",

value:
high

},


{

name:
"🎫 Ticket Category",

value:
category

},


{

name:
"⭐ Rating Channel",

value:
rating

}


)

.setTimestamp();



await message.reply({

embeds:[
embed
]

});


});



// =========================
// تحديد روم التقييم
// !idrating ID
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
!message.content.startsWith(
"!idrating "
)
)
return;



const isOwner =

message.author.id ===
message.guild.ownerId;



const isAdministrator =

message.member.permissions.has(

PermissionsBitField.Flags.Administrator

);



if(
!isOwner &&
!isAdministrator
){


return message.reply(

"❌ الأمر لصاحب السيرفر أو Administrator فقط."

);


}



const id =

message.content

.trim()

.split(/\s+/)[1];



const channel =

message.guild.channels.cache.get(
id
);



if(
!channel ||
channel.type !== ChannelType.GuildText
){


return message.reply(

"❌ اكتب ID روم كتابي صحيح.\nمثال: `!idrating 123456789`"

);


}



config.RATING_CHANNEL =
channel.id;


saveConfig();



await message.reply(

`✅ تم حفظ روم التقييم: ${channel}`

);


});



// =========================
// قائمة الأوامر
// !help
// =========================

client.on(
"messageCreate",
async message=>{


if(message.author.bot)
return;


if(
message.content !==
"!help"
)
return;



const embed =

new EmbedBuilder()

.setColor("Blurple")

.setTitle(
"📚 أوامر KRX Bot"
)

.setDescription(

`
**⚙️ إعداد البوت**

\`!idstaff ID\`
تحديد رتبة Staff

\`!idhigh ID\`
تحديد رتبة الإدارة العليا

\`!idticket ID\`
تحديد كاتيجوري التذاكر

\`!idrating ID\`
تحديد روم التقييم

\`!ids\`
عرض الـ IDs المحفوظة


**🎫 التذاكر**

\`!setup1\`
بانل تقديم الإدارة

\`!setup2\`
بانل الدعم

\`دعم\`
استلام التذكرة والحصول على +2 نقطة

\`!rename الاسم\`
تغيير اسم التذكرة

\`!delete\`
حذف التذكرة


**⭐ النقاط**

\`!points\`
عرض نقاطك

\`+point @user 10\`
إضافة نقاط

\`-point @user 10\`
خصم نقاط

\`$top\`
أفضل الإداريين


**🛒 المتجر**

\`!shop\`
عرض المتجر

\`!buy 1\`
شراء منتج

\`!addshop VIP 100\`
إضافة منتج

\`!delshop 1\`
حذف منتج


**📨 الخاص**

\`!dm @user الرسالة\`
إرسال رسالة لشخص

\`!dms الرسالة\`
إرسال رسالة لكل أعضاء السيرفر
`

)

.setTimestamp();



await message.reply({

embeds:[
embed
]

});


});



// =========================
// منع توقف البوت بسبب خطأ
// =========================

process.on(
"unhandledRejection",
error=>{


console.error(

"Unhandled Promise Rejection:",

error

);


});



process.on(
"uncaughtException",
error=>{


console.error(

"Uncaught Exception:",

error

);


});



// =========================
// تشغيل البوت
// لازم يكون آخر سطر
// =========================

client.login(
process.env.TOKEN
);
