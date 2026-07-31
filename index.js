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

    Partials.User,

    Partials.Message

  ]

});


// ==========================================
// FILES
// ==========================================

const CONFIG_FILE =
  path.join(
    __dirname,
    "config.json"
  );

const POINTS_FILE =
  path.join(
    __dirname,
    "points.json"
  );

const SHOP_FILE =
  path.join(
    __dirname,
    "shop.json"
  );


// ==========================================
// LOAD JSON
// ==========================================

function loadJSON(
  file,
  fallback
) {

  try {


    if (
      !fs.existsSync(
        file
      )
    ) {

      fs.writeFileSync(

        file,

        JSON.stringify(
          fallback,
          null,
          2
        )

      );


      return fallback;

    }


    const raw =
      fs.readFileSync(
        file,
        "utf8"
      )

        .trim();


    if (!raw) {

      return fallback;

    }


    return JSON.parse(
      raw
    );


  } catch (error) {


    console.error(
      "JSON LOAD ERROR:",
      file,
      error
    );


    return fallback;

  }

}


// ==========================================
// LOAD DATA
// ==========================================

let config =
  loadJSON(

    CONFIG_FILE,

    {
      guilds: {}
    }

  );


let points =
  loadJSON(

    POINTS_FILE,

    {}

  );


let shop =
  loadJSON(

    SHOP_FILE,

    {}

  );


// ==========================================
// FIX OLD CONFIG AUTOMATICALLY
// ==========================================

if (
  !config.guilds
) {

  const oldConfig =
    { ...config };


  config = {
    guilds: {}
  };


  console.log(
    "⚙️ Old config detected"
  );


  // البيانات القديمة لن تضيع
  config.legacy =
    oldConfig;

}


// ==========================================
// SAVE FUNCTIONS
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
      "CONFIG SAVE ERROR:",
      error
    );

  }

}


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
      "POINTS SAVE ERROR:",
      error
    );

  }

}


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
      "SHOP SAVE ERROR:",
      error
    );

  }

}


// ==========================================
// DEFAULT SERVER CONFIG
// ==========================================

function defaultGuildConfig() {

  return {

    staffRoles: [],

    highRoles: [],

    ticketCategory: "",

    ratingChannel: "",

    claimPoints: 2,

    ticketMessage:
      `مرحباً {user}

اكتب تفاصيل طلبك وانتظر الإدارة.`,

    panels: []

  };

}


// ==========================================
// GET SERVER CONFIG
// ==========================================

function getGuildConfig(
  guildId
) {

  if (
    !config.guilds[
      guildId
    ]
  ) {

    config.guilds[
      guildId
    ] =
      defaultGuildConfig();


    saveConfig();

  }


  const cfg =
    config.guilds[
      guildId
    ];


  // لو في قيمة ناقصة
  if (
    !Array.isArray(
      cfg.staffRoles
    )
  ) {

    cfg.staffRoles = [];

  }


  if (
    !Array.isArray(
      cfg.highRoles
    )
  ) {

    cfg.highRoles = [];

  }


  if (
    !Array.isArray(
      cfg.panels
    )
  ) {

    cfg.panels = [];

  }


  if (
    typeof cfg.claimPoints !==
    "number"
  ) {

    cfg.claimPoints = 2;

  }


  if (
    !cfg.ticketMessage
  ) {

    cfg.ticketMessage =
      `مرحباً {user}

اكتب تفاصيل طلبك وانتظر الإدارة.`;

  }


  return cfg;

}


// ==========================================
// GET SERVER POINTS
// ==========================================

function getGuildPoints(
  guildId
) {

  if (
    !points[
      guildId
    ]
  ) {

    points[
      guildId
    ] = {};

  }


  return points[
    guildId
  ];

}


// ==========================================
// GET SERVER SHOP
// ==========================================

