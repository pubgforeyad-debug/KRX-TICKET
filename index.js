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
    GatewayIntentBits.MessageContent
  ]
});


// ================= الإعدادات =================

const TICKET_CATEGORY = "1531926623580979230";

const RATING_CHANNEL = "1531943465091596402";

const CLAIM_LOG_CHANNEL = "1531943869682548826";


// تقديم
const APPLY_ADMIN = [
  "1528157507665658018",
  "1528157508869558463"
];


// دعم
const SUPPORT_ADMIN = [
  "1528157557192134726",
  "1528157558416609331"
];


// حفظ المستلمين
const claimedTickets = new Map();


// تشغيل البوت

client.once("ready",()=>{

 console.log(`✅ Online: ${client.user.tag}`);

});



// ================= البانلات =================


client.on("messageCreate", async message=>{


 if(message.author.bot) return;



 if(message.content === "!setup1"){


  const embed = new EmbedBuilder()

  .setTitle("📝 تقديم الإدارة | KRX")

  .setDescription(
    "اضغط على الزر لفتح تذكرة تقديم.\n\nسيتم الرد عليك من الإدارة."
  )

  .setFooter({
    text:"KRX"
  })

  .setTimestamp();



  const button = new ButtonBuilder()

  .setCustomId("apply_ticket")

  .setLabel("📝 تقديم إدارة")

  .setStyle(ButtonStyle.Success);



  const row = new ActionRowBuilder()

  .addComponents(button);



  message.channel.send({

    embeds:[embed],

    components:[row]

  });


 }



 if(message.content === "!setup2"){


  const embed = new EmbedBuilder()

  .setTitle("🎧 الدعم | KRX")

  .setDescription(
    "اضغط على الزر لفتح تذكرة دعم.\n\nسيتم الرد عليك بأسرع وقت."
  )

  .setFooter({
    text:"KRX"
  })

  .setTimestamp();



  const button = new ButtonBuilder()

  .setCustomId("support_ticket")

  .setLabel("🎧 دعم")

  .setStyle(ButtonStyle.Primary);



  const row = new ActionRowBuilder()

  .addComponents(button);



  message.channel.send({

    embeds:[embed],

    components:[row]

  });


 }

});
// ================= فتح التيكت =================

client.on(Events.InteractionCreate, async interaction => {

 if(!interaction.isButton()) return;


 let type;
 let roles;


 if(interaction.customId === "apply_ticket"){

  type = "تقديم";
  roles = APPLY_ADMIN;

 }


 if(interaction.customId === "support_ticket"){

  type = "دعم";
  roles = SUPPORT_ADMIN;

 }


 if(!type) return;




 // منع فتح تيكت من نفس النوع

 const exists = interaction.guild.channels.cache.find(

  c =>
  c.name.includes(interaction.user.username)
  &&
  c.name.includes(type)

 );


 if(exists){

  return interaction.reply({

   content:`❌ لديك تيكت ${type} مفتوح بالفعل`,

   ephemeral:true

  });

 }




 // إنشاء الروم

 const ticket = await interaction.guild.channels.create({

  name:`🎫-${type}-${interaction.user.username}`,

  type:ChannelType.GuildText,

  parent:TICKET_CATEGORY,


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

     PermissionsBitField.Flags.SendMessages

    ]

   },


   ...roles.map(role => ({


    id:role,

    allow:[

     PermissionsBitField.Flags.ViewChannel,

     PermissionsBitField.Flags.SendMessages

    ]

   }))

  ]

 });


 // زر الإغلاق

 const closeButton = new ButtonBuilder()

 .setCustomId("close_ticket")

 .setLabel("🔒 إغلاق التذكرة")

 .setStyle(ButtonStyle.Danger);



 const row = new ActionRowBuilder()

 .addComponents(closeButton);


 // منشن الإدارة

 const mention = roles
 .map(r => `<@&${r}>`)
 .join(" ");


 const embed = new EmbedBuilder()

 .setTitle("🎫 تذكرة جديدة | KRX")

 .setDescription(

`مرحباً ${interaction.user} 👋


برجاء انتظار الدعم والرد عليك في أسرع وقت.


**نوع التذكرة:**
${type}


**الإدارة المسؤولة:**
${mention}`

 )

 .setFooter({

  text:"KRX Support"

 })

 .set
  // ================= استلام التيكت =================

