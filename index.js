// ==========================================
// KRX BOT
// Discord.js v14
// Tickets + Points + Shop + Dashboard
// ==========================================

require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");


// ==========================================
// CLIENT
// ==========================================

const client = new Client({

  intents: [

    GatewayIntentBits.Guilds,

    GatewayIntentBits.GuildMembers,

    GatewayIntentBits.GuildMessages,

    GatewayIntentBits.MessageContent,

    GatewayIntentBits.DirectMessages

  ],

  partials: [

    Partials.Channel,

    Partials.Message,

    Partials.User

  ]

});


// ==========================================
// FILE PATHS
// ==========================================

const CONFIG_FILE =
  path.join(__dirname, "config.json");

const POINTS_FILE =
  path.join(__dirname, "points.json");

const SHOP_FILE =
  path.join(__dirname, "shop.json");


// ==========================================
// SAFE JSON LOADER
// ==========================================

function loadJSON(file, fallback) {

  try {

    if (!fs.existsSync(file)) {

      fs.writeFileSync(
        file,
        JSON.stringify(fallback, null, 2)
      );

      return fallback;

    }


    const content =
      fs.readFileSync(
        file,
        "utf8"
      );


    if (!content.trim()) {

      return fallback;

    }


    return JSON.parse(content);


  } catch (error) {

    console.error(
      `❌ Error loading ${file}:`,
      error
    );

    return fallback;

  }

}


// ==========================================
// CONFIG
// ==========================================

let config = loadJSON(
  CONFIG_FILE,
  {
    STAFF_ROLE: "",
    HIGH_ROLE: "",
    TICKET_CATEGORY: "",
    RATING_CHANNEL: ""
  }
);


// ==========================================
// POINTS
// ==========================================

let points = loadJSON(
  POINTS_FILE,
  {}
);


// ==========================================
// SHOP
// ==========================================

let shop = loadJSON(
  SHOP_FILE,
  []
);


if (!Array.isArray(shop)) {
  shop = [];
}


// ==========================================
// SAVE CONFIG
// ==========================================

function saveConfig() {

  try {

    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(
        config,
        null,
        2
      )
    );

  } catch (error) {

    console.error(
      "❌ CONFIG SAVE ERROR:",
      error
    );

  }

}


// ==========================================
// SAVE POINTS
// ==========================================

function savePoints() {

  try {

    fs.writeFileSync(
      POINTS_FILE,
      JSON.stringify(
        points,
        null,
        2
      )
    );

  } catch (error) {

    console.error(
      "❌ POINTS SAVE ERROR:",
      error
    );

  }

}


// ==========================================
// SAVE SHOP
// ==========================================

function saveShop() {

  try {

    fs.writeFileSync(
      SHOP_FILE,
      JSON.stringify(
        shop,
        null,
        2
      )
    );

  } catch (error) {

    console.error(
      "❌ SHOP SAVE ERROR:",
      error
    );

  }

}


// ==========================================
// STAFF ROLES
// ==========================================

function getStaffRoles() {

  return [

    config.STAFF_ROLE,

    config.HIGH_ROLE

  ].filter(Boolean);

}


// ==========================================
// CHECK STAFF PERMISSION
// ==========================================

function hasStaffPermission(message) {

  if (!message.guild) {
    return false;
  }


  // صاحب السيرفر
  if (
    message.author.id ===
    message.guild.ownerId
  ) {

    return true;

  }


  // Administrator
  if (
    message.member &&
    message.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )
  ) {

    return true;

  }


  // Staff / High Staff
  const roles =
    getStaffRoles();


  return roles.some(
    roleId =>
      message.member?.roles.cache.has(
        roleId
      )
  );

}


// ==========================================
// CHECK INTERACTION STAFF
// ==========================================

function interactionHasStaffPermission(
  interaction
) {

  if (
    !interaction.guild ||
    !interaction.member
  ) {

    return false;

  }


  if (
    interaction.user.id ===
    interaction.guild.ownerId
  ) {

    return true;

  }


  if (
    interaction.member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )
  ) {

    return true;

  }


  return getStaffRoles().some(
    roleId =>
      interaction.member.roles.cache.has(
        roleId
      )
  );

}


// ==========================================
// BOT READY
// ==========================================

client.once(
  Events.ClientReady,
  readyClient => {

    console.log(
      `✅ KRX BOT ONLINE: ${readyClient.user.tag}`
    );


    readyClient.user.setActivity(
      "KRX Tickets 🎫"
    );

  }
);