function getGuildShop(
  guildId
) {

  if (
    !shop[
      guildId
    ]
  ) {

    shop[
      guildId
    ] = [];

  }


  if (
    !Array.isArray(
      shop[
        guildId
      ]
    )
  ) {

    shop[
      guildId
    ] = [];

  }


  return shop[
    guildId
  ];

}


// ==========================================
// GET STAFF ROLES
// ==========================================

function getStaffRoles(
  guildId
) {

  const cfg =
    getGuildConfig(
      guildId
    );


  return [

    ...cfg.staffRoles,

    ...cfg.highRoles

  ]

    .filter(Boolean);

}


// ==========================================
// MESSAGE STAFF PERMISSION
// ==========================================

function hasStaffPermission(
  message
) {

  if (
    !message.guild ||
    !message.member
  ) {

    return false;

  }


  // Owner
  if (
    message.author.id ===
    message.guild.ownerId
  ) {

    return true;

  }


  // Administrator
  if (
    message.member.permissions.has(

      PermissionsBitField
        .Flags
        .Administrator

    )
  ) {

    return true;

  }


  const roles =
    getStaffRoles(
      message.guild.id
    );


  return roles.some(

    roleId =>

      message.member.roles.cache.has(
        roleId
      )

  );

}


// ==========================================
// INTERACTION STAFF PERMISSION
// ==========================================

function interactionHasStaff(
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

      PermissionsBitField
        .Flags
        .Administrator

    )
  ) {

    return true;

  }


  const roles =
    getStaffRoles(
      interaction.guild.id
    );


  return roles.some(

    roleId =>

      interaction.member.roles.cache.has(
        roleId
      )

  );

}


// ==========================================
// COLOR HELPER
// ==========================================

function parseHexColor(
  value,
  fallback = "#5865F2"
) {

  if (!value) {

    return fallback;

  }


  const color =
    String(
      value
    )

      .trim();


  if (
    /^#[0-9A-Fa-f]{6}$/
      .test(
        color
      )
  ) {

    return color;

  }


  return fallback;

}


// ==========================================
// BUTTON STYLE HELPER
// ==========================================

function buttonStyleFromName(
  name
) {

  const styles = {

    Primary:
      ButtonStyle.Primary,

    Secondary:
      ButtonStyle.Secondary,

    Success:
      ButtonStyle.Success,

    Danger:
      ButtonStyle.Danger

  };


  return (
    styles[
      name
    ] ||
    ButtonStyle.Primary
  );

}


// ==========================================
// READY
// ==========================================

client.once(
  Events.ClientReady,

  readyClient => {


    console.log(

      `✅ KRX BOT ONLINE: ${readyClient.user.tag}`

    );


    readyClient.user.setActivity(

      "KRX Dashboard 🎫"

    );

  }

);


// ==========================================
// QUICK CONFIG COMMANDS
// ==========================================

