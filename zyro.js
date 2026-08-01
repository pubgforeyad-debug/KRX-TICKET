const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require("discord.js");

const ZYRO_FILE =
  path.join(
    __dirname,
    "zyro.json"
  );

const SHOP_FILE =
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
  fallback
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


    const text =
      fs.readFileSync(
        file,
        "utf8"
      ).trim();


    return text
      ? JSON.parse(text)
      : fallback;


  } catch (error) {

    console.error(
      `Failed to load ${path.basename(file)}:`,
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
    SHOP_FILE,
    {}
  );


// ==========================================
// SAVE
// ==========================================

function saveJSON(
  file,
  value
) {

  fs.writeFileSync(
    file,
    JSON.stringify(
      value,
      null,
      2
    )
  );
}


function saveZyro() {

  saveJSON(
    ZYRO_FILE,
    zyro
  );
}


function saveZyroShop() {

  saveJSON(
    SHOP_FILE,
    zyroShop
  );
}


// ==========================================
// SETTINGS
// ==========================================

function defaultSettings() {

  return {

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

  };
}


// ==========================================
// GUILD DATA
// ==========================================

function getZyroGuild(
  guildId
) {

  if (
    !zyro[guildId] ||
    typeof zyro[guildId] !==
      "object"
  ) {

    zyro[guildId] = {

      settings:
        defaultSettings(),

      balances:
        {}

    };
  }


  zyro[guildId].settings = {

    ...defaultSettings(),

    ...(
      zyro[guildId].settings ||
      {}
    )

  };


  if (
    !zyro[guildId].balances ||
    typeof zyro[guildId].balances !==
      "object"
  ) {

    zyro[guildId].balances =
      {};
  }


  return zyro[guildId];
}


// ==========================================
// SHOP DATA
// ==========================================

function getShop(
  guildId
) {

  if (
    !Array.isArray(
      zyroShop[guildId]
    )
  ) {

    zyroShop[guildId] =
      [];
  }


  return zyroShop[guildId];
}


// ==========================================
// BALANCE
// ==========================================

function getBalance(
  guildId,
  userId
) {

  return Number(

    getZyroGuild(
      guildId
    ).balances[userId]

    ||

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


  return data.balances[userId];
}


function addBalance(
  guildId,
  userId,
  amount
) {

  return setBalance(

    guildId,

    userId,

    getBalance(
      guildId,
      userId
    )
    +
    Number(amount)

  );
}


function removeBalance(
  guildId,
  userId,
  amount
) {

  return setBalance(

    guildId,

    userId,

    getBalance(
      guildId,
      userId
    )
    -
    Number(amount)

  );
}


// ==========================================
// HELPERS
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


function isOwner(
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


function makeCode() {

  return String(

    Math.floor(

      1000 +

      Math.random() *
      9000

    )

  );
}


// ==========================================
// PNG SECURITY IMAGE
// ==========================================

async function makeCodeImage(
  code
) {

  const safe =
    String(code)

      .replace(
        /\D/g,
        ""
      )

      .slice(
        0,
        4
      );


  const positions =
    [
      120,
      240,
      360,
      480
    ];


  const rotations =
    [
      -7,
      5,
      -4,
      7
    ];


  const digits =
    safe

      .split("")

      .map(
        (
          digit,
          index
        ) => {

          const x =
            positions[index];


          const y =
            index % 2 === 0
              ? 165
              : 150;


          return `
<text
  x="${x}"
  y="${y}"
  text-anchor="middle"
  font-family="Arial"
  font-size="90"
  font-weight="900"
  fill="#ffffff"
  transform="rotate(${rotations[index]} ${x} ${y})"
>
${digit}
</text>
`;

        }
      )

      .join("");


  const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="600"
  height="260"
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
        stop-color="#0f172a"
      />

      <stop
        offset="50%"
        stop-color="#312e81"
      />

      <stop
        offset="100%"
        stop-color="#581c87"
      />

    </linearGradient>

  </defs>


  <rect
    width="600"
    height="260"
    rx="30"
    fill="url(#bg)"
  />


  <circle
    cx="35"
    cy="25"
    r="120"
    fill="#5865f2"
    opacity=".20"
  />


  <circle
    cx="570"
    cy="240"
    r="130"
    fill="#a855f7"
    opacity=".16"
  />


  <text
    x="300"
    y="45"
    text-anchor="middle"
    font-family="Arial"
    font-size="20"
    font-weight="700"
    fill="#c7d2fe"
  >
    KRX • ZYRO SECURITY
  </text>


  <line
    x1="40"
    y1="90"
    x2="560"
    y2="195"
    stroke="#ffffff"
    stroke-width="4"
    opacity=".13"
  />


  <line
    x1="35"
    y1="195"
    x2="565"
    y2="85"
    stroke="#ffffff"
    stroke-width="3"
    opacity=".11"
  />


  ${digits}


  <text
    x="300"
    y="230"
    text-anchor="middle"
    font-family="Arial"
    font-size="15"
    fill="#a5b4fc"
  >
    ENTER THE 4 DIGITS IN CHAT
  </text>

</svg>
`;


  const png =
    await sharp(
      Buffer.from(svg)
    )

      .png()

      .toBuffer();


  return new AttachmentBuilder(

    png,

    {
      name:
        "zyro-code.png"
    }

  );
}


// ==========================================
// PENDING OPERATIONS
// ==========================================

const pendingTransfers =
  new Map();


const pendingPurchases =
  new Map();


function expirePending(
  map,
  userId,
  operationId
) {

  setTimeout(
    () => {

      const current =
        map.get(
          userId
        );


      if (
        current?.id ===
        operationId
      ) {

        map.delete(
          userId
        );
      }

    },

    120000
  );
}
// ==========================================
// REGISTER ZYRO
// ==========================================

function registerZyro(
  client
) {

  // ========================================
  // MESSAGE COMMANDS
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


      const content =
        message.content.trim();


      const args =
        content.split(/\s+/);


      const command =
        args[0]?.toLowerCase();


      // ====================================
      // SHOW BALANCE
      // z
      // z @user
      // ====================================

      if (
        command ===
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


        return message.reply({

          embeds: [

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
                  size: 128
                })
              )

              .setFooter({
                text:
                  "KRX • Zyro Economy"
              })

              .setTimestamp()

          ]

        });
      }


      // ====================================
      // OWNER ADD
      // +zyro @user 1000
      // ====================================

      if (
        command ===
        "+zyro"
      ) {

        if (
          !isOwner(
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
      // OWNER REMOVE
      // -zyro @user 500
      // ====================================

      if (
        command ===
        "-zyro"
      ) {

        if (
          !isOwner(
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
      // OWNER SET
      // !setzyro @user 5000
      // ====================================

      if (
        command ===
        "!setzyro"
      ) {

        if (
          !isOwner(
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
      // OWNER RESET
      // !resetzyro @user
      // ====================================

      if (
        command ===
        "!resetzyro"
      ) {

        if (
          !isOwner(
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
      // TOP
      // ztop
      // ====================================

      if (
        command ===
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
        command ===
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


        expirePending(
          pendingTransfers,
          message.author.id,
          operationId
        );


        return;
      }

    }

  );


  // ========================================
  // TRANSFER INTERACTIONS
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
          makeCode();


        pending.code =
          code;


        pending.stage =
          "captcha";


        const image =
          await makeCodeImage(
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


          const guildSettings =
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
  guildSettings
)}**

إلى:
<@${current.targetId}>

💰 رصيدك الآن:
**${money(
  newSenderBalance,
  guildSettings
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


          if (receiver) {

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
  guildSettings
)}**

💰 رصيدك الآن:
**${money(
  newReceiverBalance,
  guildSettings
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


      const shop =
        getShop(
          message.guild.id
        );


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

                .setFooter({
                  text:
                    "KRX • Zyro Shop"
                })

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

        const numberText =
          content
            .slice(
              settings.buyCommand.length
            )
            .trim();


        const productNumber =
          Number(
            numberText
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
)}`
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


        expirePending(
          pendingPurchases,
          message.author.id,
          operationId
        );


        return;
      }

    }

  );


  // ========================================
  // SHOP INTERACTIONS
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
          makeCode();


        pending.code =
          code;


        pending.stage =
          "captcha";


        const image =
          await makeCodeImage(
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
            getShop(
              interaction.guild.id
            );


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
