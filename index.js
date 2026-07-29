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


// إدارة التقديم (العليا)
const HIGH_ADMIN = [
  "1528157604482912307",
  "1528157603564355716"
];


// إدارة الدعم (الصغرى)
const SUPPORT_ADMIN = [
  "1528157557192134726",
  "1528157558416609331"
];



// تشغيل البوت
client.once("ready", () => {

 console.log(`✅ Online: ${client.user.tag}`);

});





// ================= البانلات =================

client.on("messageCreate", async message => {


 if(message.author.bot) return;



 // بانل التقديم

 if(message.content === "!setup1"){


 const embed = new EmbedBuilder()

 .setTitle("📝 تقديم الإدارة | KRX")

 .setDescription(
 "اضغط على الزر بالأسفل لفتح تذكرة تقديم للإدارة.\n\nسيتم الرد عليك من الإدارة العليا."
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





 // بانل الدعم

 if(message.content === "!setup2"){


 const embed = new EmbedBuilder()

 .setTitle("🎧 الدعم | KRX")

 .setDescription(
 "اضغط على الزر بالأسفل لفتح تذكرة دعم.\n\nسيتم الرد عليك من فريق الدعم."
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


});// ================= فتح التذاكر =================

client.on(Events.InteractionCreate, async interaction => {


 if(!interaction.isButton()) return;



 let type;
 let roles;



 if(interaction.customId === "apply_ticket"){

  type = "تقديم";

  roles = HIGH_ADMIN;

 }



 if(interaction.customId === "support_ticket"){

  type = "دعم";

  roles = SUPPORT_ADMIN;

 }



 if(!type) return;





 // منع نفس النوع فقط

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

 const close = new ButtonBuilder()

 .setCustomId("close_ticket")

 .setLabel("🔒 إغلاق التذكرة")

 .setStyle(ButtonStyle.Danger);



 const row = new ActionRowBuilder()

 .addComponents(close);





 const mention = roles.map(r=>`<@&${r}>`).join(" ");





 const embed = new EmbedBuilder()

 .setTitle("🎫 تذكرة جديدة")

 .setDescription(

 `مرحباً ${interaction.user} 👋


برجاء انتظار الإدارة للرد عليك في أسرع وقت ممكن.


**القسم:**
${type}


**الإدارة المسؤولة:**
${mention}`

 )

 .setFooter({

 text:"KRX Support"

 })

 .setTimestamp();





 await ticket.send({

  content:`${interaction.user}`,

  embeds:[embed],

  components:[row]

 });



 await interaction.reply({

  content:`✅ تم فتح التذكرة: ${ticket}`,

  ephemeral:true

 });


});
// ================= استلام التذكرة =================

client.on("messageCreate", async message => {

 if(message.author.bot) return;


 if(message.content === "دعم"){


  if(!message.channel.name.startsWith("🎫")) return;



  await message.channel.send(
    `✅ تم استلام التذكرة بواسطة ${message.author}`
  );



  const logChannel =
  message.guild.channels.cache.get(CLAIM_LOG_CHANNEL);



  if(logChannel){

   logChannel.send(
    `📌 **تم استلام تذكرة**\n\n`+
    `👤 الإداري: ${message.author}\n`+
    `🎫 التذكرة: ${message.channel}`
   );

  }


 }

});

// ================= إنهاء التذكرة =================

client.on("messageCreate", async message => {


 if(message.author.bot) return;



 if(message.content === "$تم"){


  if(!message.channel.name.startsWith("🎫")) return;



  const embed = new EmbedBuilder()

  .setTitle("✅ تم إنهاء التذكرة")

  .setDescription(

  `شكراً لاستخدامك خدمة الدعم 💙


برجاء تقييمنا من خلال النجوم بالأسفل ⭐`

  )

  .setFooter({

   text:"KRX Support"

  })

  .setTimestamp();




  const stars = new ActionRowBuilder();



  for(let i = 1; i <= 5; i++){


   stars.addComponents(

    new ButtonBuilder()

    .setCustomId(`rate_${i}`)

    .setLabel("⭐".repeat(i))

    .setStyle(ButtonStyle.Secondary)

   );

  }



  message.channel.send({

   embeds:[embed],

   components:[stars]

  });


 }

});








// ================= التقييم =================

client.on(Events.InteractionCreate, async interaction => {


 if(!interaction.isButton()) return;


 if(interaction.customId.startsWith("rate_")){


  const rate =
  interaction.customId.split("_")[1];



  const ratingChannel =
  interaction.guild.channels.cache.get(RATING_CHANNEL);



  if(ratingChannel){


   ratingChannel.send(

    `⭐ **تقييم جديد**\n\n`+
    `👤 العضو: ${interaction.user}\n`+
    `⭐ التقييم: ${"⭐".repeat(rate)}`

   );


  }



  interaction.reply({

   content:`شكراً لتقييمك ⭐ ${rate}/5`,

   ephemeral:true

  });


 }

});







// ================= حذف التذكرة =================

client.on("messageCreate", async message => {


 if(message.author.bot) return;


 if(message.content === "!delete"){


  if(!message.channel.name.startsWith("🎫")) return;



  message.reply("🗑️ سيتم حذف التذكرة بعد 5 ثواني");


  setTimeout(()=>{

   message.channel.delete();

  },5000);


 }


});







// ================= زر الإغلاق =================

client.on(Events.InteractionCreate, async interaction => {


 if(!interaction.isButton()) return;



 if(interaction.customId === "close_ticket"){


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
