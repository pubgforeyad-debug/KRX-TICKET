const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  Events
} = require("discord.js");


// ==========================================
// ZYRO FILES
// ==========================================

const ZYRO_FILE =
  path.join(
    __dirname,
    "zyro.json"
  );

const ZYRO_SHOP_FILE =
  path.join(
    __dirname,
    "zyroShop.json"
  );

const BOT_OWNER_ID =
  process.env.BOT_OWNER_ID;


// ==========================================
// LOAD JSON
// ==========================================

function loadJSON(
  file,
  fallback = {}
) {

  try {

    if (
      !fs.existsSync(file)
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
      ).trim();


    if (!raw) {
      return fallback;
    }


    return JSON.parse(raw);


  } catch (error) {

    console.error(
      "ZYRO JSON ERROR:",
      error
    );

    return fallback;
  }
}


// ==========================================
// DATA
// ==========================================

let zyro =
  loadJSON(
    ZYRO_FILE,
    {}
  );

let zyroShop =
  loadJSON(
    ZYRO_SHOP_FILE,
    {}
  );


// ==========================================
// SAVE
// ==========================================

function saveZyro() {

  fs.writeFileSync(
    ZYRO_FILE,
    JSON.stringify(
      zyro,
      null,
      2
    )
  );
}


function saveZyroShop() {

  fs.writeFileSync(
    ZYRO_SHOP_FILE,
    JSON.stringify(
      zyroShop,
      null,
      2
    )
  );
}


// ==========================================
// DEFAULT SETTINGS
// ==========================================

function defaultZyroGuild() {

  return {

    settings: {

      currencyName:
        "Zyro",

      currencySymbol:
        "💠",

      balanceCommand:
        "z",

      transferCommand:
        "zpay",

      topCommand:
        "ztop",

      shopCommand:
        "!zshop",

      buyCommand:
        "!zbuy"

    },

    balances: {}

  };
}


// ==========================================
// GET GUILD DATA
// ==========================================

function getZyroGuild(
  guildId
) {

  if (
    !zyro[guildId]
  ) {

    zyro[guildId] =
      defaultZyroGuild();

    saveZyro();
  }


  if (
    !zyro[guildId].settings
  ) {

    zyro[guildId].settings =
      defaultZyroGuild().settings;
  }


  if (
    !zyro[guildId].balances
  ) {

    zyro[guildId].balances =
      {};
  }


  return zyro[guildId];
}


// ==========================================
// BALANCE FUNCTIONS
// ==========================================

function getBalance(
  guildId,
  userId
) {

  const data =
    getZyroGuild(
      guildId
    );


  return Number(
    data.balances[userId] ||
    0
  );
}


function setBalance(
  guildId,
  userId,
  amount
) {

  const data =
    getZyroGuild(
      guildId
    );


  data.balances[userId] =
    Math.max(
      0,
      Math.floor(
        Number(amount) ||
        0
      )
    );


  saveZyro();


  return data.balances[
    userId
  ];
}


function addBalance(
  guildId,
  userId,
  amount
) {

  const current =
    getBalance(
      guildId,
      userId
    );


  return setBalance(
    guildId,
    userId,
    current +
    Number(amount)
  );
}


function removeBalance(
  guildId,
  userId,
  amount
) {

  const current =
    getBalance(
      guildId,
      userId
    );


  return setBalance(
    guildId,
    userId,
    current -
    Number(amount)
  );
}


// ==========================================
// MONEY FORMAT
// ==========================================

function money(
  amount,
  settings
) {

  return (
    `${settings.currencySymbol} ` +
    `${Number(amount).toLocaleString("en-US")} ` +
    `${settings.currencyName}`
  );
}


// ==========================================
// OWNER CHECK
// ==========================================

function isBotOwner(
  userId
) {

  return (
    Boolean(
      BOT_OWNER_ID
    )
    &&
    userId ===
    BOT_OWNER_ID
  );
}


// ==========================================
// PENDING OPERATIONS
// ==========================================

const pendingTransfers =
  new Map();

const pendingPurchases =
  new Map();


// ==========================================
// SECURITY CODE
// ==========================================

function createCode() {

  return String(
    Math.floor(
      1000 +
      Math.random() *
      9000
    )
  );
}


// ==========================================
// CREATE SECURITY IMAGE
// أرقام مرسومة بدون Fonts
// ==========================================