client.on(
  Events.MessageCreate,

  async message => {


    if (
      message.author.bot ||
      !message.guild
    ) {

      return;

    }


    const content =
      message.content.trim();


    const cfg =
      getGuildConfig(
        message.guild.id
      );


    const isAdmin =

      message.author.id ===
      message.guild.ownerId

      ||

      message.member.permissions.has(

        PermissionsBitField
          .Flags
          .Administrator

      );


    // ======================================
    // !idstaff
    // ======================================

    if (
      content.startsWith(
        "!idstaff "
      )
    ) {


      if (!isAdmin) {

        return message.reply(
          "❌ ليس لديك صلاحية."
        );

      }


      const id =
        content

          .split(/\s+/)[1]

          ?.replace(
            /[<@&>]/g,
            ""
          );


      const role =
        message.guild.roles.cache.get(
          id
        );


      if (!role) {

        return message.reply(
          "❌ ID رتبة غير صحيح."
        );

      }


      if (
        !cfg.staffRoles.includes(
          role.id
        )
      ) {

        cfg.staffRoles.push(
          role.id
        );

      }


      saveConfig();


      return message.reply(
        `✅ تمت إضافة رتبة Staff: ${role}`
      );

    }


    // ======================================
    // !idhigh
    // ======================================

    if (
      content.startsWith(
        "!idhigh "
      )
    ) {


      if (!isAdmin) {

        return message.reply(
          "❌ ليس لديك صلاحية."
        );

      }


      const id =
        content

          .split(/\s+/)[1]

          ?.replace(
            /[<@&>]/g,
            ""
          );


      const role =
        message.guild.roles.cache.get(
          id
        );


      if (!role) {

        return message.reply(
          "❌ ID رتبة غير صحيح."
        );

      }


      if (
        !cfg.highRoles.includes(
          role.id
        )
      ) {

        cfg.highRoles.push(
          role.id
        );

      }


      saveConfig();


      return message.reply(
        `✅ تمت إضافة رتبة High Staff: ${role}`
      );

    }


    // ======================================
    // !idticket
    // ======================================

    if (
      content.startsWith(
        "!idticket "
      )
    ) {


      if (!isAdmin) {

        return message.reply(
          "❌ ليس لديك صلاحية."
        );

      }


      const id =
        content

          .split(/\s+/)[1]

          ?.replace(
            /[<#>]/g,
            ""
          );


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
          "❌ ID كاتيجوري غير صحيح."
        );

      }


      cfg.ticketCategory =
        category.id;


      saveConfig();


      return message.reply(
        `✅ تم حفظ كاتيجوري التذاكر: **${category.name}**`
      );

    }


    // ======================================
    // !idrating
    // ======================================

    if (
      content.startsWith(
        "!idrating "
      )
    ) {


      if (!isAdmin) {

        return message.reply(
          "❌ ليس لديك صلاحية."
        );

      }


      const id =
        content

          .split(/\s+/)[1]

          ?.replace(
            /[<#>]/g,
            ""
          );


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
          "❌ ID روم كتابي غير صحيح."
        );

      }


      cfg.ratingChannel =
        channel.id;


      saveConfig();


      return message.reply(
        `✅ تم حفظ روم التقييم: ${channel}`
      );

    }

  }

);
// ==========================================
// SEND SAVED PANEL
// !panel رقم
// ==========================================

client.on(
  Events.MessageCreate,

  async message => {

    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }


    const content =
      message.content.trim();


    if (
      !content.startsWith(
        "!panel "
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
        "❌ ليس لديك صلاحية."
      );
    }


    const cfg =
      getGuildConfig(
        message.guild.id
      );


    const panelIndex =
      Number(
        content.split(/\s+/)[1]
      ) - 1;


    const panel =
      cfg.panels[
        panelIndex
      ];


    if (!panel) {
      return message.reply(
        "❌ البانل غير موجود."
      );
    }


    const embed =
      new EmbedBuilder()

        .setColor(
          parseHexColor(
            panel.color
          )
        )

        .setTitle(
          panel.title ||
          "🎫 KRX Tickets"
        )

        .setDescription(
          panel.description ||
          "اختر نوع التذكرة."
        );


    if (panel.image) {
      embed.setImage(
        panel.image
      );
    }


    if (panel.thumbnail) {
      embed.setThumbnail(
        panel.thumbnail
      );
    }


    const panelButtons =
      (
        panel.buttons ||
        []
      )

        .slice(
          0,
          5
        )

        .map(
          (button, buttonIndex) => {

            const builder =
              new ButtonBuilder()

                .setCustomId(
                  `krx_ticket:${panelIndex}:${buttonIndex}`
                )

                .setLabel(
                  button.label ||
                  "فتح تذكرة"
                )

                .setStyle(
                  buttonStyleFromName(
                    button.style
                  )
                );


            if (button.emoji) {
              builder.setEmoji(
                button.emoji
              );
            }


            return builder;

          }
        );


    if (
      !panelButtons.length
    ) {

      return message.reply(
        "❌ البانل لا يحتوي على أزرار."
      );

    }


    const row =
      new ActionRowBuilder()

        .addComponents(
          ...panelButtons
        );


    await message.channel.send({

      embeds: [
        embed
      ],

      components: [
        row
      ]

    });


    return message.reply(
      "✅ تم إرسال البانل."
    );

  }
);


