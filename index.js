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


// الكاتيجوري
const TICKET_CATEGORY = "1531926623580979230";


// تقديم إدارة (العليا)
const HIGH_ADMIN = [
  "1528157604482912307",
  "1528157603564355716"
];


// الدعم (الصغرى فقط)
const SUPPORT_ADMIN = [
  "1528157557192134726",
  "1528157558416609331"
];



// تشغيل البوت
client.once("ready",()=>{

 console.log(`✅ ${client.user.tag}`);

});




// إنشاء الأزرار
client.on("messageCreate", async message=>{

 if(message.author.bot) return;


 if(message.content === "!setup"){


  const apply = new ButtonBuilder()
  .setCustomId("apply_ticket")
  .setLabel("📝 تقديم إدارة")
  .setStyle(ButtonStyle.Success);


  const support = new ButtonBuilder()
  .setCustomId("support_ticket")
  .setLabel("🎧 دعم")
  .setStyle(ButtonStyle.Primary);



  const row = new ActionRowBuilder()
  .addComponents(apply,support);



  message.channel.send({

   content:"🎫 اختر نوع التذكرة:",

   components:[row]

  });


 }

});








// فتح التيكت
client.on(Events.InteractionCreate, async interaction=>{


 if(!interaction.isButton()) return;



 let type;
 let roles;



 if(interaction.customId==="apply_ticket"){

  type="تقديم";
  roles=HIGH_ADMIN;

 }



 if(interaction.customId==="support_ticket"){

  type="دعم";
  roles=SUPPORT_ADMIN;

 }



 if(!type) return;



 // منع نفس النوع فقط
 const exists = interaction.guild.channels.cache.find(
 c =>
 c.name.includes(interaction.user.username) &&
 c.name.includes(type)
 );


 if(exists){

 return interaction.reply({

 content:`❌ لديك تيكت ${type} مفتوح بالفعل`,

 ephemeral:true

 });

 }





 const ticket =
 await interaction.guild.channels.create({


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





 const close = new ButtonBuilder()

 .setCustomId("close_ticket")

 .setLabel("🔒 إغلاق")

 .setStyle(ButtonStyle.Danger);



 const row = new ActionRowBuilder()
 .addComponents(close);





 const mention = roles.map(r=>`<@&${r}>`).join(" ");




 const embed = new EmbedBuilder()

 .setTitle("🎫 تذكرة جديدة")

 .setDescription(

 `مرحبا بك ${interaction.user} 👋


برجاء انتظار الإدارة للرد عليك في أسرع وقت ممكن.


**نوع التذكرة:**
${type}


**الإدارة المسؤولة:**
${mention}`

 )

 .setFooter({

 text:"KRX Support"

 })

 .setTimestamp();





 ticket.send({

 content:`${interaction.user}`,

 embeds:[embed],

 components:[row]

 });




 interaction.reply({

 content:`✅ تم فتح التيكت ${ticket}`,

 ephemeral:true

 });


});









// أمر إنهاء التيكت
client.on("messageCreate", async message=>{


 if(message.author.bot) return;


 if(message.content === "$تم"){


  if(!message.channel.name.startsWith("🎫")) return;



  const member =
  message.channel.permissionOverwrites.cache.find(
  p=>p.allow.has(PermissionsBitField.Flags.ViewChannel)
  );


  const closeEmbed = new EmbedBuilder()

  .setTitle("✅ تم إنهاء التذكرة")

  .setDescription(
  `شكراً لاستخدامك الدعم 💙

برجاء تقييمنا من خلال النجوم بالأسفل ⭐`
  )

  .setTimestamp();



  const stars = new ActionRowBuilder();



  for(let i=1;i<=5;i++){

   stars.addComponents(

    new ButtonBuilder()

    .setCustomId(`rate_${i}`)

    .setLabel("⭐".repeat(i))

    .setStyle(ButtonStyle.Secondary)

   );

  }



  await message.channel.send({

   content:`${message.author}`,

   embeds:[closeEmbed],

   components:[stars]

  });



  setTimeout(()=>{

   message.channel.delete();

  },10000);



 }

});







// تقييم النجوم
client.on(Events.InteractionCreate, async interaction=>{


 if(!interaction.isButton()) return;


 if(interaction.customId.startsWith("rate_")){


 const rate =
 interaction.customId.split("_")[1];


 interaction.reply({

 content:`شكراً لتقييمك ⭐ ${rate}/5`,

 ephemeral:true

 });


 }

});








client.login(process.env.TOKEN);