// ==========================================
// CONFIG COMMANDS
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;

    if (!message.guild) return;


    const content =
      message.content.trim();


    // ======================================
    // !idstaff ID
    // ======================================

    if (
      content.startsWith(
        "!idstaff "
      )
    ) {

      const allowed =
        message.author.id ===
        message.guild.ownerId ||

        message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        );


      if (!allowed) {

        return message.reply(
          "❌ الأمر لصاحب السيرفر أو Administrator فقط."
        );

      }


      const id =
        content
          .split(/\s+/)[1]
          ?.replace(/[<@&>]/g, "");


      const role =
        message.guild.roles.cache.get(
          id
        );


      if (!role) {

        return message.reply(
          "❌ اكتب ID رتبة Staff صحيح.\nمثال: `!idstaff 123456789`"
        );

      }


      config.STAFF_ROLE =
        role.id;


      saveConfig();


      return message.reply(
        `✅ تم حفظ رتبة Staff: ${role}`
      );

    }


    // ======================================
    // !idhigh ID
    // ======================================

    if (
      content.startsWith(
        "!idhigh "
      )
    ) {

      const allowed =
        message.author.id ===
        message.guild.ownerId ||

        message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        );


      if (!allowed) {

        return message.reply(
          "❌ الأمر لصاحب السيرفر أو Administrator فقط."
        );

      }


      const id =
        content
          .split(/\s+/)[1]
          ?.replace(/[<@&>]/g, "");


      const role =
        message.guild.roles.cache.get(
          id
        );


      if (!role) {

        return message.reply(
          "❌ اكتب ID رتبة الإدارة العليا صحيح.\nمثال: `!idhigh 123456789`"
        );

      }


      config.HIGH_ROLE =
        role.id;


      saveConfig();


      return message.reply(
        `✅ تم حفظ رتبة الإدارة العليا: ${role}`
      );

    }


    // ======================================
    // !idticket ID
    // ======================================

    if (
      content.startsWith(
        "!idticket "
      )
    ) {

      const allowed =
        message.author.id ===
        message.guild.ownerId ||

        message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        );


      if (!allowed) {

        return message.reply(
          "❌ الأمر لصاحب السيرفر أو Administrator فقط."
        );

      }


      const id =
        content
          .split(/\s+/)[1]
          ?.replace(/[<#>]/g, "");


      const category =
        message.guild.channels.cache.get(
          id
        );


      if (
        !category ||
        category.type !==
        ChannelType.GuildCategory
      ) {

        return message.reply(
          "❌ اكتب ID كاتيجوري صحيح.\nمثال: `!idticket 123456789`"
        );

      }


      config.TICKET_CATEGORY =
        category.id;


      saveConfig();


      return message.reply(
        `✅ تم حفظ كاتيجوري التذاكر:\n**${category.name}**`
      );

    }


    // ======================================
    // !idrating ID
    // ======================================

    if (
      content.startsWith(
        "!idrating "
      )
    ) {

      const allowed =
        message.author.id ===
        message.guild.ownerId ||

        message.member.permissions.has(
          PermissionsBitField.Flags.Administrator
        );


      if (!allowed) {

        return message.reply(
          "❌ الأمر لصاحب السيرفر أو Administrator فقط."
        );

      }


      const id =
        content
          .split(/\s+/)[1]
          ?.replace(/[<#>]/g, "");


      const channel =
        message.guild.channels.cache.get(
          id
        );


      if (
        !channel ||
        channel.type !==
        ChannelType.GuildText
      ) {

        return message.reply(
          "❌ اكتب ID روم كتابي صحيح.\nمثال: `!idrating 123456789`"
        );

      }


      config.RATING_CHANNEL =
        channel.id;


      saveConfig();


      return message.reply(
        `✅ تم حفظ روم التقييم: ${channel}`
      );

    }


    // ======================================
    // !ids
    // ======================================

    if (content === "!ids") {

      if (
        !hasStaffPermission(message)
      ) {

        return message.reply(
          "❌ ليس لديك صلاحية."
        );

      }


      const embed =
        new EmbedBuilder()

          .setColor("#5865F2")

          .setTitle(
            "⚙️ إعدادات KRX Bot"
          )

          .addFields(

            {
              name:
                "👮 Staff Role",

              value:
                config.STAFF_ROLE
                  ? `<@&${config.STAFF_ROLE}>`
                  : "❌ غير محدد"
            },

            {
              name:
                "👑 High Staff",

              value:
                config.HIGH_ROLE
                  ? `<@&${config.HIGH_ROLE}>`
                  : "❌ غير محدد"
            },

            {
              name:
                "🎫 Ticket Category",

              value:
                config.TICKET_CATEGORY
                  ? `<#${config.TICKET_CATEGORY}>`
                  : "❌ غير محدد"
            },

            {
              name:
                "⭐ Rating Channel",

              value:
                config.RATING_CHANNEL
                  ? `<#${config.RATING_CHANNEL}>`
                  : "❌ غير محدد"
            }

          )

          .setTimestamp();


      return message.reply({
        embeds: [embed]
      });

    }

  }
);


// ==========================================
// TICKET PANELS
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;

    if (!message.guild) return;


    const content =
      message.content.trim();


    if (
      content !== "!setup1" &&
      content !== "!setup2"
    ) {

      return;

    }


    if (
      !hasStaffPermission(message)
    ) {

      return message.reply(
        "❌ ليس لديك صلاحية لإنشاء البانل."
      );

    }


    let title;
    let description;
    let customId;
    let label;
    let emoji;


    if (
      content === "!setup1"
    ) {

      title =
        "📋 KRX Application";

      description =
        `**🇸🇦 تقديم الإدارة**

اضغط الزر بالأسفل لفتح تذكرة تقديم إدارة.

**🇺🇸 Staff Application**

Click the button below to open an application ticket.`;

      customId =
        "ticket_application";

      label =
        "Application | تقديم";

      emoji =
        "📋";

    }


    if (
      content === "!setup2"
    ) {

      title =
        "🎫 KRX Support";

      description =
        `**🇸🇦 الدعم**

إذا كنت تحتاج إلى مساعدة اضغط الزر بالأسفل.

**🇺🇸 Support**

Click the button below if you need help.`;

      customId =
        "ticket_support";

      label =
        "Support | الدعم";

      emoji =
        "🛠️";

    }


    const embed =
      new EmbedBuilder()

        .setColor("#5865F2")

        .setTitle(title)

        .setDescription(
          description
        )

        .setFooter({
          text:
            "KRX Ticket System"
        });


    const row =
      new ActionRowBuilder()

        .addComponents(

          new ButtonBuilder()

            .setCustomId(
              customId
            )

            .setLabel(
              label
            )

            .setEmoji(
              emoji
            )

            .setStyle(
              ButtonStyle.Primary
            )

        );


    await message.channel.send({

      embeds: [embed],

      components: [row]

    });

  }
);
// ==========================================
// CREATE TICKET
// ==========================================

