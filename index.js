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

const config = require("./config.json");


// =========================
// POINTS
// =========================

let points = {};

if(fs.existsSync("./points.json")){

points =
JSON.parse(
fs.readFileSync("./points.json","utf8")
);

}


function savePoints(){

fs.writeFileSync(
"./points.json",
JSON.stringify(points,null,2)
);

}


// =========================
// SHOP
// =========================

let shop=[];

if(fs.existsSync("./shop.json")){

shop =
JSON.parse(
fs.readFileSync("./shop.json","utf8")
);

}


function saveShop(){

fs.writeFileSync(
"./shop.json",
JSON.stringify(shop,null,2)
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


client.on("messageCreate",async message=>{


if(message.author.bot)return;


// ===== APPLY PANEL =====


if(message.content==="!setup1"){


const embed =
new EmbedBuilder()

.setColor("Blue")

.setTitle("📝 تقديم الإدارة | KRX")

.setDescription(
"اضغط الزر لفتح تذكرة التقديم."
)

.setTimestamp();



const row =
new ActionRowBuilder()

.addComponents(

new ButtonBuilder()

.setCustomId("apply_ticket")

.setLabel("📝 تقديم")

.setStyle(ButtonStyle.Success)

);



message.channel.send({

embeds:[embed],

components:[row]

});

}



// ===== SUPPORT PANEL =====


if(message.content==="!setup2"){


const embed =
new EmbedBuilder()

.setColor("Blurple")

.setTitle("🎧 الدعم الفني | KRX")

.setDescription(
"اضغط الزر لفتح تذكرة الدعم."
)

.setTimestamp();



const row =
new ActionRowBuilder()

.addComponents(

new ButtonBuilder()

.setCustomId("support_ticket")

.setLabel("🎧 دعم")

.setStyle(ButtonStyle.Primary)

);



message.channel.send({

embeds:[embed],

components:[row]

});


}


});
// =========================
// فتح التذاكر
// =========================

client.on(Events.InteractionCreate, async interaction => {

if(!interaction.isButton()) return;


let type;
let roles=[];


if(interaction.customId==="apply_ticket"){

type="تقديم";

roles=config.APPLY_ADMIN;

}



if(interaction.customId==="support_ticket"){

type="دعم";

roles=config.SUPPORT_ADMIN;

}



if(!type) return;



const oldTicket =
interaction.guild.channels.cache.find(
c=>c.topic===interaction.user.id
);



if(oldTicket){

return interaction.reply({

content:
`❌ لديك تذكرة مفتوحة بالفعل ${oldTicket}`,

ephemeral:true

});

}




const ticket =
await interaction.guild.channels.create({

name:
`🎫-${type}-${interaction.user.username}`,

type:
ChannelType.GuildText,

parent:
config.TICKET_CATEGORY,

topic:
interaction.user.id,


permissionOverwrites:[

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




const row =
new ActionRowBuilder()

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



const mention =
roles.map(r=>`<@&${r}>`).join(" ");



const embed =
new EmbedBuilder()

.setColor("Blue")

.setTitle("🎫 تذكرة جديدة | KRX")

.setDescription(

`مرحباً ${interaction.user}

اكتب تفاصيل طلبك.

لاستلام التذكرة اكتب:

\`دعم\``

)

.setTimestamp();



await ticket.send({

content:
`${interaction.user} ${mention}`,

embeds:[embed],

components:[row]

});



interaction.reply({

content:
`✅ تم فتح التذكرة ${ticket}`,

ephemeral:true

});


});




// =========================
// استلام التذكرة + نقاط
// =========================


const claimedTickets = new Map();



client.on("messageCreate",async message=>{


if(message.author.bot)return;


if(message.content!=="دعم")
return;


if(!message.channel.name.startsWith("🎫-"))
return;



const admin =

config.SUPPORT_ADMIN.some(r=>
message.member.roles.cache.has(r)
)

||

config.APPLY_ADMIN.some(r=>
message.member.roles.cache.has(r)
);



if(!admin){

return message.reply(
"❌ ليس لديك صلاحية."
);

}



if(claimedTickets.has(message.channel.id)){


return message.reply(

`❌ مستلمة بواسطة <@${claimedTickets.get(message.channel.id)}>`

);

}



claimedTickets.set(

message.channel.id,

message.author.id

);



if(!points[message.author.id])

points[message.author.id]=0;



points[message.author.id]+=2;


savePoints();



message.channel.send({

embeds:[

new EmbedBuilder()

.setColor("Green")

.setTitle("✅ تم استلام التذكرة")

.setDescription(

`👤 الإداري:
${message.author}

⭐ حصل على +2 نقطة`

)

]

});



try{

message.author.send(

`🎉 تم استلام تذكرة\n⭐ نقاطك الآن: ${points[message.author.id]}`

);

}catch{}



});
// =========================
// عرض النقاط
// !points
// =========================

client.on("messageCreate",async message=>{

if(message.author.bot)return;

if(message.content!=="!points")
return;


const embed =
new EmbedBuilder()

.setColor("Gold")

.setTitle("⭐ نقاطك")

.setDescription(
`لديك **${points[message.author.id] || 0}** نقطة.`
)

.setTimestamp();



message.reply({

embeds:[embed]

});


});




// =========================
// إضافة نقاط
// $point @user العدد
// =========================

client.on("messageCreate", async message => {

if(message.author.bot) return;

if(!message.content.startsWith("$point"))
return;


const admin =
config.SUPPORT_ADMIN.some(r =>
message.member.roles.cache.has(r)
)
||
config.APPLY_ADMIN.some(r =>
message.member.roles.cache.has(r)
);


if(!admin)
return message.reply("❌ ليس لديك صلاحية.");


const member = message.mentions.members.first();

const amount = Number(
message.content.split(" ")[2]
);


if(!member || isNaN(amount))
return message.reply(
"❌ الاستخدام:\n$point @user 10"
);


if(!points[member.id])
points[member.id]=0;


points[member.id]+=amount;


savePoints();


message.reply(
`✅ تمت إضافة **${amount}** نقطة إلى ${member}`
);


});
// =========================
// خصم نقاط
// -point @user 10
// =========================


client.on("messageCreate",async message=>{


if(message.author.bot)return;


if(!message.content.startsWith("-point "))
return;



const admin =

config.SUPPORT_ADMIN.some(r=>
message.member.roles.cache.has(r)
)

||

config.APPLY_ADMIN.some(r=>
message.member.roles.cache.has(r)
);



if(!admin)
return message.reply("❌ ليس لديك صلاحية.");



const member =
message.mentions.members.first();



const amount =
Number(message.content.split(" ")[2]);



if(!member || isNaN(amount))

return message.reply(
"الاستخدام:\n-point @user 10"
);



if(!points[member.id])

points[member.id]=0;



points[member.id]-=amount;



if(points[member.id]<0)

points[member.id]=0;



savePoints();



message.channel.send(

`➖ تم خصم ${amount} نقطة من ${member}`

);


});




// =========================
// أفضل الإداريين
// $top
// =========================


client.on("messageCreate",async message=>{


if(message.author.bot)return;


if(message.content!="$top")
return;



const top =

Object.entries(points)

.sort((a,b)=>b[1]-a[1])

.slice(0,10);



if(!top.length)

return message.reply(
"❌ لا يوجد نقاط."
);



message.channel.send({

embeds:[

new EmbedBuilder()

.setColor("Gold")

.setTitle("🏆 أفضل الإداريين")

.setDescription(

top.map((x,i)=>

`${i+1}- <@${x[0]}> ⭐ ${x[1]}`

).join("\n")

)

]

});


});




// =========================
// SHOP
// =========================


// !shop

client.on("messageCreate",async message=>{


if(message.author.bot)return;


if(message.content!=="!shop")
return;



if(!shop.length)

return message.reply(
"🛒 الشوب فارغ."
);



const embed =
new EmbedBuilder()

.setColor("Gold")

.setTitle("🛒 متجر النقاط")

.setDescription(

shop.map((x,i)=>

`${i+1}- **${x.name}**
⭐ السعر: ${x.price}`

).join("\n\n")

);



message.reply({

embeds:[embed]

});


});




// =========================
// شراء
// !buy رقم
// =========================


client.on("messageCreate",async message=>{


if(message.author.bot)return;


if(!message.content.startsWith("!buy "))
return;



const id =
Number(message.content.split(" ")[1])-1;



if(!shop[id])

return message.reply(
"❌ المنتج غير موجود."
);



const item=shop[id];


const userPoints =
points[message.author.id] || 0;



if(userPoints < item.price)

return message.reply(
"❌ لا تملك نقاط كافية."
);



points[message.author.id]-=item.price;


savePoints();



message.reply(

`✅ اشتريت **${item.name}**
⭐ تم خصم ${item.price} نقطة`

);


});




// =========================
// إضافة منتج
// صاحب السيرفر
// !addshop اسم السعر
// =========================


client.on("messageCreate",async message=>{


if(message.author.bot)return;


if(!message.content.startsWith("!addshop "))
return;



if(message.author.id !== message.guild.ownerId)

return message.reply(
"❌ هذا الأمر لصاحب السيرفر."
);



const args =
message.content.split(" ").slice(1);



const price =
Number(args.pop());



const name =
args.join(" ");



if(!name || isNaN(price))

return message.reply(
"الاستخدام:\n!addshop VIP 100"
);



shop.push({

name:name,

price:price

});


saveShop();



message.reply(
`✅ تمت إضافة ${name}`
);


});
// =========================
// حذف منتج من الشوب
// !delshop رقم
// =========================

client.on("messageCreate",async message=>{


if(message.author.bot)return;


if(!message.content.startsWith("!delshop "))
return;



if(message.author.id !== message.guild.ownerId)

return message.reply(
"❌ هذا الأمر لصاحب السيرفر فقط."
);



const id =
Number(message.content.split(" ")[1])-1;



if(!shop[id])

return message.reply(
"❌ المنتج غير موجود."
);



const removed =
shop.splice(id,1)[0];


saveShop();



message.reply(
`🗑️ تم حذف ${removed.name} من الشوب.`
);


});




// =========================
// تغيير اسم التذكرة
// !rename
// =========================

client.on("messageCreate",async message=>{


if(message.author.bot)return;


if(!message.content.startsWith("!rename "))
return;



if(!message.channel.name.startsWith("🎫-"))
return;



const admin =

config.SUPPORT_ADMIN.some(r=>
message.member.roles.cache.has(r)
)

||

config.APPLY_ADMIN.some(r=>
message.member.roles.cache.has(r)
);



if(!admin)

return message.reply(
"❌ ليس لديك صلاحية."
);



const name =
message.content.slice(8).trim();



if(!name)

return message.reply(
"مثال: !rename مشكلة"
);



await message.channel.setName(
`🎫-${name}`
);



message.reply(
"✅ تم تغيير اسم التذكرة."
);


});




// =========================
// حذف التذكرة
// !delete
// =========================


client.on("messageCreate",async message=>{


if(message.author.bot)return;


if(message.content!=="!delete")
return;



if(!message.channel.name.startsWith("🎫-"))
return;



message.reply(
"🗑️ سيتم حذف التذكرة بعد 5 ثواني."
);



setTimeout(()=>{

message.channel.delete()
.catch(()=>{});

},5000);


});




// =========================
// التقييم
// =========================


client.on(
Events.InteractionCreate,
async interaction=>{


if(!interaction.isButton())
return;


if(interaction.customId!=="close_ticket")
return;



const row =
new ActionRowBuilder()

.addComponents(

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

.setDescription(
"اختر تقييمك."
)

],

components:[row]

});


});




// استقبال التقييم

client.on(
Events.InteractionCreate,
async interaction=>{


if(!interaction.isButton())
return;


if(!interaction.customId.startsWith("rate_"))
return;



const rate =
interaction.customId.split("_")[1];



const channel =
interaction.guild.channels.cache.get(
config.RATING_CHANNEL
);



if(channel){

channel.send({

embeds:[

new EmbedBuilder()

.setColor("Yellow")

.setTitle("⭐ تقييم جديد")

.addFields(

{
name:"العضو",
value:`${interaction.user}`
},

{
name:"التقييم",
value:"⭐".repeat(Number(rate))
}

)

]

});

}



interaction.reply({

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
// DM
// !dm
// =========================


client.on("messageCreate",async message=>{


if(message.author.bot)return;


if(!message.content.startsWith("!dm"))
return;



if(!message.member.permissions.has(
PermissionsBitField.Flags.Administrator
))

return;



const member =
message.mentions.members.first();



const text =
message.content.split(" ")
.slice(2)
.join(" ");



if(!member || !text)

return message.reply(
"!dm @user الرسالة"
);



try{

await member.send(text);

message.reply(
"✅ تم الإرسال."
);


}catch{

message.reply(
"❌ الخاص مغلق."
);

}


});




// =========================
// DMS للجميع
// =========================


client.on("messageCreate",async message=>{


if(message.author.bot)return;


if(!message.content.startsWith("!dms"))
return;



if(!message.member.permissions.has(
PermissionsBitField.Flags.Administrator
))

return;



const text =
message.content.split(" ")
.slice(1)
.join(" ");



let sent=0;
let failed=0;



for(const member of message.guild.members.cache.values()){


if(member.user.bot)
continue;


try{

await member.send(text);

sent++;

}catch{

failed++;

}


}



message.reply(

`✅ ${sent}
❌ ${failed}`

);


});




// =========================
// تشغيل البوت
// =========================

client.login(process.env.TOKEN);