client.on("messageCreate", async message => {

 if(message.author.bot) return;


 if(message.content === "دعم") {


  if(!message.channel.name.startsWith("🎫")) return;



  // منع استلام أكثر من إداري

  if(claimedTickets.has(message.channel.id)) {


   const claimed = claimedTickets.get(message.channel.id);


   return message.reply(
    `❌ هذه التذكرة تم استلامها بالفعل بواسطة <@${claimed}>`
   );


  }



  // حفظ المستلم

  claimedTickets.set(
    message.channel.id,
    message.author.id
  );



  message.channel.send(
   `✅ تم استلام التذكرة بواسطة ${message.author}`
  );



  // رسالة خاصة للإداري

  try {


   await message.author.send(

`🎉 تم استلام التذكرة بنجاح!

🎫 التذكرة:
${message.channel.name}

➕ تمت إضافة +2 نقطة إلى حسابك ⭐

(هذه رسالة تشجيعية فقط والنقاط غير محفوظة)`

   );


  } catch(err) {

   console.log("DM مغلق");

  }




  // اللوج

  const log =
  message.guild.channels.cache.get(CLAIM_LOG_CHANNEL);



  if(log){

   log.send(

`📌 **تم استلام تذكرة**

👤 الإداري:
${message.author}

🎫 التذكرة:
${message.channel}`

   );

  }


 }


});






// ================= إضافة عضو =================

client.on("messageCreate", async message => {


 if(message.author.bot) return;



 if(message.content.startsWith("$add")) {



  if(!message.channel.name.startsWith("🎫")) return;



  const member =
  message.mentions.members.first();



  if(!member){

   return message.reply(
    "❌ من فضلك اعمل منشن للعضو"
   );

  }




  await message.channel.permissionOverwrites.edit(

   member.id,

   {

    ViewChannel:true,

    SendMessages:true

   }

  );




  message.reply(
   `✅ تم إضافة ${member} إلى التذكرة`
  );


 }


});

// ================= إزالة عضو =================

client.on("messageCreate", async message => {


 if(message.author.bot) return;



 if(message.content.startsWith("$remove")) {



  if(!message.channel.name.startsWith("🎫")) return;



  const member =
  message.mentions.members.first();



  if(!member){

   return message.reply(
    "❌ من فضلك اعمل منشن للعضو"
   );

  }




  await message.channel.permissionOverwrites.delete(

   member.id

  );




  message.reply(
   `❌ تم إزالة ${member} من التذكرة`
  );


 }


});
  // ================= إنهاء التذكرة والتقييم =================

client.on("messageCreate", async message => {


 if(message.author.bot) return;



 if(message.content === "$تم") {


  if(!message.channel.name.startsWith("🎫")) return;



  const embed = new EmbedBuilder()

  .setTitle("✅ تم إنهاء التذكرة")

  .setDescription(
    "شكراً لاستخدامك خدمة KRX 💙\n\nبرجاء تقييم الخدمة من خلال النجوم ⭐"
  )

  .setFooter({
    text:"KRX Support"
  })

  .setTimestamp();




  const row = new ActionRowBuilder();



  for(let i = 1; i <= 5; i++){


   row.addComponents(

    new ButtonBuilder()

    .setCustomId(`rate_${i}`)

    .setLabel("⭐".repeat(i))

    .setStyle(ButtonStyle.Secondary)

   );


  }




  message.channel.send({

   embeds:[embed],

   components:[row]

  });


 }


});







// ================= استقبال التقييم =================

client.on(Events.InteractionCreate, async interaction => {


 if(!interaction.isButton()) return;



 if(interaction.customId.startsWith("rate_")) {



  const rate =
  interaction.customId.split("_")[1];



  const channel =
  interaction.guild.channels.cache.get(RATING_CHANNEL);



  if(channel){


   channel.send(

`⭐ **تقييم جديد**

👤 العضو:
${interaction.user}

⭐ التقييم:
${"⭐".repeat(rate)}`

   );


  }




  interaction.reply({

   content:`شكراً على تقييمك ⭐ ${rate}/5`,

   ephemeral:true

  });


 }


});







// ================= حذف التيكت =================

client.on("messageCreate", async message => {


 if(message.author.bot) return;



 if(message.content === "!delete") {



  if(!message.channel.name.startsWith("🎫")) return;



  message.reply(
   "🗑️ سيتم حذف التذكرة بعد 5 ثواني"
  );



  setTimeout(()=>{


   message.channel.delete();


  },5000);



 }


});








// ================= زر إغلاق التيكت =================

client.on(Events.InteractionCreate, async interaction => {


 if(!interaction.isButton()) return;



 if(interaction.customId === "close_ticket") {



  await interaction.reply(
   "🔒 سيتم حذف التذكرة بعد 5 ثواني"
  );



  setTimeout(()=>{


   interaction.channel.delete();


  },5000);



 }


});

// ================= تشغيل البوت =================

client.login(process.env.TOKEN);