client.on(
  Events.InteractionCreate,
  async interaction => {

    if (!interaction.isButton()) {
      return;
    }


    if (
      interaction.customId !==
        "ticket_application" &&
      interaction.customId !==
        "ticket_support"
    ) {

      return;
    }


    if (
      !interaction.guild
    ) {

      return;
    }


    const type =
      interaction.customId ===
      "ticket_application"
        ? "تقديم"
        : "دعم";


    const roles =
      getStaffRoles();


    if (
      !config.STAFF_ROLE &&
      !config.HIGH_ROLE
    ) {

      return interaction.reply({

        content:
          "❌ لم يتم تحديد رتب الإدارة بعد.\nاستخدم `!idstaff ID` و `!idhigh ID` أولاً.",

        ephemeral: true

      });

    }


    if (
      !config.TICKET_CATEGORY
    ) {

      return interaction.reply({

        content:
          "❌ لم يتم تحديد كاتيجوري التذاكر بعد.\nاستخدم `!idticket ID` أولاً.",

        ephemeral: true

      });

    }


    const oldTicket =
      interaction.guild.channels.cache.find(
        channel =>
          channel.topic ===
          interaction.user.id
      );


    if (oldTicket) {

      return interaction.reply({

        content:
          `❌ لديك تذكرة مفتوحة بالفعل: ${oldTicket}`,

        ephemeral: true

      });

    }


    const category =
      interaction.guild.channels.cache.get(
        config.TICKET_CATEGORY
      );


    if (
      !category ||
      category.type !==
        ChannelType.GuildCategory
    ) {

      return interaction.reply({

        content:
          "❌ كاتيجوري التذاكر المحفوظ غير صحيح.\nاستخدم `!idticket ID` من جديد.",

        ephemeral: true

      });

    }


    await interaction.deferReply({
      ephemeral: true
    });


    try {

      const safeUsername =
        interaction.user.username

          .toLowerCase()

          .replace(
            /[^a-z0-9_\-\u0600-\u06FF]/g,
            "-"
          )

          .slice(
            0,
            40
          );


      const permissionOverwrites = [

        {

          id:
            interaction.guild.id,

          deny: [

            PermissionsBitField
              .Flags
              .ViewChannel

          ]

        },


        {

          id:
            interaction.user.id,

          allow: [

            PermissionsBitField
              .Flags
              .ViewChannel,

            PermissionsBitField
              .Flags
              .SendMessages,

            PermissionsBitField
              .Flags
              .ReadMessageHistory,

            PermissionsBitField
              .Flags
              .AttachFiles

          ]

        },


        ...roles

          .filter(
            roleId =>
              interaction.guild.roles.cache.has(
                roleId
              )
          )

          .map(
            roleId => ({

              id:
                roleId,

              allow: [

                PermissionsBitField
                  .Flags
                  .ViewChannel,

                PermissionsBitField
                  .Flags
                  .SendMessages,

                PermissionsBitField
                  .Flags
                  .ReadMessageHistory,

                PermissionsBitField
                  .Flags
                  .AttachFiles

              ]

            })
          )

      ];


      const ticket =
        await interaction.guild.channels.create({

          name:
            `ticket-${type}-${safeUsername}`,

          type:
            ChannelType.GuildText,

          parent:
            category.id,

          topic:
            interaction.user.id,

          permissionOverwrites

        });


      const validRoles =
        roles.filter(
          roleId =>
            interaction.guild.roles.cache.has(
              roleId
            )
        );


      const mention =
        validRoles

          .map(
            roleId =>
              `<@&${roleId}>`
          )

          .join(" ");


      const ticketEmbed =
        new EmbedBuilder()

          .setColor("#5865F2")

          .setTitle(
            "🎫 تذكرة جديدة | KRX"
          )

          .setDescription(
`مرحباً ${interaction.user}

اكتب تفاصيل طلبك وانتظر الإدارة.

لاستلام التذكرة بواسطة الإدارة:

\`دعم\``
          )

          .setFooter({
            text:
              `نوع التذكرة: ${type}`
          })

          .setTimestamp();


      const ticketButtons =
        new ActionRowBuilder()

          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                "close_ticket"
              )

              .setLabel(
                "إغلاق"
              )

              .setEmoji(
                "🔒"
              )

              .setStyle(
                ButtonStyle.Danger
              ),


            new ButtonBuilder()

              .setCustomId(
                "delete_ticket"
              )

              .setLabel(
                "حذف"
              )

              .setEmoji(
                "🗑️"
              )

              .setStyle(
                ButtonStyle.Secondary
              )

          );


      await ticket.send({

        content:
          `${interaction.user}${mention ? ` ${mention}` : ""}`,

        embeds: [
          ticketEmbed
        ],

        components: [
          ticketButtons
        ],

        allowedMentions: {

          users: [
            interaction.user.id
          ],

          roles:
            validRoles

        }

      });


      await interaction.editReply(
        `✅ تم فتح التذكرة: ${ticket}`
      );


    } catch (error) {

      console.error(
        "❌ TICKET CREATE ERROR:",
        error
      );


      await interaction.editReply(
        "❌ حصل خطأ أثناء فتح التذكرة.\nتأكد أن البوت لديه صلاحية Manage Channels."
      ).catch(() => {});

    }

  }
);


