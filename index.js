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

require("dotenv").config();


const client = new Client({

  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]

});


// كاتيجوري التذاكر
const TICKET_CATEGORY = "1531926623580979230";


// الإدارة العليا (التقديم)
const HIGH_ADMIN = [
  "1528157604482912307",
  "1528157603564355716"
];


// الإدارة الصغرى فقط (الدعم)
const SUPPORT_ADMIN = [
  "1528157557192134726",
  "1528157558416609331"
];



// تشغيل البوت
client.once("ready", () => {
  console.log(`✅ Online: ${client.user.tag}`);
});




// إنشاء لوحة التذاكر
client.on("messageCreate", async message => {

  if(message.author.bot) return;


  if(message.content === "!setup") {


    const apply = new ButtonBuilder()
      .setCustomId("apply_ticket")
      .setLabel("📝 تقديم إدارة")
      .setStyle(ButtonStyle.Success);


    const support = new ButtonBuilder()
      .setCustomId("support_ticket")
      .setLabel("🎧 دعم")
      .setStyle(ButtonStyle.Primary);


    const row = new ActionRowBuilder()
      .addComponents(apply, support);


    await message.channel.send({

      content:"🎫 اختر نوع التذكرة:",

      components:[row]

    });


  }

});






// فتح التذاكر
client.on(Events.InteractionCreate, async interaction => {


 if(!interaction.isButton()) return;


 let type;
 let roles;



 if(interaction.customId === "apply_ticket") {

   type = "تقديم";
   roles = HIGH_ADMIN;

 }



 if(interaction.customId === "support_ticket") {

   type = "دعم";
   roles = SUPPORT_ADMIN;

 }



 if(!type) return;



 // منع تكرار التذكرة
 const exists = interaction.guild.channels.cache.find(

   c => c.name.includes(interaction.user.username)

 );


 if(exists) {

   return interaction.reply({

     content:"❌ لديك تذكرة مفتوحة بالفعل",

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



 const mention = roles.map(role => `<@&${role}>`).join(" ");



 await ticket.send({

   content:

   `${mention}\n${interaction.user} 👋\n\nاكتب طلبك هنا.`,

   components:[row]

 });



 await interaction.reply({

   content:`✅ تم فتح التذكرة: ${ticket}`,

   ephemeral:true

 });


});







// إغلاق التذكرة
client.on(Events.InteractionCreate, async interaction => {


 if(

  interaction.isButton() &&

  interaction.customId === "close_ticket"

 ) {


  await interaction.reply(
    "🔒 سيتم إغلاق التذكرة بعد 5 ثواني"
  );


  setTimeout(()=>{

    interaction.channel.delete();

  },5000);


 }


});




// توكن Railway
client.login(process.env.TOKEN);
