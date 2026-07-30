// ===============================
// KRX BOT - PART 1/6
// البداية + الحفظ
// ===============================

const {
Client,
GatewayIntentBits,
PermissionsBitField,
ChannelType,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
Events
} = require("discord.js");

const fs = require("fs");


const client = new Client({

intents:[

GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.MessageContent

]

});


// ===============================
// SETTINGS
// ===============================

let settings = {

STAFF_ROLE: null,
SUPPORT_ROLE: null,
TICKET_CATEGORY: null

};


if(fs.existsSync("./settings.json")){

settings = JSON.parse(
fs.readFileSync("./settings.json","utf8")
);

}


function saveSettings(){

fs.writeFileSync(
"./settings.json",
JSON.stringify(settings,null,2)
);

}



// ===============================
// POINTS
// ===============================

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



// ===============================
// READY
// ===============================

client.once("ready",()=>{

console.log(
`✅ ${client.user.tag} Online`
);

});
// ===============================
// PART 2/6
// IDS SETTINGS
// ===============================


client.on("messageCreate", async message => {

if(message.author.bot) return;


// صلاحية صاحب السيرفر فقط

if(message.author.id !== message.guild.ownerId)
return;



// ===============================
// STAFF ROLE
// ===============================

if(message.content.startsWith("$idstaff")){

const id = message.content.split(" ")[1];


if(!id)
return message.reply(
"❌ اكتب ID الرتبة\nمثال:\n$idstaff 123456789"
);


settings.STAFF_ROLE = id;

saveSettings();


return message.reply(
"✅ تم حفظ ID رتبة الإدارة."
);

}



// ===============================
// SUPPORT ROLE
// ===============================

if(message.content.startsWith("$idsupport")){

const id = message.content.split(" ")[1];


if(!id)
return message.reply(
"❌ اكتب ID الرتبة\nمثال:\n$idsupport 123456789"
);


settings.SUPPORT_ROLE = id;

saveSettings();


return message.reply(
"✅ تم حفظ ID رتبة الإدارة العليا."
);

}



// ===============================
// TICKET CATEGORY
// ===============================

if(message.content.startsWith("$idticket")){

const id = message.content.split(" ")[1];


if(!id)
return message.reply(
"❌ اكتب ID الكاتيجوري\nمثال:\n$idticket 123456789"
);


settings.TICKET_CATEGORY = id;

saveSettings();


return message.reply(
"✅ تم حفظ ID كاتيجوري التذاكر."
);

}


});
// ===============================
// PART 3/6
// TICKET PANELS
// ===============================


