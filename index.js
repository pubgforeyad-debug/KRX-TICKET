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


// حط ID الكاتيجوري هنا
const CATEGORY_ID = "1531926623580979230";


// حط رتبة الإدارة هنا
const ADMIN_ROLE = "1528157557192134726";



client.once("ready",()=>{

 console.log(`Online ${client.user.tag}`);

});



// عمل البانل

client.on("messageCreate", async message=>{


 if(message.author.bot) return;


 if(message.content === "!setup"){


  const embed = new EmbedBuilder()

  .setTitle("🎫 الدعم")

  .setDescription(
   "اضغط الزر لفتح تذكرة دعم"
  )

  .setTimestamp();



  const button = new ButtonBuilder()

  .setCustomId("open_ticket")

  .setLabel("فتح تذكرة")

  .setStyle(ButtonStyle.Primary);



  const row = new ActionRowBuilder()

  .addComponents(button);



  message.channel.send({

   embeds:[embed],

   components:[row]

  });


 }

});




// فتح التيكت

client.on(Events.InteractionCreate, async interaction=>{


 if(!interaction.isButton()) return;


 if(interaction.customId !== "open_ticket") return;



 const ticket =
 await interaction.guild.channels.create({


 name:`ticket-${interaction.user.username}`,

 type:ChannelType.GuildText,

 parent:CATEGORY_ID,


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


  {

   id:ADMIN_ROLE,

   allow:[
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages
   ]

  }


 ]

});



const embed = new EmbedBuilder()

.setTitle("🎫 تذكرة جديدة")

.setDescription(

`مرحبا ${interaction.user}

برجاء انتظار الدعم`

)

.setTimestamp();



ticket.send({

content:`<@&${ADMIN_ROLE}> ${interaction.user}`,

embeds:[embed]

});



interaction.reply({

content:`تم فتح التذكرة ${ticket}`,

ephemeral:true

});



});




// استلام التذكرة

client.on("messageCreate", async message=>{


if(message.author.bot) return;


if(message.content === "دعم"){


if(!message.channel.name.startsWith("ticket")) return;


message.channel.send(

`✅ تم استلام التذكرة بواسطة ${message.author}`

);


}


});



client.login(process.env.TOKEN);