// ==========================================
// CLAIMED TICKETS
// ==========================================

const claimedTickets =
  new Map();


// ==========================================
// CLAIM TICKET + POINTS
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (
      message.author.bot
    ) {

      return;
    }


    if (
      !message.guild
    ) {

      return;
    }


    if (
      message.content.trim() !==
      "دعم"
    ) {

      return;
    }


    if (
      !message.channel.name?.startsWith(
        "ticket-"
      )
    ) {

      return;
    }


    if (
      !hasStaffPermission(
        message
      )
    ) {

      return message.reply(
        "❌ ليس لديك صلاحية لاستلام التذكرة."
      );

    }


    if (
      claimedTickets.has(
        message.channel.id
      )
    ) {

      return message.reply(
        `❌ التذكرة مستلمة بالفعل بواسطة <@${claimedTickets.get(message.channel.id)}>`
      );

    }


    claimedTickets.set(
      message.channel.id,
      message.author.id
    );


    if (
      !points[
        message.author.id
      ]
    ) {

      points[
        message.author.id
      ] = 0;

    }


    points[
      message.author.id
    ] += 2;


    savePoints();


    const claimEmbed =
      new EmbedBuilder()

        .setColor("#57F287")

        .setTitle(
          "✅ تم استلام التذكرة"
        )

        .setDescription(
`👤 الإداري:
${message.author}

⭐ حصل على:
**+2 نقطة**

⭐ نقاطه الآن:
**${points[message.author.id]}**`
        )

        .setTimestamp();


    await message.channel.send({

      embeds: [
        claimEmbed
      ]

    });


    try {

      await message.author.send(
`🎉 تم استلام التذكرة بنجاح.

⭐ حصلت على +2 نقطة.

⭐ نقاطك الآن:
${points[message.author.id]}`
      );

    } catch {}

  }
);


// ==========================================
// SHOW POINTS
// !points
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (
      message.author.bot
    ) {

      return;
    }


    if (
      message.content.trim() !==
      "!points"
    ) {

      return;
    }


    const userPoints =
      points[
        message.author.id
      ] || 0;


    const embed =
      new EmbedBuilder()

        .setColor("#FEE75C")

        .setTitle(
          "⭐ نقاطك"
        )

        .setDescription(
          `لديك **${userPoints}** نقطة.`
        )

        .setTimestamp();


    return message.reply({

      embeds: [
        embed
      ]

    });

  }
);


// ==========================================
// ADD POINTS
// +point @user 10
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (
      message.author.bot
    ) {

      return;
    }


    const content =
      message.content.trim();


    if (
      !content.startsWith(
        "+point "
      )
    ) {

      return;
    }


    if (
      !hasStaffPermission(
        message
      )
    ) {

      return message.reply(
        "❌ ليس لديك صلاحية لإضافة النقاط."
      );

    }


    const member =
      message.mentions.members.first();


    const args =
      content.split(
        /\s+/
      );


    const amount =
      Number(
        args[2]
      );


    if (
      !member ||
      !Number.isInteger(
        amount
      ) ||
      amount <= 0
    ) {

      return message.reply(
        "❌ الاستخدام الصحيح:\n`+point @user 10`"
      );

    }


    if (
      !points[
        member.id
      ]
    ) {

      points[
        member.id
      ] = 0;

    }


    points[
      member.id
    ] += amount;


    savePoints();


    return message.reply(
`✅ تمت إضافة **${amount}** نقطة إلى ${member}

⭐ نقاطه الآن:
**${points[member.id]}**`
    );

  }
);


