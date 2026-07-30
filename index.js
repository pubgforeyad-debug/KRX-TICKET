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

config = JSON.parse(
fs.readFileSync(CONFIG_FILE,"utf8")
);

}


function saveConfig(){

fs.writeFileSync(
CONFIG_FILE,
JSON.stringify(config,null,2)
);

}


// =========================
// نظام النقاط
// =========================

let points = {};

if(fs.existsSync("./points.json")){

points = JSON.parse(
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

const claimedTickets = new Map();


// =========================
// جاهزية البوت
// =========================

client.once("ready",()=>{

console.log(`✅ ${client.user.tag} Online`);

});


// =========================
// أوامر الإعداد
// =========================

const waitingSetup = new Map();


client.on("messageCreate", async message=>{


if(message.author.bot) return;


if(
!message.member ||
!message.member.permissions.has(
PermissionsBitField.Flags.Administrator
)
) return;



if(message.content==="!supportlog"){

waitingSetup.set(
message.author.id,
"supportCategory"
);

return message.reply(
"📂 أرسل ID كاتيجوري الدعم."
);

}



if(message.content==="!staff"){

waitingSetup.set(
message.author.id,
"staffCategory"
);

return message.reply(
"📂 أرسل ID كاتيجوري التقديم."
);

}



if(message.content==="!idstaff"){

waitingSetup.set(
message.author.id,
"supportRole"
);

return message.reply(
"🎖️ أرسل ID رتبة الدعم."
);

}



if(message.content==="!idhigh"){

waitingSetup.set(
message.author.id,
"highRole"
);

return message.reply(
"👑 أرسل ID رتبة الإدارة العليا."
);

}




if(waitingSetup.has(message.author.id)){


const key =
waitingSetup.get(message.author.id);


config[key] =
message.content.trim();


saveConfig();


waitingSetup.delete(
message.author.id
);


return message.reply(
`✅ تم حفظ ${key}`
);


}


});



// =========================
// فتح التذاكر
// =========================

client.on(
Events.InteractionCreate,
async interaction=>{


if(!interaction.isButton())
return;



let type;
let category;
let role;



if(interaction.customId==="apply_ticket"){

type="تقديم";
category=config.staffCategory;
role=config.highRole;

}



if(interaction.customId==="support_ticket"){

type="دعم";
category=config.supportCategory;
role=config.supportRole;

}



if(!type) return;



if(!category){

return interaction.reply({

content:
"❌ لم يتم تحديد الكاتيجوري.",
ephemeral:true

});

}



if(!role){

return interaction.reply({

content:
"❌ لم يتم تحديد الرتبة.",
ephemeral:true

});

}




const oldTicket =
interaction.guild.channels.cache.find(
c=>c.topic===interaction.user.id
);


if(oldTicket){

return interaction.reply({

content:
`❌ لديك تذكرة مفتوحة ${oldTicket}`,

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
category,

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



{

id:
role,

allow:[

PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages,
PermissionsBitField.Flags.ReadMessageHistory

]

}


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



const embed =
new EmbedBuilder()

.setColor("Blue")

.setTitle(
`🎫 تذكرة ${type}`
)

.setDescription(
`مرحباً ${interaction.user}

اكتب تفاصيل طلبك هنا.

لاستلام التذكرة اكتب:
\`دعم\``
)

.setFooter({
text:"KRX Ticket System"
})

.setTimestamp();



await ticket.send({

content:
`${interaction.user} <@&${role}>`,

embeds:[embed],

components:[row]

});



await interaction.reply({

content:
`✅ تم فتح التذكرة ${ticket}`,

ephemeral:true

});


});
// =========================
// استلام التذكرة
// =========================

client.on("messageCreate", async message => {

if(message.author.bot) return;

if(message.content !== "دعم") return;

if(!message.channel.name.startsWith("🎫-"))
return;


// التحقق من الإدارة

const isAdmin =
message.member.roles.cache.has(config.supportRole) ||
message.member.roles.cache.has(config.highRole);


if(!isAdmin){

return message.reply(
"❌ ليس لديك صلاحية لاستلام التذكرة."
);

}


// هل مستلمة؟

if(claimedTickets.has(message.channel.id)){

return message.reply(
`❌ تم استلامها بالفعل بواسطة <@${claimedTickets.get(message.channel.id)}>`
);

}


// تسجيل المستلم

claimedTickets.set(
message.channel.id,
message.author.id
);


// إضافة نقاط

if(!points[message.author.id])
points[message.author.id]=0;


points[message.author.id]+=2;


savePoints();



// رسالة داخل التذكرة

message.channel.send({

embeds:[

new EmbedBuilder()

.setColor("Green")

.setTitle("✅ تم استلام التذكرة")

.setDescription(

`👤 المستلم:
${message.author}

⭐ تمت إضافة:
**+2 نقطة**

📊 مجموع النقاط:
**${points[message.author.id]}**

`

)

.setTimestamp()

]

});



// DM

try{

await message.author.send({

embeds:[

new EmbedBuilder()

.setColor("Green")

.setTitle("🎉 استلام تذكرة")

.setDescription(

`تم استلام تذكرة بنجاح.

⭐ نقاطك الحالية:
**${points[message.author.id]}**`

)

]

});

}catch{}


// لوج الاستلام

if(config.claimLogChannel){


const log =
message.guild.channels.cache.get(
config.claimLogChannel
);


if(log){

log.send({

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
// عرض النقاط
// =========================


client.on("messageCreate", async message=>{


if(message.author.bot) return;


if(message.content !== "!points")
return;


const myPoints =
points[message.author.id] || 0;



message.reply({

embeds:[

new EmbedBuilder()

.setColor("Gold")

.setTitle("⭐ نقاطك")

.setDescription(
`لديك **${myPoints}** نقطة.`
)

.setTimestamp()

]

});


});




// =========================
// إضافة نقاط
// =========================


client.on("messageCreate", async message=>{


if(message.author.bot) return;


if(!message.content.startsWith("+point "))
return;



const isAdmin =
message.member.roles.cache.has(config.supportRole) ||
message.member.roles.cache.has(config.highRole);



if(!isAdmin)
return message.reply(
"❌ ليس لديك صلاحية."
);



const member =
message.mentions.members.first();


const amount =
Number(message.content.split(" ")[2]);



if(!member || isNaN(amount)){

return message.reply(
"الاستخدام:\n+point @user 10"
);

}



if(!points[member.id])
points[member.id]=0;



points[member.id]+=amount;


savePoints();



message.channel.send(

`✅ تمت إضافة **${amount}** نقطة إلى ${member}
⭐ المجموع: **${points[member.id]}**`

);



});




// =========================
// خصم نقاط
// =========================


client.on("messageCreate", async message=>{


if(message.author.bot) return;


if(!message.content.startsWith("-point "))
return;



const isAdmin =
message.member.roles.cache.has(config.supportRole) ||
message.member.roles.cache.has(config.highRole);



if(!isAdmin)
return message.reply(
"❌ ليس لديك صلاحية."
);



const member =
message.mentions.members.first();



const amount =
Number(message.content.split(" ")[2]);



if(!member || isNaN(amount)){

return message.reply(
"الاستخدام:\n-point @user 10"
);

}



if(!points[member.id])
points[member.id]=0;



points[member.id]-=amount;



if(points[member.id]<0)
points[member.id]=0;



savePoints();



message.channel.send(

`➖ تم خصم **${amount}** نقطة من ${member}
⭐ المجموع: **${points[member.id]}**`

);


});




// =========================
// أفضل الإداريين
// =========================


client.on("messageCreate", async message=>{


if(message.author.bot) return;


if(message.content !== "$top")
return;



const top =
Object.entries(points)

.sort((a,b)=>b[1]-a[1])

.slice(0,10);



if(top.length===0)

return message.reply(
"❌ لا توجد نقاط."
);



message.channel.send({

embeds:[

new EmbedBuilder()

.setColor("Gold")

.setTitle("🏆 أفضل الإداريين")

.setDescription(

top.map((x,i)=>

`**${i+1}.** <@${x[0]}> — ⭐ **${x[1]}**`

).join("\n")

)

.setTimestamp()

]

});


});
// =========================
// تغيير اسم التذكرة
// =========================

client.on("messageCreate", async message=>{

if(message.author.bot) return;

if(!message.channel.name.startsWith("🎫-"))
return;


if(!message.content.startsWith("!rename "))
return;


const isAdmin =
message.member.roles.cache.has(config.supportRole) ||
message.member.roles.cache.has(config.highRole);



if(!isAdmin)
return message.reply("❌ ليس لديك صلاحية.");



const newName =
message.content.slice(8).trim();



if(!newName)
return message.reply(
"مثال:\n!rename مشكلة-الدفع"
);



await message.channel.setName(
`🎫-${newName}`
);



message.reply(
`✅ تم تغيير الاسم إلى 🎫-${newName}`
);


});




// =========================
// حذف التذكرة
// =========================

client.on("messageCreate", async message=>{


if(message.author.bot) return;


if(message.content !== "!delete")
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
// إعداد اللوج والتقييم
// =========================

client.on("messageCreate", async message=>{


if(message.author.bot) return;


if(
!message.member.permissions.has(
PermissionsBitField.Flags.Administrator
)
)
return;



if(message.content==="!claimlog"){

return message.reply(
"📋 أرسل ID روم لوج الاستلام."
);

}



if(message.content==="!ratinglog"){

return message.reply(
"⭐ أرسل ID روم التقييم."
);

}



if(/^[0-9]{17,20}$/.test(message.content)){



if(!config.claimLogChannel){

config.claimLogChannel =
message.content;

saveConfig();

return message.reply(
"✅ تم حفظ روم لوج الاستلام."
);

}



if(!config.ratingChannel){

config.ratingChannel =
message.content;

saveConfig();

return message.reply(
"✅ تم حفظ روم التقييم."
);

}


}


});




// =========================
// زر إغلاق التذكرة
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
"اختر تقييمك قبل حذف التذكرة."
)

],

components:[row],

ephemeral:true

});


});




// =========================
// استقبال التقييم
// =========================

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
config.ratingChannel
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
value:`${interaction.user}`,
inline:true
},


{
name:"التقييم",
value:
"⭐".repeat(Number(rate)),
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
// إرسال DM
// =========================

client.on("messageCreate", async message=>{


if(message.author.bot)
return;


if(!message.content.startsWith("!dm"))
return;



if(!message.member.permissions.has(
PermissionsBitField.Flags.Administrator
))
return message.reply("❌ ليس لديك صلاحية.");



const member =
message.mentions.members.first();



if(!member)
return message.reply(
"منشن العضو."
);



const text =
message.content.split(" ")
.slice(2)
.join(" ");



if(!text)
return message.reply(
"اكتب الرسالة."
);



try{


await member.send(text);


message.reply(
"✅ تم إرسال الرسالة."
);



}catch{


message.reply(
"❌ الخاص مغلق."
);


}



});




// =========================
// إرسال للجميع
// =========================

client.on("messageCreate", async message=>{


if(message.author.bot)
return;



if(!message.content.startsWith("!dms"))
return;



if(!message.member.permissions.has(
PermissionsBitField.Flags.Administrator
))
return message.reply("❌ ليس لديك صلاحية.");



const text =
message.content.split(" ")
.slice(1)
.join(" ");



if(!text)
return message.reply(
"اكتب الرسالة."
);



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
`✅ تم الإرسال: ${sent}
❌ فشل: ${failed}`
);



});




// =========================
// تشغيل البوت
// =========================

client.login(process.env.TOKEN);