async function createCodeImage(
  code
) {

  const safeCode =
    String(code)

      .replace(
        /\D/g,
        ""
      )

      .slice(
        0,
        4
      )

      .padEnd(
        4,
        "0"
      );


  const segmentsByDigit = {

    0: [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f"
    ],

    1: [
      "b",
      "c"
    ],

    2: [
      "a",
      "b",
      "g",
      "e",
      "d"
    ],

    3: [
      "a",
      "b",
      "c",
      "d",
      "g"
    ],

    4: [
      "f",
      "g",
      "b",
      "c"
    ],

    5: [
      "a",
      "f",
      "g",
      "c",
      "d"
    ],

    6: [
      "a",
      "f",
      "g",
      "e",
      "c",
      "d"
    ],

    7: [
      "a",
      "b",
      "c"
    ],

    8: [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g"
    ],

    9: [
      "a",
      "b",
      "c",
      "d",
      "f",
      "g"
    ]

  };


  const segmentShapes = {

    a:
      '<rect x="18" y="8" width="74" height="14" rx="7"/>',

    b:
      '<rect x="88" y="18" width="14" height="70" rx="7"/>',

    c:
      '<rect x="88" y="92" width="14" height="70" rx="7"/>',

    d:
      '<rect x="18" y="158" width="74" height="14" rx="7"/>',

    e:
      '<rect x="8" y="92" width="14" height="70" rx="7"/>',

    f:
      '<rect x="8" y="18" width="14" height="70" rx="7"/>',

    g:
      '<rect x="18" y="83" width="74" height="14" rx="7"/>'

  };


  const digitsSvg =
    safeCode

      .split("")

      .map(
        (
          digit,
          index
        ) => {

          const x =
            55 +
            index *
            135;


          const active =
            segmentsByDigit[digit]
            ||
            segmentsByDigit[0];


          const shapes =
            active

              .map(
                segment =>
                  segmentShapes[
                    segment
                  ]
              )

              .join("");


          return `
<g
  transform="translate(${x}, 34)"
  fill="#FFFFFF"
>
  ${shapes}
</g>
`;

        }
      )

      .join("");


  const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="600"
  height="240"
  viewBox="0 0 600 240"
>

  <defs>

    <linearGradient
      id="bg"
      x1="0"
      y1="0"
      x2="1"
      y2="1"
    >

      <stop
        offset="0%"
        stop-color="#0F172A"
      />

      <stop
        offset="55%"
        stop-color="#312E81"
      />

      <stop
        offset="100%"
        stop-color="#581C87"
      />

    </linearGradient>

  </defs>


  <rect
    width="600"
    height="240"
    rx="28"
    fill="url(#bg)"
  />


  <circle
    cx="25"
    cy="20"
    r="110"
    fill="#5865F2"
    opacity="0.18"
  />


  <circle
    cx="580"
    cy="225"
    r="120"
    fill="#A855F7"
    opacity="0.16"
  />


  ${digitsSvg}

</svg>
`;


  const pngBuffer =
    await sharp(
      Buffer.from(svg)
    )

      .png()

      .toBuffer();


  return new AttachmentBuilder(
    pngBuffer,
    {
      name:
        "zyro-code.png"
    }
  );
}


// ==========================================
// REGISTER ZYRO
// ==========================================

function registerZyro(
  client
) {

  client.on(
    Events.MessageCreate,

    async message => {

      if (
        message.author.bot ||
        !message.guild
      ) {

        return;
      }


      const data =
        getZyroGuild(
          message.guild.id
        );


      const settings =
        data.settings;


      const content =
        message.content.trim();


      const args =
        content.split(/\s+/);


      // ====================================
      // BALANCE
      // z
      // z @user
      // ====================================

      if (
        args[0].toLowerCase() ===
        settings.balanceCommand.toLowerCase()
      ) {

        const target =
          message.mentions.users.first()
          ||
          message.author;


        const balance =
          getBalance(
            message.guild.id,
            target.id
          );


        const embed =
          new EmbedBuilder()

            .setColor(
              "#5865F2"
            )

            .setTitle(
              `${settings.currencySymbol} ${settings.currencyName}`
            )

            .setDescription(
`${target.id === message.author.id
  ? "رصيدك الحالي"
  : `رصيد ${target}`}

**${money(
  balance,
  settings
)}**`
            )

            .setThumbnail(
              target.displayAvatarURL({
                size:
                  128
              })
            )

            .setFooter({
              text:
                "KRX • Zyro Economy"
            })

            .setTimestamp();


        return message.reply({
          embeds: [
            embed
          ]
        });
      }
            // ====================================
      // OWNER ADD ZYRO
      // +zyro @user 1000
      // ====================================

      if (
        args[0].toLowerCase() ===
        "+zyro"
      ) {

        if (
          !isBotOwner(
            message.author.id
          )
        ) {

          return message.reply(
            "❌ هذا الأمر لصاحب البوت فقط."
          );
        }


        const member =
          message.mentions.members.first();


        const amount =
          Number(
            args[2]
          );


        if (
          !member ||
          !Number.isSafeInteger(
            amount
          ) ||
          amount <= 0
        ) {

          return message.reply(
            "❌ الاستخدام: `+zyro @user 1000`"
          );
        }


        const newBalance =
          addBalance(
            message.guild.id,
            member.id,
            amount
          );


        return message.reply(
`✅ تمت إضافة:

**${money(
  amount,
  settings
)}**

إلى:
${member}

💰 رصيده الآن:
**${money(
  newBalance,
  settings
)}**`
        );
      }


      // ====================================
      // OWNER REMOVE ZYRO
      // -zyro @user 500
      // ====================================

      if (
        args[0].toLowerCase() ===
        "-zyro"
      ) {

        if (
          !isBotOwner(
            message.author.id
          )
        ) {

          return message.reply(
            "❌ هذا الأمر لصاحب البوت فقط."
          );
        }


        const member =
          message.mentions.members.first();


        const amount =
          Number(
            args[2]
          );


        if (
          !member ||
          !Number.isSafeInteger(
            amount
          ) ||
          amount <= 0
        ) {

          return message.reply(
            "❌ الاستخدام: `-zyro @user 500`"
          );
        }


        const newBalance =
          removeBalance(
            message.guild.id,
            member.id,
            amount
          );


        return message.reply(
`✅ تم خصم:

**${money(
  amount,
  settings
)}**

من:
${member}

💰 رصيده الآن:
**${money(
  newBalance,
  settings
)}**`
        );
      }


      // ====================================
      // OWNER SET ZYRO
      // !setzyro @user 5000
      // ====================================

      if (
        args[0].toLowerCase() ===
        "!setzyro"
      ) {

        if (
          !isBotOwner(
            message.author.id
          )
        ) {

          return message.reply(
            "❌ هذا الأمر لصاحب البوت فقط."
          );
        }


        const member =
          message.mentions.members.first();


        const amount =
          Number(
            args[2]
          );


        if (
          !member ||
          !Number.isSafeInteger(
            amount
          ) ||
          amount < 0
        ) {

          return message.reply(
            "❌ الاستخدام: `!setzyro @user 5000`"
          );
        }


        const newBalance =
          setBalance(
            message.guild.id,
            member.id,
            amount
          );


        return message.reply(
`✅ تم تعيين رصيد ${member} إلى:

**${money(
  newBalance,
  settings
)}**`
        );
      }


      // ====================================
      // OWNER RESET ZYRO
      // !resetzyro @user
      // ====================================

      if (
        args[0].toLowerCase() ===
        "!resetzyro"
      ) {

        if (
          !isBotOwner(
            message.author.id
          )
        ) {

          return message.reply(
            "❌ هذا الأمر لصاحب البوت فقط."
          );
        }


        const member =
          message.mentions.members.first();


        if (!member) {

          return message.reply(
            "❌ الاستخدام: `!resetzyro @user`"
          );
        }


        setBalance(
          message.guild.id,
          member.id,
          0
        );


        return message.reply(
          `✅ تم تصفير رصيد ${member}.`
        );
      }


      // ====================================
      // TOP ZYRO
      // ztop
      // ====================================

      if (
        args[0].toLowerCase() ===
        settings.topCommand.toLowerCase()
      ) {

        const top =
          Object.entries(
            data.balances
          )

            .sort(
              (a, b) =>
                Number(b[1]) -
                Number(a[1])
            )

            .slice(
              0,
              10
            );


        if (
          !top.length
        ) {

          return message.reply(
            "❌ لا توجد أرصدة حتى الآن."
          );
        }


        const description =
          top

            .map(
              (
                [userId, balance],
                index
              ) => {

                const medal =
                  index === 0
                    ? "🥇"
                    : index === 1
                      ? "🥈"
                      : index === 2
                        ? "🥉"
                        : `#${index + 1}`;


                return (
                  `${medal} <@${userId}>\n` +
                  `└ **${money(
                    balance,
                    settings
                  )}**`
                );

              }
            )

            .join(
              "\n\n"
            );


        return message.reply({

          embeds: [

            new EmbedBuilder()

              .setColor(
                "#FEE75C"
              )

              .setTitle(
                `🏆 أغنى أعضاء ${settings.currencyName}`
              )

              .setDescription(
                description
              )

              .setFooter({
                text:
                  "KRX • Zyro Leaderboard"
              })

              .setTimestamp()

          ]

        });
      }


      // ====================================
      // TRANSFER
      // zpay @user 500
      // ====================================

      if (
        args[0].toLowerCase() ===
        settings.transferCommand.toLowerCase()
      ) {

        const target =
          message.mentions.members.first();


        const amount =
          Number(
            args[2]
          );


        if (!target) {

          return message.reply(
            `❌ الاستخدام: \`${settings.transferCommand} @user 500\``
          );
        }


        if (
          target.user.bot
        ) {

          return message.reply(
            "❌ لا يمكنك التحويل إلى بوت."
          );
        }


        if (
          target.id ===
          message.author.id
        ) {

          return message.reply(
            "❌ لا يمكنك التحويل لنفسك."
          );
        }


        if (
          !Number.isSafeInteger(
            amount
          ) ||
          amount <= 0
        ) {

          return message.reply(
            "❌ اكتب مبلغًا صحيحًا أكبر من 0."
          );
        }


        const balance =
          getBalance(
            message.guild.id,
            message.author.id
          );


        if (
          balance <
          amount
        ) {

          return message.reply({

            embeds: [

              new EmbedBuilder()

                .setColor(
                  "#ED4245"
                )

                .setTitle(
                  "❌ رصيد غير كافي"
                )

                .setDescription(
`💸 المبلغ:
**${money(
  amount,
  settings
)}**

💰 رصيدك:
**${money(
  balance,
  settings
)}**

📉 ينقصك:
**${money(
  amount - balance,
  settings
)}**`
                )

            ]

          });
        }


        if (
          pendingTransfers.has(
            message.author.id
          )
        ) {

          return message.reply(
            "❌ لديك عملية تحويل معلقة بالفعل."
          );
        }


        const operationId =
          `${message.author.id}-${Date.now()}`;


        pendingTransfers.set(
          message.author.id,
          {

            id:
              operationId,

            guildId:
              message.guild.id,

            channelId:
              message.channel.id,

            senderId:
              message.author.id,

            targetId:
              target.id,

            amount,

            stage:
              "confirm"

          }
        );


        const row =
          new ActionRowBuilder()

            .addComponents(

              new ButtonBuilder()

                .setCustomId(
                  `zyro_transfer_confirm:${operationId}`
                )

                .setLabel(
                  "تأكيد التحويل"
                )

                .setEmoji(
                  "✅"
                )

                .setStyle(
                  ButtonStyle.Success
                ),


              new ButtonBuilder()

                .setCustomId(
                  `zyro_transfer_cancel:${operationId}`
                )

                .setLabel(
                  "إلغاء"
                )

                .setEmoji(
                  "❌"
                )

                .setStyle(
                  ButtonStyle.Danger
                )

            );


        await message.reply({

          embeds: [

            new EmbedBuilder()

              .setColor(
                "#5865F2"
              )

              .setTitle(
                "💠 تأكيد تحويل Zyro"
              )

              .setDescription(
`👤 **إلى:**
${target}

💸 **المبلغ:**
${money(
  amount,
  settings
)}

💰 **رصيدك الحالي:**
${money(
  balance,
  settings
)}

💳 **بعد التحويل:**
${money(
  balance - amount,
  settings
)}

اضغط **تأكيد التحويل** للمتابعة.`
              )

              .setFooter({
                text:
                  "لن يتم الخصم قبل كتابة الكود الصحيح"
              })

              .setTimestamp()

          ],

          components: [
            row
          ]

        });


        setTimeout(
          () => {

            const current =
              pendingTransfers.get(
                message.author.id
              );


            if (
              current?.id ===
              operationId
            ) {

              pendingTransfers.delete(
                message.author.id
              );
            }

          },

          120000
        );


        return;
      }

    }

  );


  // ========================================
  // TRANSFER BUTTONS
  // ========================================

  client.on(
    Events.InteractionCreate,

    async interaction => {

      if (
        !interaction.isButton() ||
        !interaction.guild
      ) {

        return;
      }


      // ====================================
      // CANCEL TRANSFER
      // ====================================

      if (
        interaction.customId.startsWith(
          "zyro_transfer_cancel:"
        )
      ) {

        const operationId =
          interaction.customId.slice(
            "zyro_transfer_cancel:".length
          );


        const pending =
          pendingTransfers.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !==
            operationId
        ) {

          return interaction.reply({

            content:
              "❌ العملية انتهت أو ليست خاصة بك.",

            ephemeral:
              true

          });
        }


        pendingTransfers.delete(
          interaction.user.id
        );


        return interaction.update({

          embeds: [

            new EmbedBuilder()

              .setColor(
                "#ED4245"
              )

              .setTitle(
                "❌ تم إلغاء التحويل"
              )

              .setDescription(
                "لم يتم خصم أي Zyro."
              )

          ],

          components: []

        });
      }
            // ====================================
      // CONFIRM TRANSFER
      // ====================================

      if (
        interaction.customId.startsWith(
          "zyro_transfer_confirm:"
        )
      ) {

        const operationId =
          interaction.customId.slice(
            "zyro_transfer_confirm:".length
          );


        const pending =
          pendingTransfers.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !== operationId
        ) {

          return interaction.reply({

            content:
              "❌ العملية انتهت أو ليست خاصة بك.",

            ephemeral:
              true

          });
        }


        if (
          pending.stage !==
          "confirm"
        ) {

          return interaction.reply({

            content:
              "❌ تم تأكيد العملية بالفعل.",

            ephemeral:
              true

          });
        }


        const balance =
          getBalance(
            interaction.guild.id,
            interaction.user.id
          );


        if (
          balance <
          pending.amount
        ) {

          pendingTransfers.delete(
            interaction.user.id
          );


          return interaction.update({

            embeds: [

              new EmbedBuilder()

                .setColor(
                  "#ED4245"
                )

                .setTitle(
                  "❌ تم إلغاء التحويل"
                )

                .setDescription(
                  "رصيدك لم يعد كافيًا."
                )

            ],

            components: []

          });
        }


        const code =
          createCode();


        pending.code =
          code;


        pending.stage =
          "captcha";


        const image =
          await createCodeImage(
            code
          );


        await interaction.update({

          embeds: [

            new EmbedBuilder()

              .setColor(
                "#FEE75C"
              )

              .setTitle(
                "🔐 التحقق من التحويل"
              )

              .setDescription(
`اكتب **الأرقام الأربعة الموجودة في الصورة**.

⏱️ أمامك **60 ثانية**.

لن يتم خصم أي Zyro حتى تكتب الكود الصحيح.`
              )

              .setImage(
                "attachment://zyro-code.png"
              )

              .setFooter({
                text:
                  "KRX • Zyro Security"
              })

          ],

          files: [
            image
          ],

          components: []

        });


        const filter =
          message =>

            message.author.id ===
              interaction.user.id

            &&

            message.channel.id ===
              interaction.channel.id;


        try {

          const collected =
            await interaction.channel
              .awaitMessages({

                filter,

                max:
                  1,

                time:
                  60000,

                errors: [
                  "time"
                ]

              });


          const answer =
            collected
              .first()
              ?.content
              ?.trim();


          const current =
            pendingTransfers.get(
              interaction.user.id
            );


          if (
            !current ||
            current.id !==
              operationId
          ) {

            return;
          }


          if (
            answer !==
            current.code
          ) {

            pendingTransfers.delete(
              interaction.user.id
            );


            return interaction.channel.send({

              embeds: [

                new EmbedBuilder()

                  .setColor(
                    "#ED4245"
                  )

                  .setTitle(
                    "❌ الكود غير صحيح"
                  )

                  .setDescription(
                    "تم إلغاء التحويل ولم يتم خصم أي Zyro."
                  )

              ]

            });
          }


          const senderBalance =
            getBalance(
              interaction.guild.id,
              interaction.user.id
            );


          if (
            senderBalance <
            current.amount
          ) {

            pendingTransfers.delete(
              interaction.user.id
            );


            return interaction.channel.send(
              "❌ رصيدك لم يعد كافيًا."
            );
          }


          const receiverBalance =
            getBalance(
              interaction.guild.id,
              current.targetId
            );


          setBalance(
            interaction.guild.id,
            interaction.user.id,
            senderBalance -
              current.amount
          );


          setBalance(
            interaction.guild.id,
            current.targetId,
            receiverBalance +
              current.amount
          );


          pendingTransfers.delete(
            interaction.user.id
          );


          const settings =
            getZyroGuild(
              interaction.guild.id
            ).settings;


          const newSenderBalance =
            getBalance(
              interaction.guild.id,
              interaction.user.id
            );


          await interaction.channel.send({

            content:
              `${interaction.user}`,

            embeds: [

              new EmbedBuilder()

                .setColor(
                  "#57F287"
                )

                .setTitle(
                  "✅ تم التحويل"
                )

                .setDescription(
`تم تحويل:

**${money(
  current.amount,
  settings
)}**

إلى:
<@${current.targetId}>

💰 رصيدك الآن:
**${money(
  newSenderBalance,
  settings
)}**`
                )

                .setFooter({
                  text:
                    "KRX • Zyro Transfer"
                })

                .setTimestamp()

            ]

          });


          const receiver =
            await interaction.guild.members
              .fetch(
                current.targetId
              )
              .catch(
                () => null
              );


          if (
            receiver
          ) {

            const newReceiverBalance =
              getBalance(
                interaction.guild.id,
                receiver.id
              );


            await receiver.send({

              embeds: [

                new EmbedBuilder()

                  .setColor(
                    "#57F287"
                  )

                  .setTitle(
                    "💠 استلمت Zyro"
                  )

                  .setDescription(
`${interaction.user} أرسل لك:

**${money(
  current.amount,
  settings
)}**

💰 رصيدك الآن:
**${money(
  newReceiverBalance,
  settings
)}**`
                  )

                  .setTimestamp()

              ]

            }).catch(
              () => {}
            );
          }


        } catch {

          const current =
            pendingTransfers.get(
              interaction.user.id
            );


          if (
            current?.id ===
              operationId
          ) {

            pendingTransfers.delete(
              interaction.user.id
            );


            await interaction.channel.send({

              content:
                `${interaction.user}`,

              embeds: [

                new EmbedBuilder()

                  .setColor(
                    "#ED4245"
                  )

                  .setTitle(
                    "⌛ انتهى الوقت"
                  )

                  .setDescription(
                    "تم إلغاء التحويل ولم يتم خصم أي Zyro."
                  )

              ]

            }).catch(
              () => {}
            );
          }

        }


        return;
      }

    }

  );


  // ========================================
  // ZYRO SHOP COMMANDS
  // ========================================

  client.on(
    Events.MessageCreate,

    async message => {

      if (
        message.author.bot ||
        !message.guild
      ) {

        return;
      }


      const data =
        getZyroGuild(
          message.guild.id
        );


      const settings =
        data.settings;


      if (
        !Array.isArray(
          zyroShop[
            message.guild.id
          ]
        )
      ) {

        zyroShop[
          message.guild.id
        ] = [];

        saveZyroShop();
      }


      const shop =
        zyroShop[
          message.guild.id
        ];


      const content =
        message.content.trim();


      const lowerContent =
        content.toLowerCase();


      // ====================================
      // SHOW SHOP
      // !zshop
      // ====================================

      if (
        lowerContent ===
        settings.shopCommand.toLowerCase()
      ) {

        if (
          !shop.length
        ) {

          return message.reply({

            embeds: [

              new EmbedBuilder()

                .setColor(
                  "#5865F2"
                )

                .setTitle(
                  `🛒 متجر ${settings.currencyName}`
                )

                .setDescription(
                  "❌ المتجر فارغ حاليًا."
                )

            ]

          });
        }


        const description =
          shop

            .map(
              (
                product,
                index
              ) => {

                return (
`**${index + 1}. ${product.emoji || "🛒"} ${product.name}**

${product.description || "بدون وصف"}

💠 **السعر:**
${money(
  Number(product.price),
  settings
)}

🛍️ **للشراء:**
\`${settings.buyCommand} ${index + 1}\``
                );

              }
            )

            .join(
              "\n\n━━━━━━━━━━━━━━\n\n"
            );


        const balance =
          getBalance(
            message.guild.id,
            message.author.id
          );


        return message.reply({

          embeds: [

            new EmbedBuilder()

              .setColor(
                "#5865F2"
              )

              .setTitle(
                `🛒 متجر ${settings.currencyName}`
              )

              .setDescription(
`${description}

━━━━━━━━━━━━━━

💰 **رصيدك الحالي:**
${money(
  balance,
  settings
)}`
              )

              .setFooter({
                text:
                  `للشراء: ${settings.buyCommand} رقم المنتج`
              })

              .setTimestamp()

          ]

        });
      }


      // ====================================
      // BUY PRODUCT
      // !zbuy 1
      // ====================================

      const buyCommand =
        settings.buyCommand
          .toLowerCase();


      if (
        lowerContent ===
          buyCommand ||

        lowerContent.startsWith(
          buyCommand + " "
        )
      ) {

        const productNumber =
          Number(
            content
              .slice(
                settings.buyCommand.length
              )
              .trim()
          );


        const productIndex =
          productNumber - 1;


        const product =
          shop[
            productIndex
          ];


        if (
          !Number.isInteger(
            productNumber
          ) ||
          productNumber <= 0 ||
          !product
        ) {

          return message.reply(
            `❌ الاستخدام: \`${settings.buyCommand} 1\``
          );
        }


        const price =
          Number(
            product.price
          );


        if (
          !Number.isSafeInteger(
            price
          ) ||
          price <= 0
        ) {

          return message.reply(
            "❌ سعر المنتج غير صحيح."
          );
        }


        const balance =
          getBalance(
            message.guild.id,
            message.author.id
          );


        if (
          balance <
          price
        ) {

          return message.reply({

            embeds: [

              new EmbedBuilder()

                .setColor(
                  "#ED4245"
                )

                .setTitle(
                  "❌ رصيد غير كافي"
                )

                .setDescription(
`🛒 **المنتج:**
${product.name}

💠 **السعر:**
${money(
  price,
  settings
)}

💰 **رصيدك:**
${money(
  balance,
  settings
)}

📉 **ينقصك:**
${money(
  price - balance,
  settings
)}**`
                )

            ]

          });
        }


        if (
          pendingPurchases.has(
            message.author.id
          )
        ) {

          return message.reply(
            "❌ لديك عملية شراء معلقة بالفعل."
          );
        }


        const operationId =
          `${message.author.id}-${Date.now()}`;


        pendingPurchases.set(
          message.author.id,
          {

            id:
              operationId,

            guildId:
              message.guild.id,

            channelId:
              message.channel.id,

            userId:
              message.author.id,

            productIndex,

            productName:
              String(
                product.name
              ),

            price,

            roleId:
              product.roleId
                ? String(
                    product.roleId
                  )
                : "",

            stage:
              "confirm"

          }
        );


        const row =
          new ActionRowBuilder()

            .addComponents(

              new ButtonBuilder()

                .setCustomId(
                  `zyro_buy_confirm:${operationId}`
                )

                .setLabel(
                  "تأكيد الشراء"
                )

                .setEmoji(
                  "✅"
                )

                .setStyle(
                  ButtonStyle.Success
                ),


              new ButtonBuilder()

                .setCustomId(
                  `zyro_buy_cancel:${operationId}`
                )

                .setLabel(
                  "إلغاء"
                )

                .setEmoji(
                  "❌"
                )

                .setStyle(
                  ButtonStyle.Danger
                )

            );


        await message.reply({

          embeds: [

            new EmbedBuilder()

              .setColor(
                "#5865F2"
              )

              .setTitle(
                "🛒 تأكيد عملية الشراء"
              )

              .setDescription(
`${product.emoji || "🛒"} **المنتج:**
${product.name}

💠 **السعر:**
${money(
  price,
  settings
)}

💰 **رصيدك الحالي:**
${money(
  balance,
  settings
)}

💳 **رصيدك بعد الشراء:**
${money(
  balance - price,
  settings
)}

اضغط **تأكيد الشراء** للمتابعة.`
              )

              .setFooter({
                text:
                  "لن يتم الخصم قبل كتابة الكود الصحيح"
              })

              .setTimestamp()

          ],

          components: [
            row
          ]

        });


        setTimeout(
          () => {

            const current =
              pendingPurchases.get(
                message.author.id
              );


            if (
              current?.id ===
              operationId
            ) {

              pendingPurchases.delete(
                message.author.id
              );
            }

          },

          120000
        );


        return;
      }

    }

  );
    // ========================================
  // SHOP BUTTONS
  // ========================================

  client.on(
    Events.InteractionCreate,

    async interaction => {

      if (
        !interaction.isButton() ||
        !interaction.guild
      ) {

        return;
      }


      // ====================================
      // CANCEL PURCHASE
      // ====================================

      if (
        interaction.customId.startsWith(
          "zyro_buy_cancel:"
        )
      ) {

        const operationId =
          interaction.customId.slice(
            "zyro_buy_cancel:".length
          );


        const pending =
          pendingPurchases.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !==
            operationId
        ) {

          return interaction.reply({

            content:
              "❌ العملية انتهت أو ليست خاصة بك.",

            ephemeral:
              true

          });
        }


        pendingPurchases.delete(
          interaction.user.id
        );


        return interaction.update({

          embeds: [

            new EmbedBuilder()

              .setColor(
                "#ED4245"
              )

              .setTitle(
                "❌ تم إلغاء الشراء"
              )

              .setDescription(
                "لم يتم خصم أي Zyro."
              )

          ],

          components: []

        });
      }


      // ====================================
      // CONFIRM PURCHASE
      // ====================================

      if (
        interaction.customId.startsWith(
          "zyro_buy_confirm:"
        )
      ) {

        const operationId =
          interaction.customId.slice(
            "zyro_buy_confirm:".length
          );


        const pending =
          pendingPurchases.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !==
            operationId
        ) {

          return interaction.reply({

            content:
              "❌ العملية انتهت أو ليست خاصة بك.",

            ephemeral:
              true

          });
        }


        if (
          pending.stage !==
          "confirm"
        ) {

          return interaction.reply({

            content:
              "❌ تم تأكيد العملية بالفعل.",

            ephemeral:
              true

          });
        }


        const balance =
          getBalance(
            interaction.guild.id,
            interaction.user.id
          );


        if (
          balance <
          pending.price
        ) {

          pendingPurchases.delete(
            interaction.user.id
          );


          return interaction.update({

            embeds: [

              new EmbedBuilder()

                .setColor(
                  "#ED4245"
                )

                .setTitle(
                  "❌ تم إلغاء الشراء"
                )

                .setDescription(
                  "رصيدك لم يعد كافيًا."
                )

            ],

            components: []

          });
        }


        const code =
          createCode();


        pending.code =
          code;


        pending.stage =
          "captcha";


        const image =
          await createCodeImage(
            code
          );


        await interaction.update({

          embeds: [

            new EmbedBuilder()

              .setColor(
                "#FEE75C"
              )

              .setTitle(
                "🔐 التحقق من الشراء"
              )

              .setDescription(
`اكتب **الأرقام الأربعة الموجودة في الصورة**.

⏱️ أمامك **60 ثانية**.

لن يتم خصم أي Zyro حتى تكتب الكود الصحيح.`
              )

              .setImage(
                "attachment://zyro-code.png"
              )

              .setFooter({
                text:
                  "KRX • Zyro Security"
              })

          ],

          files: [
            image
          ],

          components: []

        });


        const filter =
          message =>

            message.author.id ===
              interaction.user.id

            &&

            message.channel.id ===
              interaction.channel.id;


        try {

          const collected =
            await interaction.channel
              .awaitMessages({

                filter,

                max:
                  1,

                time:
                  60000,

                errors: [
                  "time"
                ]

              });


          const answer =
            collected
              .first()
              ?.content
              ?.trim();


          const current =
            pendingPurchases.get(
              interaction.user.id
            );


          if (
            !current ||
            current.id !==
              operationId
          ) {

            return;
          }


          if (
            answer !==
            current.code
          ) {

            pendingPurchases.delete(
              interaction.user.id
            );


            return interaction.channel.send({

              embeds: [

                new EmbedBuilder()

                  .setColor(
                    "#ED4245"
                  )

                  .setTitle(
                    "❌ الكود غير صحيح"
                  )

                  .setDescription(
                    "تم إلغاء الشراء ولم يتم خصم أي Zyro."
                  )

              ]

            });
          }


          const shop =
            Array.isArray(
              zyroShop[
                interaction.guild.id
              ]
            )
              ? zyroShop[
                  interaction.guild.id
                ]
              : [];


          const product =
            shop[
              current.productIndex
            ];


          if (
            !product
          ) {

            pendingPurchases.delete(
              interaction.user.id
            );


            return interaction.channel.send(
              "❌ المنتج لم يعد موجودًا. لم يتم الخصم."
            );
          }


          if (
            String(
              product.name
            ) !==
              current.productName ||

            Number(
              product.price
            ) !==
              current.price
          ) {

            pendingPurchases.delete(
              interaction.user.id
            );


            return interaction.channel.send(
              "❌ تم تعديل المنتج أثناء الشراء. لم يتم الخصم."
            );
          }


          const finalBalance =
            getBalance(
              interaction.guild.id,
              interaction.user.id
            );


          if (
            finalBalance <
            current.price
          ) {

            pendingPurchases.delete(
              interaction.user.id
            );


            return interaction.channel.send(
              "❌ رصيدك لم يعد كافيًا."
            );
          }


          let role =
            null;


          if (
            current.roleId
          ) {

            role =
              interaction.guild.roles.cache.get(
                current.roleId
              );


            if (
              !role
            ) {

              pendingPurchases.delete(
                interaction.user.id
              );


              return interaction.channel.send(
                "❌ رتبة المنتج غير موجودة. لم يتم الخصم."
              );
            }


            if (
              interaction.member.roles.cache.has(
                role.id
              )
            ) {

              pendingPurchases.delete(
                interaction.user.id
              );


              return interaction.channel.send(
                "❌ أنت تمتلك هذه الرتبة بالفعل."
              );
            }


            const botMember =
              interaction.guild.members.me;


            if (
              !botMember ||

              role.position >=
                botMember.roles.highest.position
            ) {

              pendingPurchases.delete(
                interaction.user.id
              );


              return interaction.channel.send(
                "❌ ارفع رتبة البوت فوق رتبة المنتج. لم يتم الخصم."
              );
            }


            try {

              await interaction.member.roles.add(
                role
              );


            } catch (error) {

              console.error(
                "ZYRO ROLE ERROR:",
                error
              );


              pendingPurchases.delete(
                interaction.user.id
              );


              return interaction.channel.send(
                "❌ فشل إعطاء الرتبة، لذلك لم يتم الخصم."
              );
            }

          }


          const newBalance =
            setBalance(
              interaction.guild.id,
              interaction.user.id,
              finalBalance -
                current.price
            );


          pendingPurchases.delete(
            interaction.user.id
          );


          const settings =
            getZyroGuild(
              interaction.guild.id
            ).settings;


          return interaction.channel.send({

            content:
              `${interaction.user}`,

            embeds: [

              new EmbedBuilder()

                .setColor(
                  "#57F287"
                )

                .setTitle(
                  "✅ تمت عملية الشراء"
                )

                .setDescription(
`🎁 **المنتج:**
${product.emoji || "🛒"} ${product.name}

💠 **تم خصم:**
${money(
  current.price,
  settings
)}

💰 **رصيدك الجديد:**
${money(
  newBalance,
  settings
)}

${role
  ? `🎉 تم إعطاؤك الرتبة ${role}`
  : "🎉 تم تسجيل عملية الشراء بنجاح."}`
                )

                .setFooter({
                  text:
                    "KRX • Zyro Shop"
                })

                .setTimestamp()

            ]

          });


        } catch {

          const current =
            pendingPurchases.get(
              interaction.user.id
            );


          if (
            current?.id ===
              operationId
          ) {

            pendingPurchases.delete(
              interaction.user.id
            );


            await interaction.channel.send({

              content:
                `${interaction.user}`,

              embeds: [

                new EmbedBuilder()

                  .setColor(
                    "#ED4245"
                  )

                  .setTitle(
                    "⌛ انتهى الوقت"
                  )

                  .setDescription(
                    "تم إلغاء الشراء ولم يتم خصم أي Zyro."
                  )

              ]

            }).catch(
              () => {}
            );
          }

        }


        return;
      }

    }

  );


  console.log(
    "💠 Zyro Economy loaded"
  );

}


// ==========================================
// EXPORTS
// ==========================================

module.exports = {

  registerZyro,

  getZyroGuild,

  getBalance,

  setBalance,

  addBalance,

  removeBalance,

  saveZyro,

  saveZyroShop,

  get zyroShop() {

    return zyroShop;

  }

};