// ==========================================
// REMOVE POINTS
// -point @user 10
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (
      message.author.bot
    ) {

      return;
    }


    const content =
      message.content.trim();


    if (
      !content.startsWith(
        "-point "
      )
    ) {

      return;
    }


    if (
      !hasStaffPermission(
        message
      )
    ) {

      return message.reply(
        "❌ ليس لديك صلاحية لخصم النقاط."
      );

    }


    const member =
      message.mentions.members.first();


    const args =
      content.split(
        /\s+/
      );


    const amount =
      Number(
        args[2]
      );


    if (
      !member ||
      !Number.isInteger(
        amount
      ) ||
      amount <= 0
    ) {

      return message.reply(
        "❌ الاستخدام الصحيح:\n`-point @user 10`"
      );

    }


    if (
      !points[
        member.id
      ]
    ) {

      points[
        member.id
      ] = 0;

    }


    points[
      member.id
    ] -= amount;


    if (
      points[
        member.id
      ] < 0
    ) {

      points[
        member.id
      ] = 0;

    }


    savePoints();


    return message.reply(
`➖ تم خصم **${amount}** نقطة من ${member}

⭐ نقاطه الآن:
**${points[member.id]}**`
    );

  }
);


// ==========================================
// TOP POINTS
// $top
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (
      message.author.bot
    ) {

      return;
    }


    if (
      message.content.trim() !==
      "$top"
    ) {

      return;
    }


    const top =
      Object.entries(
        points
      )

        .sort(
          (a, b) =>
            b[1] - a[1]
        )

        .slice(
          0,
          10
        );


    if (
      !top.length
    ) {

      return message.reply(
        "❌ لا يوجد نقاط حتى الآن."
      );

    }


    const description =
      top

        .map(
          ([userId, userPoints], index) =>
            `${index + 1}- <@${userId}> ⭐ ${userPoints}`
        )

        .join("\n");


    const embed =
      new EmbedBuilder()

        .setColor("#FEE75C")

        .setTitle(
          "🏆 أفضل الإداريين"
        )

        .setDescription(
          description
        )

        .setTimestamp();


    return message.channel.send({

      embeds: [
        embed
      ]

    });

  }
);


// ==========================================
// SHOP
// !shop
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (
      message.author.bot
    ) {

      return;
    }


    if (
      message.content.trim() !==
      "!shop"
    ) {

      return;
    }


    if (
      !shop.length
    ) {

      return message.reply(
        "🛒 الشوب فارغ."
      );

    }


    const description =
      shop

        .map(
          (item, index) =>
`${index + 1}- **${item.name}**
⭐ السعر: ${item.price}`
        )

        .join(
          "\n\n"
        );


    const embed =
      new EmbedBuilder()

        .setColor("#FEE75C")

        .setTitle(
          "🛒 متجر النقاط"
        )

        .setDescription(
          description
        )

        .setTimestamp();


    return message.reply({

      embeds: [
        embed
      ]

    });

  }
);
// ==========================================
// SHOP
// !shop
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;

    if (message.content.trim() !== "!shop") {
      return;
    }


    if (!shop.length) {

      const emptyEmbed =
        new EmbedBuilder()

          .setColor("#5865F2")

          .setTitle("🛒 KRX Points Shop")

          .setDescription(
            "❌ لا توجد منتجات في المتجر حالياً."
          )

          .setFooter({
            text: "KRX Shop"
          })

          .setTimestamp();


      return message.reply({
        embeds: [emptyEmbed]
      });

    }


    const userPoints =
      points[message.author.id] || 0;


    const productsText =
      shop

        .map(
          (item, index) =>
`**${index + 1}. ${item.name}**
💰 السعر: **${item.price} نقطة**
🛍️ للشراء: \`!buy ${index + 1}\``
        )

        .join("\n\n");


    const shopEmbed =
      new EmbedBuilder()

        .setColor("#FEE75C")

        .setTitle("🛒 KRX Points Shop")

        .setDescription(
`مرحباً ${message.author} 👋

${productsText}

━━━━━━━━━━━━━━

⭐ نقاطك الحالية:
**${userPoints} نقطة**`
        )

        .setFooter({
          text: "KRX Shop • استخدم !buy رقم"
        })

        .setTimestamp();


    return message.reply({
      embeds: [shopEmbed]
    });

  }
);


// ==========================================
// BUY ITEM
// !buy رقم
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;

    if (!message.guild) return;


    const content =
      message.content.trim();


    if (
      !content.startsWith(
        "!buy "
      )
    ) {

      return;

    }


    const id =
      Number(
        content.split(/\s+/)[1]
      ) - 1;


    if (
      !Number.isInteger(id) ||
      id < 0 ||
      !shop[id]
    ) {

      return message.reply(
        "❌ المنتج غير موجود.\nاستخدم `!shop` لمعرفة أرقام المنتجات."
      );

    }


    const item =
      shop[id];


    const userPoints =
      points[
        message.author.id
      ] || 0;


    if (
      userPoints <
      item.price
    ) {

      const notEnoughEmbed =
        new EmbedBuilder()

          .setColor("#ED4245")

          .setTitle(
            "❌ نقاطك غير كافية"
          )

          .setDescription(
`🛒 المنتج:
**${item.name}**

💰 السعر:
**${item.price} نقطة**

⭐ نقاطك:
**${userPoints} نقطة**

ينقصك:
**${item.price - userPoints} نقطة**`
          )

          .setTimestamp();


      return message.reply({
        embeds: [notEnoughEmbed]
      });

    }


    points[
      message.author.id
    ] -= item.price;


    savePoints();


    const buyEmbed =
      new EmbedBuilder()

        .setColor("#57F287")

        .setTitle(
          "✅ تمت عملية الشراء"
        )

        .setDescription(
`🎉 مبروك ${message.author}

لقد اشتريت:

🛒 **${item.name}**

💰 تم خصم:
**${item.price} نقطة**

⭐ نقاطك المتبقية:
**${points[message.author.id]} نقطة**`
        )

        .setFooter({
          text: "KRX Points Shop"
        })

        .setTimestamp();


    return message.reply({
      embeds: [buyEmbed]
    });

  }
);