client.on("messageCreate", async message => {

if(message.author.bot) return;



// ===============================
// APPLY PANEL
// ===============================

if(message.content === "!setup1"){


const embed = new EmbedBuilder()

.setColor("Blue")

.setTitle("📝 تقديم الإدارة | KRX")

.setDescription(
"اضغط الزر لفتح تذكرة تقديم الإدارة."
)

.setTimestamp();



const row = new ActionRowBuilder()

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



// ===============================
// SUPPORT PANEL
// ===============================


if(message.content === "!setup2"){


const embed = new EmbedBuilder()

.setColor("Blurple")

.setTitle("🎧 الدعم الفني | KRX")

.setDescription(
"اضغط الزر لفتح تذكرة الدعم."
)

.setTimestamp();



const row = new ActionRowBuilder()

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



// ===============================
// MIDDLEMAN PANEL
// ===============================


if(message.content === "!setup3"){


const embed = new EmbedBuilder()

.setColor("Green")

.setTitle("🤝 الوسيط | KRX")

.setDescription(
"اضغط الزر لفتح تذكرة وسيط."
)

.setTimestamp();



const row = new ActionRowBuilder()

.addComponents(

new ButtonBuilder()

.setCustomId("middle_ticket")

.setLabel("🤝 وسيط")

.setStyle(ButtonStyle.Success)

);



message.channel.send({

embeds:[embed],

components:[row]

});


}


});
// ===============================
// PART 4/6
// CREATE TICKETS
// ===============================


client.on(Events.InteractionCreate, async interaction => {


if(!interaction.isButton())
return;



let type;
let role;



// تقديم

if(interaction.customId === "apply_ticket"){

type = "تقديم";

role = settings.STAFF_ROLE;

}



// دعم

if(interaction.customId === "support_ticket"){

type = "دعم";

role = settings.SUPPORT_ROLE;

}



// وسيط

if(interaction.customId === "middle_ticket"){

type = "وسيط";

role = settings.SUPPORT_ROLE;

}



if(!type)
return;



// التأكد من عدم وجود تذكرة

const old = interaction.guild.channels.cache.find(

c => c.topic === interaction.user.id

);


if(old){

return interaction.reply({

content:
`❌ لديك تذكرة مفتوحة بالفعل ${old}`,

ephemeral:true

});

}



// إنشاء التذكرة

const ticket = await interaction.guild.channels.create({

name:`🎫-${type}-${interaction.user.username}`,

type:ChannelType.GuildText,

parent:settings.TICKET_CATEGORY,

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




// زر إغلاق

const row = new ActionRowBuilder()

.addComponents(

new ButtonBuilder()

.setCustomId("close_ticket")

.setLabel("🔒 إغلاق")

.setStyle(ButtonStyle.Danger)

);





const embed = new EmbedBuilder()

.setColor("Blue")

.setTitle("🎫 تذكرة جديدة | KRX")

.setDescription(

`مرحباً ${interaction.user}

اكتب تفاصيل طلبك هنا.`

)

.setTimestamp();





await ticket.send({

content:

`${interaction.user} <@&${role}>`,

embeds:[embed],

components:[row]

});




interaction.reply({

content:

`✅ تم فتح التذكرة ${ticket}`,

ephemeral:true

});


});
// ===============================
// PART 5/6
// POINT SYSTEM
// ===============================


// إضافة نقاط

client.on("messageCreate", async message => {

if(message.author.bot) return;


if(!message.content.startsWith("+point"))
return;



const admin =

message.member.roles.cache.has(settings.STAFF_ROLE)
||
message.member.roles.cache.has(settings.SUPPORT_ROLE);



if(!admin)

return message.reply(
"❌ ليس لديك صلاحية."
);



const member = message.mentions.members.first();

const amount = Number(
message.content.split(" ")[2]
);



if(!member || isNaN(amount))

return message.reply(
"❌ الاستخدام:\n+point @user 10"
);



if(!points[member.id])

points[member.id]=0;



points[member.id]+=amount;


savePoints();



message.reply(

`✅ تمت إضافة **${amount}** نقطة إلى ${member}`

);


});





// خصم نقاط

client.on("messageCreate", async message => {

if(message.author.bot) return;



if(!message.content.startsWith("-point"))

return;



const admin =

message.member.roles.cache.has(settings.STAFF_ROLE)
||
message.member.roles.cache.has(settings.SUPPORT_ROLE);



if(!admin)

return message.reply(
"❌ ليس لديك صلاحية."
);



const member = message.mentions.members.first();


const amount = Number(

message.content.split(" ")[2]

);



if(!member || isNaN(amount))

return message.reply(
"❌ الاستخدام:\n-point @user 10"
);



if(!points[member.id])

points[member.id]=0;



points[member.id]-=amount;



if(points[member.id]<0)

points[member.id]=0;



savePoints();



message.reply(

`➖ تم خصم **${amount}** نقطة من ${member}`

);


});






// عرض النقاط

client.on("messageCreate", async message => {


if(message.author.bot) return;


if(message.content !== "!points")

return;



message.reply({

embeds:[

new EmbedBuilder()

.setColor("Gold")

.setTitle("⭐ نقاطك")

.setDescription(

`لديك **${points[message.author.id] || 0}** نقطة`

)

]

});


});






// أفضل الإداريين

client.on("messageCreate", async message => {


if(message.author.bot) return;


if(message.content !== "$top")

return;



const top = Object.entries(points)

.sort((a,b)=>b[1]-a[1])

.slice(0,10);



if(!top.length)

return message.reply(
"❌ لا يوجد نقاط."
);



message.reply({

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
// ===============================
// PART 6/6
// DM + CLOSE + LOGIN
// ===============================


// ===============================
// DM USER
// ===============================

client.on("messageCreate", async message => {

if(message.author.bot) return;


if(!message.content.startsWith("!dm "))
return;



if(!message.member.permissions.has(
PermissionsBitField.Flags.Administrator
))

return message.reply(
"❌ ليس لديك صلاحية."
);



const member =
message.mentions.members.first();



const text =
message.content.split(" ")
.slice(2)
.join(" ");



if(!member || !text)

return message.reply(
"❌ الاستخدام:\n!dm @user الرسالة"
);



try{

await member.send(text);


message.reply(
"✅ تم إرسال الرسالة."
);


}catch{

message.reply(
"❌ لا يمكن إرسال رسالة لهذا العضو."
);

}


});




// ===============================
// DM ALL
// ===============================

client.on("messageCreate", async message => {

if(message.author.bot) return;


if(!message.content.startsWith("!dms "))
return;



if(!message.member.permissions.has(
PermissionsBitField.Flags.Administrator
))

return message.reply(
"❌ ليس لديك صلاحية."
);



const text =
message.content.slice(5);



if(!text)

return message.reply(
"❌ اكتب الرسالة."
);



let sent = 0;
let failed = 0;



await message.guild.members.fetch();



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

`✅ تم الإرسال: ${sent}\n❌ فشل: ${failed}`

);


});






// ===============================
// CLOSE TICKET
// ===============================

client.on(Events.InteractionCreate, async interaction => {


if(!interaction.isButton())
return;


if(interaction.customId !== "close_ticket")
return;



await interaction.reply(
"🔒 سيتم حذف التذكرة بعد 5 ثواني."
);



setTimeout(()=>{


interaction.channel.delete()
.catch(()=>{});


},5000);



});




// ===============================
// START BOT
// ===============================

client.login(process.env.TOKEN);
