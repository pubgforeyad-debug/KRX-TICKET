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


// ========= الإعدادات =========

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


const claimedTickets = new Map();



client.once("ready",()=>{
 console.log(`✅ Online: ${client.user.tag}`);
});



// ========= البانلات =========

client.on("messageCreate", async message=>{

 if(message.author.bot) return;


 if(message.content === "!setup1"){


  const embed = new EmbedBuilder()
  .setTitle("📝 تقديم الإدارة | KRX")
  .setDescription("اضغط الزر لفتح تذكرة تقديم إدارة.")
  .setTimestamp();


  const button = new ButtonBuilder()
  .setCustomId("apply_ticket")
  .setLabel("📝 تقديم إدارة")
  .setStyle(ButtonStyle.Success);


  message.channel.send({
   embeds:[embed],
   components:[
    new ActionRowBuilder().addComponents(button)
   ]
  });

 }



 if(message.content === "!setup2"){


  const embed = new EmbedBuilder()
  .setTitle("🎧 الدعم | KRX")
  .setDescription("اضغط الزر لفتح تذكرة دعم.")
  .setTimestamp();


  const button = new ButtonBuilder()
  .setCustomId("support_ticket")
  .setLabel("🎧 دعم")
  .setStyle(ButtonStyle.Primary);


  message.channel.send({
   embeds:[embed],
   components:[
    new ActionRowBuilder().addComponents(button)
   ]
  });


 }

});




// ========= فتح التيكت =========

client.on(Events.InteractionCreate, async interaction=>{


 if(!interaction.isButton()) return;


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


 if(!type) return;



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


   ...roles.map(r=>({

    id:r,

    allow:[
     PermissionsBitField.Flags.ViewChannel,
     PermissionsBitField.Flags.SendMessages
    ]

   }))

  ]

 });


 interaction.reply({
  content:`✅ تم فتح التذكرة ${ticket}`,
  ephemeral:true
 });


});
// ========= إرسال رسالة داخل التيكت =========

client.on(Events.InteractionCreate, async interaction=>{

 if(!interaction.isButton()) return;


 if(
  interaction.customId !== "apply_ticket" &&
  interaction.customId !== "support_ticket"
 ) return;



 const channel = interaction.guild.channels.cache.find(
  c => c.name.includes(interaction.user.username)
 );

 if(!channel) return;



 const roles =
 interaction.customId === "apply_ticket"
 ? APPLY_ADMIN
 : SUPPORT_ADMIN;



 const mention = roles
 .map(r=>`<@&${r}>`)
 .join(" ");



 const embed = new EmbedBuilder()

 .setTitle("🎫 تذكرة جديدة | KRX")

 .setDescription(
`مرحباً ${interaction.user} 👋

برجاء انتظار الإدارة للرد عليك في أسرع وقت.

**الإدارة المسؤولة:**
${mention}`
 )

 .setTimestamp();



 channel.send({

  content:`${interaction.user} ${mention}`,

  embeds:[embed]

 });


});





// ========= استلام التيكت =========


client.on("messageCreate", async message=>{


 if(message.author.bot) return;



 if(message.content === "دعم"){



  if(!message.channel.name.startsWith("🎫")) return;



  // إذا تم الاستلام من قبل

  if(claimedTickets.has(message.channel.id)){


   return message.reply(
    `❌ تم استلام هذه التذكرة مسبقاً بواسطة <@${claimedTickets.get(message.channel.id)}>`
   );


  }



  // تسجيل المستلم

  claimedTickets.set(
   message.channel.id,
   message.author.id
  );



  message.channel.send(
   `✅ تم استلام التذكرة بواسطة ${message.author}`
  );



  // رسالة خاصة

  try{

   await message.author.send(

`🎉 تم استلام تذكرة KRX بنجاح!

🎫 التذكرة:
${message.channel.name}

➕ تمت إضافة +2 نقطة إلى حسابك ⭐

(النقاط غير محفوظة، مجرد رسالة تشجيعية)`

   );

  }catch{}



  // اللوج

  const log =
  message.guild.channels.cache.get(CLAIM_LOG_CHANNEL);



  if(log){

   log.send(

`📌 **استلام تذكرة**

👤 الإداري:
${message.author}

🎫 التيكت:
${message.channel}`

   );

  }


 }


});



// ========= إضافة عضو =========


client.on("messageCreate", async message=>{


 if(message.author.bot) return;



 if(message.content.startsWith("$add")){


  if(!message.channel.name.startsWith("🎫")) return;



  const member =
  message.mentions.members.first();



  if(!member)
  return message.reply("❌ منشن العضو");



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




// ========= إزالة عضو =========


client.on("messageCreate", async message=>{


 if(message.author.bot) return;



 if(message.content.startsWith("$remove")){


  if(!message.channel.name.startsWith("🎫")) return;



  const member =
  message.mentions.members.first();



  if(!member)
  return message.reply("❌ منشن العضو");



  await message.channel.permissionOverwrites.delete(
   member.id
  );



  message.reply(
   `❌ تم إزالة ${member} من التذكرة`
  );


 }


});
// ========= إنهاء التذكرة والتقييم =========

client.on("messageCreate", async message=>{


 if(message.author.bot) return;



 if(message.content === "$تم"){


  if(!message.channel.name.startsWith("🎫")) return;



  const embed = new EmbedBuilder()

  .setTitle("✅ تم إنهاء التذكرة")

  .setDescription(
   "شكراً لاستخدامك KRX 💙\n\nيرجى تقييم الخدمة من النجوم ⭐"
  )

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


// ========= استقبال التقييم =========


client.on(Events.InteractionCreate, async interaction=>{


 if(!interaction.isButton()) return;



 if(interaction.customId.startsWith("rate_")){


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

   content:`شكراً لتقييمك ⭐ ${rate}/5`,

   ephemeral:true

  });


 }


});


// ========= حذف التذكرة =========


client.on("messageCreate", async message=>{


 if(message.author.bot) return;



 if(message.content === "!delete"){


  if(!message.channel.name.startsWith("🎫")) return;



  message.reply(
   "🗑️ سيتم حذف التذكرة بعد 5 ثواني"
  );



  setTimeout(()=>{


   message.channel.delete();


  },5000);



 }


});




// ========= زر إغلاق التذكرة =========


client.on(Events.InteractionCreate, async interaction=>{


 if(!interaction.isButton()) return;



 if(interaction.customId === "close_ticket"){


  interaction.reply(
   "🔒 سيتم حذف التذكرة بعد 5 ثواني"
  );



  setTimeout(()=>{


   interaction.channel.delete();


  },5000);



 }


});



// ========= تشغيل البوت =========

client.login(process.env.TOKEN);