// ==========================================
// ADD SHOP ITEM
// !addshop الاسم السعر
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;

    if (!message.guild) return;


    const content =
      message.content.trim();


    if (
      !content.startsWith(
        "!addshop "
      )
    ) {

      return;

    }


    if (
      message.author.id !==
      message.guild.ownerId
    ) {

      return message.reply(
        "❌ هذا الأمر لصاحب السيرفر فقط."
      );

    }


    const args =
      content

        .split(/\s+/)

        .slice(1);


    const price =
      Number(
        args.pop()
      );


    const name =
      args.join(" ");


    if (
      !name ||
      !Number.isInteger(price) ||
      price <= 0
    ) {

      return message.reply(
        "❌ الاستخدام الصحيح:\n`!addshop VIP 100`"
      );

    }


    shop.push({

      name,

      price

    });


    saveShop();


    const addEmbed =
      new EmbedBuilder()

        .setColor("#57F287")

        .setTitle(
          "✅ تمت إضافة منتج"
        )

        .setDescription(
`🛒 المنتج:
**${name}**

💰 السعر:
**${price} نقطة**

🔢 رقم المنتج:
**${shop.length}**`
        )

        .setFooter({
          text: "KRX Shop Management"
        })

        .setTimestamp();


    return message.reply({
      embeds: [addEmbed]
    });

  }
);


// ==========================================
// DELETE SHOP ITEM
// !delshop رقم
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;

    if (!message.guild) return;


    const content =
      message.content.trim();


    if (
      !content.startsWith(
        "!delshop "
      )
    ) {

      return;

    }


    if (
      message.author.id !==
      message.guild.ownerId
    ) {

      return message.reply(
        "❌ هذا الأمر لصاحب السيرفر فقط."
      );

    }


    const id =
      Number(
        content.split(/\s+/)[1]
      ) - 1;


    if (
      !Number.isInteger(id) ||
      id < 0 ||
      !shop[id]
    ) {

      return message.reply(
        "❌ المنتج غير موجود."
      );

    }


    const removed =
      shop.splice(
        id,
        1
      )[0];


    saveShop();


    const deleteEmbed =
      new EmbedBuilder()

        .setColor("#ED4245")

        .setTitle(
          "🗑️ تم حذف المنتج"
        )

        .setDescription(
`تم حذف:

🛒 **${removed.name}**

من متجر النقاط.`
        )

        .setTimestamp();


    return message.reply({
      embeds: [deleteEmbed]
    });

  }
);


// ==========================================
// RENAME TICKET
// !rename الاسم
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;

    if (!message.guild) return;


    const content =
      message.content.trim();


    if (
      !content.startsWith(
        "!rename "
      )
    ) {

      return;

    }


    if (
      !message.channel.name?.startsWith(
        "ticket-"
      )
    ) {

      return;

    }


    if (
      !hasStaffPermission(
        message
      )
    ) {

      return message.reply(
        "❌ ليس لديك صلاحية لتغيير اسم التذكرة."
      );

    }


    const name =
      content
        .slice(8)
        .trim();


    if (!name) {

      return message.reply(
        "❌ مثال:\n`!rename مشكلة-شراء`"
      );

    }


    const safeName =
      name

        .toLowerCase()

        .replace(
          /[^a-z0-9_\-\u0600-\u06FF]/g,
          "-"
        )

        .slice(
          0,
          70
        );


    try {

      await message.channel.setName(
        `ticket-${safeName}`
      );


      return message.reply(
        "✅ تم تغيير اسم التذكرة."
      );


    } catch (error) {

      console.error(
        "❌ RENAME ERROR:",
        error
      );


      return message.reply(
        "❌ حصل خطأ أثناء تغيير اسم التذكرة."
      );

    }

  }
);


// ==========================================
// DELETE TICKET COMMAND
// !delete
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;

    if (!message.guild) return;


    if (
      message.content.trim() !==
      "!delete"
    ) {

      return;

    }


    if (
      !message.channel.name?.startsWith(
        "ticket-"
      )
    ) {

      return;

    }


    if (
      !hasStaffPermission(
        message
      )
    ) {

      return message.reply(
        "❌ ليس لديك صلاحية لحذف التذكرة."
      );

    }


    await message.reply(
      "🗑️ سيتم حذف التذكرة بعد 5 ثواني."
    );


    setTimeout(
      async () => {

        await message.channel.delete()
          .catch(() => {});

      },
      5000
    );

  }
);


// ==========================================
// CLOSE TICKET BUTTON
// ==========================================

