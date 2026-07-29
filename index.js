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


// الإدارة الصغرى + الوسطاء (الدعم)
const SUPPORT_ADMIN = [
  "1528157557192134726",
  "1528157558416609331",
  "1528157507665658018",
  "1528157508869558463"
];




// عند تشغيل البوت
client.once("ready", () => {

  console.log(`✅ البوت شغال: ${client.user.tag}`);

});





// أمر إنشاء الأزرار
client.on("messageCreate", async message => {


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

      .addComponents(apply, support);



    await message.channel.send({

      content:"🎫 اختر نوع التذكرة:",

      components:[row]

    });


  }


});







// التعامل مع الأزرار
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





 // منع فتح أكثر من تيكت
 const exists = interaction.guild.channels.cache.find(

  c => c.name.includes(interaction.user.username)

 );


 if(exists){

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







 const close = new ButtonBuilder()

 .setCustomId("close_ticket")

 .setLabel("🔒 إغلاق التذكرة")

 .setStyle(ButtonStyle.Danger);



 const row = new ActionRowBuilder()

 .addComponents(close);




 const mention = roles.map(r => `<@&${r}>`).join(" ");




 await ticket.send({

  content:

  `${interaction.user} 👋\n${mention}\n\nاكتب طلبك هنا.`,

  components:[row]

 });





 await interaction.reply({

  content:`✅ تم فتح تذكرتك: ${ticket}`,

  ephemeral:true

 });



});







// زر إغلاق التذكرة
client.on(Events.InteractionCreate, async interaction => {


 if(

  interaction.isButton() &&

  interaction.customId === "close_ticket"

 ){


  await interaction.reply({

   content:"🔒 سيتم إغلاق التذكرة بعد 5 ثواني"

  });



  setTimeout(()=>{


   interaction.channel.delete();


  },5000);



 }


});







// تشغيل البوت من Railway
client.login(process.env.TOKEN);
