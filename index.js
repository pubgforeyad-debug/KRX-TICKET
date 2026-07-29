const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} = require("discord.js");


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});


// الكاتيجوري
const TICKET_CATEGORY = "1531926623580979230";


// الإدارة العليا (التقديم)
const HIGH_ADMIN = [
  "1528157604482912307",
  "1528157603564355716"
];


// الدعم (الصغرى + الوسطاء)
const SUPPORT_ADMIN = [
  "1528157557192134726",
  "1528157558416609331",
  "1528157507665658018",
  "1528157508869558463"
];



// أمر إنشاء الأزرار
client.on("messageCreate", async message => {

  if(message.content === "!setup") {

    const apply = new ButtonBuilder()
      .setCustomId("apply")
      .setLabel("📝 تقديم إدارة")
      .setStyle(ButtonStyle.Success);


    const support = new ButtonBuilder()
      .setCustomId("support")
      .setLabel("🎧 دعم")
      .setStyle(ButtonStyle.Primary);


    const row = new ActionRowBuilder()
      .addComponents(apply, support);


    message.channel.send({
      content: "🎫 اختر نوع التذكرة:",
      components:[row]
    });

  }

});



// فتح التذكرة
client.on(Events.InteractionCreate, async interaction => {

 if(!interaction.isButton()) return;


 let type;
 let roles;


 if(interaction.customId === "apply"){
   type = "تقديم";
   roles = HIGH_ADMIN;
 }


 if(interaction.customId === "support"){
   type = "دعم";
   roles = SUPPORT_ADMIN;
 }


 if(!type) return;



 const old = interaction.guild.channels.cache.find(
  c => c.name.includes(interaction.user.username)
 );


 if(old){
   return interaction.reply({
    content:"❌ لديك تذكرة مفتوحة بالفعل",
    ephemeral:true
   });
 }



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


   ...roles.map(role=>({

    id:role,

    allow:[
     PermissionsBitField.Flags.ViewChannel,
     PermissionsBitField.Flags.SendMessages
    ]

   }))

  ]

 });



 const close = new ButtonBuilder()

 .setCustomId("close")

 .setLabel("🔒 إغلاق التذكرة")

 .setStyle(ButtonStyle.Danger);



 const row = new ActionRowBuilder()
 .addComponents(close);



 const mention = roles.map(r=>`<@&${r}>`).join(" ");



 ticket.send({

  content:
  `${interaction.user} 👋\n${mention}\n\nاكتب طلبك هنا.`,

  components:[row]

 });



 interaction.reply({

  content:`✅ تم فتح التذكرة ${ticket}`,

  ephemeral:true

 });


});




// إغلاق التذكرة
client.on(Events.InteractionCreate, async interaction => {

 if(
  interaction.isButton() &&
  interaction.customId === "close"
 ){

  await interaction.reply(
   "🔒 سيتم حذف التذكرة بعد 5 ثواني"
  );


  setTimeout(()=>{
    interaction.channel.delete();
  },5000);

 }

});




// تشغيل البوت من Railway
client.login(process.env.TOKEN);