client.on(
  Events.InteractionCreate,
  async interaction => {

    if (
      !interaction.isButton()
    ) {

      return;

    }


    if (
      interaction.customId !==
      "close_ticket"
    ) {

      return;

    }


    if (
      !interaction.channel ||
      !interaction.channel.name?.startsWith(
        "ticket-"
      )
    ) {

      return interaction.reply({

        content:
          "❌ هذا الزر يعمل داخل التذاكر فقط.",

        ephemeral:
          true

      });

    }


    if (
      !interactionHasStaffPermission(
        interaction
      )
    ) {

      return interaction.reply({

        content:
          "❌ ليس لديك صلاحية لإغلاق التذكرة.",

        ephemeral:
          true

      });

    }


    const ratingRow =
      new ActionRowBuilder()

        .addComponents(

          new ButtonBuilder()

            .setCustomId(
              "rate_1"
            )

            .setLabel(
              "⭐"
            )

            .setStyle(
              ButtonStyle.Secondary
            ),


          new ButtonBuilder()

            .setCustomId(
              "rate_2"
            )

            .setLabel(
              "⭐⭐"
            )

            .setStyle(
              ButtonStyle.Secondary
            ),


          new ButtonBuilder()

            .setCustomId(
              "rate_3"
            )

            .setLabel(
              "⭐⭐⭐"
            )

            .setStyle(
              ButtonStyle.Secondary
            ),


          new ButtonBuilder()

            .setCustomId(
              "rate_4"
            )

            .setLabel(
              "⭐⭐⭐⭐"
            )

            .setStyle(
              ButtonStyle.Secondary
            ),


          new ButtonBuilder()

            .setCustomId(
              "rate_5"
            )

            .setLabel(
              "⭐⭐⭐⭐⭐"
            )

            .setStyle(
              ButtonStyle.Success
            )

        );


    const ratingEmbed =
      new EmbedBuilder()

        .setColor("#5865F2")

        .setTitle(
          "⭐ تقييم الخدمة"
        )

        .setDescription(
          "اختر تقييمك من الأزرار بالأسفل."
        )

        .setTimestamp();


    return interaction.reply({

      embeds: [
        ratingEmbed
      ],

      components: [
        ratingRow
      ]

    });

  }
);


// ==========================================
// DELETE TICKET BUTTON
// ==========================================

client.on(
  Events.InteractionCreate,
  async interaction => {

    if (
      !interaction.isButton()
    ) {

      return;

    }


    if (
      interaction.customId !==
      "delete_ticket"
    ) {

      return;

    }


    if (
      !interaction.channel ||
      !interaction.channel.name?.startsWith(
        "ticket-"
      )
    ) {

      return;

    }


    if (
      !interactionHasStaffPermission(
        interaction
      )
    ) {

      return interaction.reply({

        content:
          "❌ ليس لديك صلاحية لحذف التذكرة.",

        ephemeral:
          true

      });

    }


    await interaction.reply(
      "🗑️ سيتم حذف التذكرة بعد 3 ثواني."
    );


    setTimeout(
      async () => {

        await interaction.channel.delete()
          .catch(() => {});

      },
      3000
    );

  }
);


// ==========================================
// TICKET RATING
// ==========================================

client.on(
  Events.InteractionCreate,
  async interaction => {

    if (
      !interaction.isButton()
    ) {

      return;

    }


    if (
      !interaction.customId.startsWith(
        "rate_"
      )
    ) {

      return;

    }


    const rate =
      interaction.customId.split(
        "_"
      )[1];


    if (
      ![
        "1",
        "2",
        "3",
        "4",
        "5"
      ].includes(rate)
    ) {

      return;

    }


    const ratingChannel =
      interaction.guild.channels.cache.get(
        config.RATING_CHANNEL
      );


    if (ratingChannel) {

      const rateEmbed =
        new EmbedBuilder()

          .setColor("#FEE75C")

          .setTitle(
            "⭐ تقييم جديد"
          )

          .addFields(

            {

              name:
                "👤 العضو",

              value:
                `${interaction.user}`

            },

            {

              name:
                "⭐ التقييم",

              value:
                "⭐".repeat(
                  Number(rate)
                )

            }

          )

          .setTimestamp();


      await ratingChannel.send({

        embeds: [
          rateEmbed
        ]

      }).catch(() => {});

    }


    await interaction.reply({

      content:
        `💙 شكراً لتقييمك ${rate}/5`,

      ephemeral:
        true

    });


    setTimeout(
      async () => {

        await interaction.channel.delete()
          .catch(() => {});

      },
      5000
    );

  }
);
// ==========================================
// DM ONE USER
// !dm @user الرسالة
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;

    if (!message.guild) return;


    const content =
      message.content.trim();


    if (
      !content.startsWith(
        "!dm "
      )
    ) {

      return;

    }


    if (
      !hasStaffPermission(
        message
      )
    ) {

      return message.reply(
        "❌ ليس لديك صلاحية لاستخدام الأمر."
      );

    }


    const member =
      message.mentions.members.first();


    const text =
      content

        .split(/\s+/)

        .slice(2)

        .join(" ");


    if (
      !member ||
      !text
    ) {

      return message.reply(
        "❌ الاستخدام الصحيح:\n`!dm @user الرسالة`"
      );

    }


    try {

      await member.send(
        `<@${member.id}>\n\n${text}`
      );


      return message.reply(
        "✅ تم إرسال الرسالة في الخاص."
      );


    } catch (error) {

      console.error(
        "❌ DM ERROR:",
        error
      );


      return message.reply(
        "❌ لم أستطع إرسال الرسالة.\nممكن يكون الخاص عند العضو مقفول."
      );

    }

  }
);