// ==========================================
// CREATE TICKET FROM PANEL BUTTON
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
        "krx_ticket:"
      )
    ) {
      return;
    }


    const parts =
      interaction.customId.split(
        ":"
      );


    const panelIndex =
      Number(
        parts[1]
      );


    const buttonIndex =
      Number(
        parts[2]
      );


    const cfg =
      getGuildConfig(
        interaction.guild.id
      );


    const panel =
      cfg.panels[
        panelIndex
      ];


    const button =
      panel?.buttons?.[
        buttonIndex
      ];


    if (
      !panel ||
      !button
    ) {

      return interaction.reply({

        content:
          "❌ إعدادات هذا الزر غير موجودة.",

        ephemeral:
          true

      });

    }


    // ======================================
    // PREVENT DUPLICATE TICKET
    // ======================================

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

        ephemeral:
          true

      });

    }


    // ======================================
    // TICKET CATEGORY
    // ======================================

    const categoryId =
      button.categoryId ||
      cfg.ticketCategory;


    const category =
      interaction.guild.channels.cache.get(
        categoryId
      );


    if (
      !category ||
      category.type !==
      ChannelType.GuildCategory
    ) {

      return interaction.reply({

        content:
          "❌ كاتيجوري التذاكر غير مضبوط.",

        ephemeral:
          true

      });

    }


    await interaction.deferReply({
      ephemeral: true
    });


    // ======================================
    // MENTION ROLES
    // ======================================

    const roleIds =

      Array.isArray(
        button.mentionRoles
      )

      &&

      button.mentionRoles.length

        ?

        button.mentionRoles

        :

        [
          ...cfg.staffRoles,
          ...cfg.highRoles
        ];


    const validRoles =
      roleIds.filter(

        roleId =>

          interaction.guild.roles.cache.has(
            roleId
          )

      );


    // ======================================
    // SAFE USERNAME
    // ======================================

    const safeUsername =
      interaction.user.username

        .toLowerCase()

        .replace(
          /[^a-z0-9_\-\u0600-\u06FF]/g,
          "-"
        )

        .slice(
          0,
          35
        );


    const prefix =
      String(
        button.channelPrefix ||
        "ticket"
      )

        .toLowerCase()

        .replace(
          /[^a-z0-9_\-\u0600-\u06FF]/g,
          "-"
        )

        .slice(
          0,
          30
        );


    try {


      // ====================================
      // CREATE CHANNEL
      // ====================================

      const ticket =
        await interaction.guild.channels.create({

          name:
            `${prefix}-${safeUsername}`,

          type:
            ChannelType.GuildText,

          parent:
            category.id,

          topic:
            interaction.user.id,

          permissionOverwrites: [

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


            ...validRoles.map(

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

          ]

        });


      // ====================================
      // CLOSE / DELETE BUTTONS
      // ====================================

      const closeRow =
        new ActionRowBuilder()

          .addComponents(

            new ButtonBuilder()

              .setCustomId(
                "krx_close_ticket"
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
                "krx_delete_ticket"
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


      // ====================================
      // TICKET MESSAGE
      // ====================================

      const rawTicketText =
        button.ticketMessage ||
        cfg.ticketMessage ||
        "مرحباً {user}";


      const ticketText =
        rawTicketText

          .replaceAll(
            "{user}",
            `${interaction.user}`
          )

          .replaceAll(
            "{username}",
            interaction.user.username
          );


      const ticketEmbed =
        new EmbedBuilder()

          .setColor(
            parseHexColor(
              button.ticketColor ||
              "#5865F2"
            )
          )

          .setTitle(
            button.ticketTitle ||
            "🎫 تذكرة جديدة"
          )

          .setDescription(
            ticketText
          )

          .setFooter({

            text:
              "KRX Ticket System"

          })

          .setTimestamp();


      const roleMentionText =
        validRoles

          .map(
            roleId =>
              `<@&${roleId}>`
          )

          .join(" ");


      await ticket.send({

        content:
          `${interaction.user}${roleMentionText ? ` ${roleMentionText}` : ""}`,

        embeds: [
          ticketEmbed
        ],

        components: [
          closeRow
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
        "TICKET CREATE ERROR:",
        error
      );


      await interaction
        .editReply(
          "❌ حصل خطأ أثناء إنشاء التذكرة."
        )
        .catch(
          () => {}
        );

    }

  }
);


// ==========================================
// CLAIMED TICKETS
// ==========================================

const claimedTickets =
  new Map();


// ==========================================
// CLAIM TICKET
// كلمة: دعم
// ==========================================

client.on(
  Events.MessageCreate,

  async message => {


    if (
      message.author.bot ||
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
      !message.channel.name?.includes(
        "ticket"
      )

      &&

      !message.channel.name?.includes(
        "support"
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
        `❌ التذكرة مستلمة بواسطة <@${claimedTickets.get(message.channel.id)}>`
      );

    }


    claimedTickets.set(

      message.channel.id,

      message.author.id

    );


    const cfg =
      getGuildConfig(
        message.guild.id
      );


    const guildPoints =
      getGuildPoints(
        message.guild.id
      );


    const claimPoints =
      Number(
        cfg.claimPoints ||
        2
      );


    guildPoints[
      message.author.id
    ] =
      (
        guildPoints[
          message.author.id
        ] || 0
      )
      +
      claimPoints;


    savePoints();


    const claimEmbed =
      new EmbedBuilder()

        .setColor(
          "#57F287"
        )

        .setTitle(
          "✅ تم استلام التذكرة"
        )

        .setDescription(
`${message.author}

⭐ حصل على:
**+${claimPoints} نقطة**

⭐ نقاطه الآن:
**${guildPoints[message.author.id]}**`
        )

        .setTimestamp();


    await message.channel.send({

      embeds: [
        claimEmbed
      ]

    });


    try {

      await message.author.send(
`✅ تم استلام التذكرة.

⭐ حصلت على +${claimPoints} نقطة.

⭐ نقاطك الآن:
${guildPoints[message.author.id]}`
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
      message.author.bot ||
      !message.guild
    ) {
      return;
    }


    if (
      message.content.trim() !==
      "!points"
    ) {
      return;
    }


    const guildPoints =
      getGuildPoints(
        message.guild.id
      );


    const balance =
      guildPoints[
        message.author.id
      ] || 0;


    return message.reply({

      embeds: [

        new EmbedBuilder()

          .setColor(
            "#FEE75C"
          )

          .setTitle(
            "⭐ نقاطك"
          )

          .setDescription(
            `لديك **${balance}** نقطة.`
          )

          .setTimestamp()

      ]

    });

  }
);


// ==========================================
// ADD / REMOVE POINTS
// +point @user 10
// -point @user 10
// ==========================================

client.on(
  Events.MessageCreate,

  async message => {


    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }


    const content =
      message.content.trim();


    const isAdd =
      content.startsWith(
        "+point "
      );


    const isRemove =
      content.startsWith(
        "-point "
      );


    if (
      !isAdd &&
      !isRemove
    ) {
      return;
    }


    if (
      !hasStaffPermission(
        message
      )
    ) {

      return message.reply(
        "❌ ليس لديك صلاحية."
      );

    }


    const member =
      message.mentions.members.first();


    const amount =
      Number(
        content.split(/\s+/)[2]
      );


    if (
      !member ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {

      return message.reply(
        "❌ مثال: `+point @user 10`"
      );

    }


    const guildPoints =
      getGuildPoints(
        message.guild.id
      );


    guildPoints[
      member.id
    ] =
      guildPoints[
        member.id
      ] || 0;


    if (isAdd) {

      guildPoints[
        member.id
      ] += amount;

    }


    if (isRemove) {

      guildPoints[
        member.id
      ] =
        Math.max(

          0,

          guildPoints[
            member.id
          ] - amount

        );

    }


    savePoints();


    return message.reply(
      `✅ نقاط ${member}: **${guildPoints[member.id]}**`
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
      message.author.bot ||
      !message.guild
    ) {
      return;
    }


    if (
      message.content.trim() !==
      "$top"
    ) {
      return;
    }


    const guildPoints =
      getGuildPoints(
        message.guild.id
      );


    const top =
      Object.entries(
        guildPoints
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
        "❌ لا توجد نقاط."
      );

    }


    const description =
      top

        .map(

          ([userId, value], index) =>

            `${index + 1}- <@${userId}> ⭐ ${value}`

        )

        .join(
          "\n"
        );


    return message.reply({

      embeds: [

        new EmbedBuilder()

          .setColor(
            "#FEE75C"
          )

          .setTitle(
            "🏆 أفضل الإداريين"
          )

          .setDescription(
            description
          )

          .setTimestamp()

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
      message.author.bot ||
      !message.guild
    ) {
      return;
    }


    const content =
      message.content.trim();


    if (
      content !== "!shop"
    ) {
      return;
    }


    const guildShop =
      getGuildShop(
        message.guild.id
      );


    const guildPoints =
      getGuildPoints(
        message.guild.id
      );


    const balance =
      guildPoints[
        message.author.id
      ] || 0;


    if (
      !guildShop.length
    ) {

      return message.reply({

        embeds: [

          new EmbedBuilder()

            .setColor(
              "#5865F2"
            )

            .setTitle(
              "🛒 KRX Points Shop"
            )

            .setDescription(
              "❌ الشوب فارغ حالياً."
            )

            .setFooter({
              text:
                `نقاطك: ${balance}`
            })

        ]

      });

    }


    const description =
      guildShop

        .map(

          (item, index) =>

`**${index + 1}. ${item.name}**

💰 السعر:
**${item.price} نقطة**

🛍️ للشراء:
\`!buy ${index + 1}\``

        )

        .join(
          "\n\n━━━━━━━━━━━━━━\n\n"
        );


    return message.reply({

      embeds: [

        new EmbedBuilder()

          .setColor(
            "#FEE75C"
          )

          .setTitle(
            "🛒 KRX Points Shop"
          )

          .setDescription(
`${description}

━━━━━━━━━━━━━━

⭐ نقاطك الحالية:
**${balance} نقطة**`
          )

          .setFooter({
            text:
              "KRX Shop • استخدم !buy رقم"
          })

          .setTimestamp()

      ]

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

    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }


    const content =
      message.content.trim();


    if (
      !content.startsWith(
        "!buy "
      )
    ) {
      return;
    }


    const guildShop =
      getGuildShop(
        message.guild.id
      );


    const guildPoints =
      getGuildPoints(
        message.guild.id
      );


    const index =
      Number(
        content.split(/\s+/)[1]
      ) - 1;


    const item =
      guildShop[
        index
      ];


    if (!item) {

      return message.reply(
        "❌ المنتج غير موجود. استخدم `!shop` لمعرفة المنتجات."
      );

    }


    const balance =
      guildPoints[
        message.author.id
      ] || 0;


    if (
      balance <
      item.price
    ) {

      return message.reply({

        embeds: [

          new EmbedBuilder()

            .setColor(
              "#ED4245"
            )

            .setTitle(
              "❌ نقاطك غير كافية"
            )

            .setDescription(
`🛒 المنتج:
**${item.name}**

💰 السعر:
**${item.price} نقطة**

⭐ نقاطك:
**${balance} نقطة**

ينقصك:
**${item.price - balance} نقطة**`
            )

            .setTimestamp()

        ]

      });

    }


    guildPoints[
      message.author.id
    ] =
      balance -
      item.price;


    savePoints();


    return message.reply({

      embeds: [

        new EmbedBuilder()

          .setColor(
            "#57F287"
          )

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
**${guildPoints[message.author.id]} نقطة**`
          )

          .setFooter({
            text:
              "KRX Points Shop"
          })

          .setTimestamp()

      ]

    });

  }
);


// ==========================================
// DM ONE MEMBER
// !dm @user الرسالة
// ==========================================

client.on(
  Events.MessageCreate,

  async message => {

    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }


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
        "❌ ليس لديك صلاحية."
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
`<@${member.id}>

${text}`
      );


      return message.reply(
        "✅ تم إرسال الرسالة."
      );


    } catch {

      return message.reply(
        "❌ لم أستطع إرسال الرسالة. ممكن يكون الخاص مغلق."
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

    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }


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
        "❌ ليس لديك صلاحية."
      );

    }


    const text =
      content

        .split(/\s+/)

        .slice(1)

        .join(" ");


    if (!text) {

      return message.reply(
        "❌ اكتب الرسالة بعد `!dms`"
      );

    }


    await message.guild.members
      .fetch()

      .catch(
        () => {}
      );


    let sent = 0;

    let failed = 0;


    await message.reply(
      "📨 بدأ إرسال الرسالة للأعضاء..."
    );


    for (
      const member
      of
      message.guild.members.cache.values()
    ) {


      if (
        member.user.bot
      ) {
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


      // تأخير لتقليل Rate Limit
      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            1000
          )
      );

    }


    return message.channel.send({

      embeds: [

        new EmbedBuilder()

          .setColor(
            "#57F287"
          )

          .setTitle(
            "📨 انتهى الإرسال"
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

          .setTimestamp()

      ]

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

    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }


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
      !hasStaffPermission(
        message
      )
    ) {

      return message.reply(
        "❌ ليس لديك صلاحية."
      );

    }


    const topic =
      message.channel.topic;


    if (!topic) {

      return;
    }


    const name =
      content
        .slice(8)
        .trim();


    if (!name) {

      return message.reply(
        "❌ مثال: `!rename مشكلة-شراء`"
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


    } catch {

      return message.reply(
        "❌ حصل خطأ أثناء تغيير الاسم."
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

    if (
      message.author.bot ||
      !message.guild
    ) {
      return;
    }


    if (
      message.content.trim() !==
      "!delete"
    ) {
      return;
    }


    if (
      !hasStaffPermission(
        message
      )
    ) {

      return message.reply(
        "❌ ليس لديك صلاحية."
      );

    }


    if (
      !message.channel.topic
    ) {
      return;
    }


    await message.reply(
      "🗑️ سيتم حذف التذكرة بعد 5 ثواني."
    );


    setTimeout(
      () => {

        message.channel
          .delete()

          .catch(
            () => {}
          );

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
      "krx_close_ticket"
    ) {
      return;
    }


    if (
      !interactionHasStaff(
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
              "krx_rate_1"
            )

            .setLabel(
              "⭐"
            )

            .setStyle(
              ButtonStyle.Secondary
            ),


          new ButtonBuilder()

            .setCustomId(
              "krx_rate_2"
            )

            .setLabel(
              "⭐⭐"
            )

            .setStyle(
              ButtonStyle.Secondary
            ),


          new ButtonBuilder()

            .setCustomId(
              "krx_rate_3"
            )

            .setLabel(
              "⭐⭐⭐"
            )

            .setStyle(
              ButtonStyle.Secondary
            ),


          new ButtonBuilder()

            .setCustomId(
              "krx_rate_4"
            )

            .setLabel(
              "⭐⭐⭐⭐"
            )

            .setStyle(
              ButtonStyle.Secondary
            ),


          new ButtonBuilder()

            .setCustomId(
              "krx_rate_5"
            )

            .setLabel(
              "⭐⭐⭐⭐⭐"
            )

            .setStyle(
              ButtonStyle.Success
            )

        );


    const embed =
      new EmbedBuilder()

        .setColor(
          "#5865F2"
        )

        .setTitle(
          "⭐ تقييم الخدمة"
        )

        .setDescription(
          "اختر تقييمك من الأزرار بالأسفل."
        )

        .setTimestamp();


    return interaction.reply({

      embeds: [
        embed
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
      "krx_delete_ticket"
    ) {
      return;
    }


    if (
      !interactionHasStaff(
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
      () => {

        interaction.channel
          .delete()

          .catch(
            () => {}
          );

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
        "krx_rate_"
      )
    ) {
      return;
    }


    const rate =
      Number(

        interaction.customId

          .split("_")

          .pop()

      );


    if (
      ![
        1,
        2,
        3,
        4,
        5
      ].includes(
        rate
      )
    ) {

      return;

    }


    const cfg =
      getGuildConfig(
        interaction.guild.id
      );


    const ratingChannel =
      interaction.guild.channels.cache.get(
        cfg.ratingChannel
      );


    if (
      ratingChannel
    ) {

      const ratingEmbed =
        new EmbedBuilder()

          .setColor(
            "#FEE75C"
          )

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
                  rate
                )

            }

          )

          .setTimestamp();


      await ratingChannel.send({

        embeds: [
          ratingEmbed
        ]

      })

        .catch(
          () => {}
        );

    }


    await interaction.reply({

      content:
        `💙 شكراً لتقييمك ${rate}/5`,

      ephemeral:
        true

    });


    setTimeout(
      () => {

        interaction.channel
          .delete()

          .catch(
            () => {}
          );

      },

      5000
    );

  }
);


// ==========================================
// HELP
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
      "!help"
    ) {
      return;
    }


    const embed =
      new EmbedBuilder()

        .setColor(
          "#5865F2"
        )

        .setTitle(
          "📚 KRX Bot Commands"
        )

        .setDescription(
`**⚙️ الإعدادات**

\`!idstaff ID\`
إضافة رتبة Staff

\`!idhigh ID\`
إضافة رتبة High Staff

\`!idticket ID\`
تحديد كاتيجوري التذاكر

\`!idrating ID\`
تحديد روم التقييم


**🧩 البانلات**

\`!panel 1\`
إرسال أول بانل محفوظ من الـDashboard

\`!panel 2\`
إرسال ثاني بانل


**🎫 التذاكر**

\`دعم\`
استلام التذكرة والحصول على نقاط

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


**🛒 الشوب**

\`!shop\`
عرض المتجر

\`!buy 1\`
شراء المنتج رقم 1


**📨 الرسائل**

\`!dm @user الرسالة\`
إرسال رسالة خاصة

\`!dms الرسالة\`
إرسال الرسالة لكل الأعضاء
مع منشن تلقائي لكل شخص في الخاص.


**🌐 Dashboard**

يمكنك تعديل:
الرتب، التذاكر، البانلات،
الأزرار، الشوب، النقاط والرسائل
من الموقع.`
        )

        .setFooter({
          text:
            "KRX Bot V2"
        })

        .setTimestamp();


    return message.reply({

      embeds: [
        embed
      ]

    });

  }
);


// ==========================================
// START DASHBOARD V2
// ==========================================

try {

  require(
    "./dashboard"
  )({

    client,

    config,

    points,

    shop,

    getGuildConfig,

    getGuildPoints,

    getGuildShop,

    saveConfig,

    savePoints,

    saveShop

  });


  console.log(
    "🌐 KRX Dashboard V2 loaded"
  );


} catch (error) {

  console.error(
    "❌ DASHBOARD START ERROR:",
    error
  );

}


// ==========================================
// ERROR HANDLERS
// ==========================================

process.on(
  "unhandledRejection",

  error => {

    console.error(
      "Unhandled Rejection:",
      error
    );

  }
);


process.on(
  "uncaughtException",

  error => {

    console.error(
      "Uncaught Exception:",
      error
    );

  }
);


// ==========================================
// LOGIN BOT
// ==========================================

client.login(
  process.env.TOKEN
);
