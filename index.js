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


// تقديم إدارة
const HIGH_ADMIN = [
  "1528157604482912307",
  "1528157603564355716"
];


// دعم
const SUPPORT_ADMIN = [
  "1528157557192134726",
  "1528157558416609331"
];



// تشغيل البوت
client.once("ready",()=>{
 console.log(`✅ ${client.user.tag}`);
});




// ================= لوحة التذاكر =================

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
  .addComponents(
    apply,
    support
  );



  message.channel.send({

   content:"🎫 اختر نوع التذكرة:",

   components:[row]

  });


 }

});





// ================= فتح التيكت =================

client.on(Events.InteractionCreate, async interaction=>{


if(!interaction.isButton()) return;


let type;
let roles;



if(interaction.customId==="apply_ticket"){

 type="تقديم إدارة";
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
c.name.includes(interaction.user.username)
&&
c.name.includes(type)
);



if(exists){

return interaction.reply({

content:`❌ لديك تيكت ${type} مفتوح`,

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




// زر إغلاق

const close =
new ButtonBuilder()

.setCustomId("close_ticket")

.setLabel("🔒 إغلاق")

.setStyle(ButtonStyle.Danger);



const row =
new ActionRowBuilder()
.addComponents(close);



const mention =
roles.map(r=>`<@&${r}>`).join(" ");




const embed =
new EmbedBuilder()

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



await ticket.send({

content:`${interaction.user}`,

embeds:[embed],

components:[row]

});



interaction.reply({

content:`✅ تم فتح التذكرة ${ticket}`,

ephemeral:true

});


});
// ================= استلام التذكرة =================

client.on("messageCreate", async message => {

 if(message.author.bot) return;


 if(message.content === "دعم") {


  if(!message.channel.name.startsWith("🎫")) return;



  await message.channel.send(
    `✅ تم استلام التذكرة بواسطة ${message.author}`
  );



  const log =
  message.guild.channels.cache.get(CLAIM_LOG_CHANNEL);



  if(log){

    log.send(
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



  const embed =
  new EmbedBuilder()

  .setTitle("✅ تم إنهاء التذكرة")

  .setDescription(
  `شكراً لاستخدامك الدعم 💙

برجاء تقييم الخدمة من خلال النجوم بالأسفل ⭐`
  )

  .setFooter({
   text:"KRX Support"
  })

  .setTimestamp();



  const stars =
  new ActionRowBuilder();



  for(let i = 1; i <= 5; i++){


   stars.addComponents(

    new ButtonBuilder()

    .setCustomId(`rate_${i}`)

    .setLabel("⭐".repeat(i))

    .setStyle(ButtonStyle.Secondary)

   );


  }





  await message.channel.send({

   embeds:[embed],

   components:[stars]

  });



 }


});







// ================= التقييم =================

client.on(Events.InteractionCreate, async interaction=>{


 if(!interaction.isButton()) return;



 if(interaction.customId.startsWith("rate_")){


  const rate =
  interaction.customId.split("_")[1];



  const rating =
  interaction.guild.channels.cache.get(RATING_CHANNEL);



  if(rating){


   rating.send(

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
// ================= تشغيل البوت =================

client.login(process.env.TOKEN);