// ==========================================
// DMS ALL MEMBERS
// !dms الرسالة
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;

    if (!message.guild) return;


    const content =
      message.content.trim();


    if (
      !content.startsWith(
        "!dms "
      )
    ) {

      return;

    }


    if (
      !hasStaffPermission(
        message
      )
    ) {

      return message.reply(
        "❌ ليس لديك صلاحية لاستخدام الأمر."
      );

    }


    const text =
      content

        .split(/\s+/)

        .slice(1)

        .join(" ");


    if (!text) {

      return message.reply(
        "❌ الاستخدام الصحيح:\n`!dms الرسالة`"
      );

    }


    try {

      await message.guild.members.fetch();

    } catch (error) {

      console.error(
        "❌ MEMBERS FETCH ERROR:",
        error
      );

    }


    let sent = 0;
    let failed = 0;


    await message.reply(
      "📨 بدأ إرسال الرسالة للأعضاء."
    );


    for (
      const member
      of
      message.guild.members.cache.values()
    ) {

      if (member.user.bot) {
        continue;
      }


      try {

        await member.send(
`<@${member.id}>

${text}`
        );


        sent++;


      } catch {

        failed++;

      }


      // تأخير بسيط لتقليل مشاكل Rate Limit
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            1000
          )
      );

    }


    const doneEmbed =
      new EmbedBuilder()

        .setColor("#57F287")

        .setTitle(
          "📨 انتهى إرسال الرسائل"
        )

        .addFields(

          {

            name:
              "✅ تم الإرسال",

            value:
              `${sent}`,

            inline:
              true

          },

          {

            name:
              "❌ فشل",

            value:
              `${failed}`,

            inline:
              true

          }

        )

        .setFooter({
          text:
            "KRX DM System"
        })

        .setTimestamp();


    return message.channel.send({

      embeds: [
        doneEmbed
      ]

    });

  }
);


// ==========================================
// HELP
// !help
// ==========================================

client.on(
  Events.MessageCreate,
  async message => {

    if (message.author.bot) return;


    if (
      message.content.trim() !==
      "!help"
    ) {

      return;

    }


    const helpEmbed =
      new EmbedBuilder()

        .setColor("#5865F2")

        .setTitle(
          "📚 KRX Bot Commands"
        )

        .setDescription(
`**⚙️ إعدادات البوت**

\`!idstaff ID\`
تحديد رتبة Staff

\`!idhigh ID\`
تحديد رتبة الإدارة العليا

\`!idticket ID\`
تحديد كاتيجوري التذاكر

\`!idrating ID\`
تحديد روم التقييم

\`!ids\`
عرض الإعدادات المحفوظة


**🎫 التذاكر**

\`!setup1\`
بانل تقديم الإدارة

\`!setup2\`
بانل الدعم

\`دعم\`
استلام التذكرة والحصول على +2 نقطة

\`!rename الاسم\`
تغيير اسم التذكرة

\`!delete\`
حذف التذكرة


**⭐ النقاط**

\`!points\`
عرض نقاطك

\`+point @user 10\`
إضافة نقاط

\`-point @user 10\`
خصم نقاط

\`$top\`
أفضل الإداريين


**🛒 المتجر**

\`!shop\`
عرض متجر النقاط

\`!buy 1\`
شراء المنتج رقم 1

\`!addshop VIP 100\`
إضافة منتج

\`!delshop 1\`
حذف منتج


**📨 الخاص**

\`!dm @user الرسالة\`
إرسال رسالة لشخص

\`!dms الرسالة\`
إرسال نفس الرسالة لكل الأعضاء
مع منشن تلقائي لكل شخص في الخاص.`
        )

        .setFooter({
          text:
            "KRX Bot"
        })

        .setTimestamp();


    return message.reply({

      embeds: [
        helpEmbed
      ]

    });

  }
);


// ==========================================
// ERROR HANDLERS
// ==========================================

process.on(
  "unhandledRejection",
  error => {

    console.error(
      "❌ Unhandled Promise Rejection:",
      error
    );

  }
);


process.on(
  "uncaughtException",
  error => {

    console.error(
      "❌ Uncaught Exception:",
      error
    );

  }
);


// ==========================================
// START WEBSITE + DASHBOARD
// ==========================================

try {

  require("./dashboard")(
    client,
    config,
    saveConfig
  );


  console.log(
    "🌐 KRX Dashboard loaded"
  );


} catch (error) {

  console.error(
    "❌ DASHBOARD ERROR:",
    error
  );

}


// ==========================================
// LOGIN BOT
// لازم يكون آخر سطر تقريباً
// ==========================================

client.login(
  process.env.TOKEN
);
