const fs = require("fs");
const path = require("path");

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

const ZYRO_FILE = path.join(__dirname, "zyro.json");
const ZYRO_SHOP_FILE = path.join(__dirname, "zyroShop.json");

const BOT_OWNER_ID = process.env.BOT_OWNER_ID;


// ==========================================
// LOAD JSON
// ==========================================

function loadJSON(file, fallback = {}) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(
        file,
        JSON.stringify(fallback, null, 2)
      );

      return fallback;
    }

    const raw = fs.readFileSync(file, "utf8").trim();

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);

  } catch (error) {
    console.error("ZYRO JSON ERROR:", error);
    return fallback;
  }
}


// ==========================================
// DATA
// ==========================================

let zyro = loadJSON(ZYRO_FILE, {});
let zyroShop = loadJSON(ZYRO_SHOP_FILE, {});


// ==========================================
// SAVE
// ==========================================

function saveZyro() {
  fs.writeFileSync(
    ZYRO_FILE,
    JSON.stringify(zyro, null, 2)
  );
}


function saveZyroShop() {
  fs.writeFileSync(
    ZYRO_SHOP_FILE,
    JSON.stringify(zyroShop, null, 2)
  );
}


// ==========================================
// DEFAULT SETTINGS
// ==========================================

function defaultZyroGuild() {
  return {
    settings: {
      currencyName: "Zyro",
      currencySymbol: "💠",

      balanceCommand: "z",
      transferCommand: "zpay",
      topCommand: "ztop",

      shopCommand: "!zshop",
      buyCommand: "!zbuy"
    },

    balances: {}
  };
}


// ==========================================
// GET GUILD DATA
// ==========================================

function getZyroGuild(guildId) {
  if (!zyro[guildId]) {
    zyro[guildId] = defaultZyroGuild();
    saveZyro();
  }

  if (!zyro[guildId].settings) {
    zyro[guildId].settings =
      defaultZyroGuild().settings;
  }

  if (!zyro[guildId].balances) {
    zyro[guildId].balances = {};
  }

  return zyro[guildId];
}


// ==========================================
// BALANCE FUNCTIONS
// ==========================================

function getBalance(guildId, userId) {
  const data = getZyroGuild(guildId);

  return Number(
    data.balances[userId] || 0
  );
}


function setBalance(guildId, userId, amount) {
  const data = getZyroGuild(guildId);

  data.balances[userId] = Math.max(
    0,
    Math.floor(Number(amount) || 0)
  );

  saveZyro();

  return data.balances[userId];
}


function addBalance(guildId, userId, amount) {
  const current = getBalance(guildId, userId);

  return setBalance(
    guildId,
    userId,
    current + Number(amount)
  );
}


function removeBalance(guildId, userId, amount) {
  const current = getBalance(guildId, userId);

  return setBalance(
    guildId,
    userId,
    current - Number(amount)
  );
}


// ==========================================
// MONEY FORMAT
// ==========================================

function money(amount, settings) {
  return `${settings.currencySymbol} ${Number(
    amount
  ).toLocaleString("en-US")} ${settings.currencyName}`;
}


// ==========================================
// OWNER CHECK
// ==========================================

function isBotOwner(userId) {
  return Boolean(BOT_OWNER_ID) &&
    userId === BOT_OWNER_ID;
}


// ==========================================
// PENDING OPERATIONS
// ==========================================

const pendingTransfers = new Map();
const pendingPurchases = new Map();


// ==========================================
// SECURITY CODE
// ==========================================

function createCode() {
  return String(
    Math.floor(
      1000 + Math.random() * 9000
    )
  );
}


// ==========================================
// CREATE SECURITY IMAGE
// ==========================================

function createCodeImage(code) {
  const rotations = [-8, 5, -4, 7];

  const numbers = code
    .split("")
    .map((number, index) => {
      const x = 68 + index * 70;
      const y = index % 2 === 0 ? 108 : 98;

      return `
<text
x="${x}"
y="${y}"
font-size="58"
font-weight="900"
font-family="Arial"
fill="white"
transform="rotate(${rotations[index]} ${x} ${y})"
>${number}</text>`;
    })
    .join("");


  const svg = `
<svg
xmlns="http://www.w3.org/2000/svg"
width="360"
height="160"
viewBox="0 0 360 160"
>

<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#111827"/>
<stop offset="100%" stop-color="#312e81"/>
</linearGradient>
</defs>

<rect
width="360"
height="160"
rx="24"
fill="url(#bg)"
/>

<circle
cx="35"
cy="30"
r="70"
fill="#5865F2"
opacity="0.18"
/>

<circle
cx="330"
cy="145"
r="80"
fill="#8B5CF6"
opacity="0.15"
/>

<line
x1="20"
y1="45"
x2="340"
y2="125"
stroke="white"
stroke-opacity="0.12"
stroke-width="3"
/>

<line
x1="15"
y1="125"
x2="345"
y2="38"
stroke="white"
stroke-opacity="0.10"
stroke-width="2"
/>

${numbers}

<text
x="180"
y="145"
text-anchor="middle"
font-size="12"
font-family="Arial"
fill="#A5B4FC"
>
KRX • ZYRO SECURITY
</text>

</svg>
`;


  return new AttachmentBuilder(
    Buffer.from(svg),
    {
      name: "zyro-code.svg"
    }
  );
}


// ==========================================
// REGISTER ZYRO
// ==========================================

function registerZyro(client) {

  client.on(
    Events.MessageCreate,
    async message => {

      if (
        message.author.bot ||
        !message.guild
      ) {
        return;
      }


      const data = getZyroGuild(
        message.guild.id
      );

      const settings = data.settings;

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
          message.mentions.users.first() ||
          message.author;


        const balance = getBalance(
          message.guild.id,
          target.id
        );


        const embed =
          new EmbedBuilder()

            .setColor("#5865F2")

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
              text: "KRX • Zyro Economy"
            })

            .setTimestamp();


        return message.reply({
          embeds: [embed]
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

        if (!isBotOwner(message.author.id)) {
          return message.reply(
            "❌ هذا الأمر لصاحب البوت فقط."
          );
        }


        const member =
          message.mentions.members.first();

        const amount =
          Number(args[2]);


        if (
          !member ||
          !Number.isSafeInteger(amount) ||
          amount <= 0
        ) {

          return message.reply(
            "❌ الاستخدام: `+zyro @user 1000`"
          );
        }


        const newBalance = addBalance(
          message.guild.id,
          member.id,
          amount
        );


        return message.reply(
`✅ تمت إضافة **${money(
  amount,
  settings
)}** إلى ${member}.

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

        if (!isBotOwner(message.author.id)) {
          return message.reply(
            "❌ هذا الأمر لصاحب البوت فقط."
          );
        }


        const member =
          message.mentions.members.first();

        const amount =
          Number(args[2]);


        if (
          !member ||
          !Number.isSafeInteger(amount) ||
          amount <= 0
        ) {

          return message.reply(
            "❌ الاستخدام: `-zyro @user 500`"
          );
        }


        const newBalance = removeBalance(
          message.guild.id,
          member.id,
          amount
        );


        return message.reply(
`✅ تم خصم **${money(
  amount,
  settings
)}** من ${member}.

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

        if (!isBotOwner(message.author.id)) {
          return message.reply(
            "❌ هذا الأمر لصاحب البوت فقط."
          );
        }


        const member =
          message.mentions.members.first();

        const amount =
          Number(args[2]);


        if (
          !member ||
          !Number.isSafeInteger(amount) ||
          amount < 0
        ) {

          return message.reply(
            "❌ الاستخدام: `!setzyro @user 5000`"
          );
        }


        const newBalance = setBalance(
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

        if (!isBotOwner(message.author.id)) {
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

        const top = Object.entries(
          data.balances
        )
          .sort(
            (a, b) =>
              Number(b[1]) - Number(a[1])
          )
          .slice(0, 10);


        if (!top.length) {
          return message.reply(
            `❌ لا توجد أرصدة ${settings.currencyName} حتى الآن.`
          );
        }


        const description = top
          .map(
            ([userId, balance], index) => {

              let medal = `#${index + 1}`;

              if (index === 0) medal = "🥇";
              if (index === 1) medal = "🥈";
              if (index === 2) medal = "🥉";

              return (
                `${medal} <@${userId}>\n` +
                `└ **${money(balance, settings)}**`
              );
            }
          )
          .join("\n\n");


        const embed =
          new EmbedBuilder()

            .setColor("#FEE75C")

            .setTitle(
              `🏆 أغنى أعضاء ${settings.currencyName}`
            )

            .setDescription(description)

            .setFooter({
              text: "KRX • Zyro Leaderboard"
            })

            .setTimestamp();


        return message.reply({
          embeds: [embed]
        });
      }


      // ====================================
      // TRANSFER ZYRO
      // zpay @user 500
      // ====================================

      if (
        args[0].toLowerCase() ===
        settings.transferCommand.toLowerCase()
      ) {

        const target =
          message.mentions.members.first();

        const amount =
          Number(args[2]);


        if (!target) {
          return message.reply(
            `❌ الاستخدام: \`${settings.transferCommand} @user 500\``
          );
        }


        if (target.user.bot) {
          return message.reply(
            "❌ لا يمكنك تحويل Zyro إلى بوت."
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
          !Number.isSafeInteger(amount) ||
          amount <= 0
        ) {
          return message.reply(
            "❌ اكتب مبلغًا صحيحًا أكبر من 0."
          );
        }


        const currentBalance =
          getBalance(
            message.guild.id,
            message.author.id
          );


        if (currentBalance < amount) {

          return message.reply({
            embeds: [

              new EmbedBuilder()

                .setColor("#ED4245")

                .setTitle(
                  "❌ رصيد غير كافي"
                )

                .setDescription(
`💸 المبلغ:
**${money(amount, settings)}**

💰 رصيدك:
**${money(currentBalance, settings)}**

📉 ينقصك:
**${money(
  amount - currentBalance,
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


        const transactionId =
          `${message.author.id}-${Date.now()}`;


        pendingTransfers.set(
          message.author.id,
          {
            id: transactionId,
            guildId: message.guild.id,
            channelId: message.channel.id,
            senderId: message.author.id,
            targetId: target.id,
            amount,
            stage: "confirm",
            createdAt: Date.now()
          }
        );


        const row =
          new ActionRowBuilder()

            .addComponents(

              new ButtonBuilder()

                .setCustomId(
                  `zyro_transfer_confirm:${transactionId}`
                )

                .setLabel(
                  "تأكيد التحويل"
                )

                .setEmoji("✅")

                .setStyle(
                  ButtonStyle.Success
                ),


              new ButtonBuilder()

                .setCustomId(
                  `zyro_transfer_cancel:${transactionId}`
                )

                .setLabel("إلغاء")

                .setEmoji("❌")

                .setStyle(
                  ButtonStyle.Danger
                )

            );


        const embed =
          new EmbedBuilder()

            .setColor("#5865F2")

            .setTitle(
              "💠 تأكيد تحويل Zyro"
            )

            .setDescription(
`👤 **التحويل إلى:**
${target}

💸 **المبلغ:**
${money(amount, settings)}

💰 **رصيدك الحالي:**
${money(currentBalance, settings)}

💳 **رصيدك بعد التحويل:**
${money(
  currentBalance - amount,
  settings
)}

اضغط **تأكيد التحويل** للمتابعة.`
            )

            .setFooter({
              text:
                "لن يتم خصم الرصيد قبل التحقق"
            })

            .setTimestamp();


        await message.reply({
          embeds: [embed],
          components: [row]
        });


        setTimeout(
          () => {

            const pending =
              pendingTransfers.get(
                message.author.id
              );

            if (
              pending &&
              pending.id === transactionId &&
              pending.stage === "confirm"
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

        const transactionId =
          interaction.customId
            .slice(
              "zyro_transfer_cancel:".length
            );


        const pending =
          pendingTransfers.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !== transactionId
        ) {
          return interaction.reply({
            content:
              "❌ العملية انتهت أو ليست خاصة بك.",
            ephemeral: true
          });
        }


        pendingTransfers.delete(
          interaction.user.id
        );


        return interaction.update({
          embeds: [

            new EmbedBuilder()

              .setColor("#ED4245")

              .setTitle(
                "❌ تم إلغاء التحويل"
              )

              .setDescription(
                "لم يتم خصم أي Zyro من حسابك."
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

        const transactionId =
          interaction.customId
            .slice(
              "zyro_transfer_confirm:".length
            );


        const pending =
          pendingTransfers.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !== transactionId
        ) {
          return interaction.reply({
            content:
              "❌ العملية انتهت أو ليست خاصة بك.",
            ephemeral: true
          });
        }


        if (
          pending.stage !== "confirm"
        ) {
          return interaction.reply({
            content:
              "❌ تم تأكيد العملية بالفعل.",
            ephemeral: true
          });
        }


        const balance =
          getBalance(
            interaction.guild.id,
            interaction.user.id
          );


        if (
          balance < pending.amount
        ) {

          pendingTransfers.delete(
            interaction.user.id
          );

          return interaction.update({
            embeds: [

              new EmbedBuilder()

                .setColor("#ED4245")

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


        const code = createCode();

        pending.code = code;
        pending.stage = "captcha";
        pending.expiresAt =
          Date.now() + 60000;


        const image =
          createCodeImage(code);


        await interaction.update({
          embeds: [

            new EmbedBuilder()

              .setColor("#FEE75C")

              .setTitle(
                "🔐 التحقق من التحويل"
              )

              .setDescription(
`اكتب **الأرقام الأربعة الموجودة في الصورة** في الشات.

⏱️ أمامك **60 ثانية**.

لن يتم خصم أي Zyro حتى تكتب الرقم الصحيح.`
              )

              .setImage(
                "attachment://zyro-code.svg"
              )

              .setFooter({
                text:
                  "KRX • Zyro Security"
              })

          ],

          files: [image],
          components: []
        });


        const filter =
          msg =>
            msg.author.id ===
              interaction.user.id &&
            msg.channel.id ===
              interaction.channel.id;


        try {

          const collected =
            await interaction.channel
              .awaitMessages({
                filter,
                max: 1,
                time: 60000,
                errors: ["time"]
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
            current.id !== transactionId
          ) {
            return;
          }


          if (
            answer !== current.code
          ) {

            pendingTransfers.delete(
              interaction.user.id
            );

            return interaction.channel.send({
              embeds: [

                new EmbedBuilder()

                  .setColor("#ED4245")

                  .setTitle(
                    "❌ الرقم غير صحيح"
                  )

                  .setDescription(
                    "تم إلغاء التحويل ولم يتم خصم أي Zyro."
                  )

              ]
            });
          }


          // ==================================
          // FINAL BALANCE CHECK
          // ==================================

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
              "❌ رصيدك لم يعد كافيًا. لم يتم التحويل."
            );
          }


          const receiverBalance =
            getBalance(
              interaction.guild.id,
              current.targetId
            );


          // ==================================
          // EXECUTE TRANSFER
          // ==================================

          setBalance(
            interaction.guild.id,
            interaction.user.id,
            senderBalance - current.amount
          );


          setBalance(
            interaction.guild.id,
            current.targetId,
            receiverBalance + current.amount
          );


          pendingTransfers.delete(
            interaction.user.id
          );


          const guildSettings =
            getZyroGuild(
              interaction.guild.id
            ).settings;


          const newBalance =
            getBalance(
              interaction.guild.id,
              interaction.user.id
            );


          await interaction.channel.send({
            embeds: [

              new EmbedBuilder()

                .setColor("#57F287")

                .setTitle(
                  "✅ تم تحويل Zyro"
                )

                .setDescription(
`${interaction.user} أرسل:

**${money(
  current.amount,
  guildSettings
)}**

إلى:
<@${current.targetId}>

💰 رصيدك الآن:
**${money(
  newBalance,
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


          // ==================================
          // DM RECEIVER
          // ==================================

          const receiver =
            await interaction.guild.members
              .fetch(current.targetId)
              .catch(() => null);


          if (receiver) {

            const newReceiverBalance =
              getBalance(
                interaction.guild.id,
                receiver.id
              );


            await receiver.send({
              embeds: [

                new EmbedBuilder()

                  .setColor("#57F287")

                  .setTitle(
                    "💠 استلمت Zyro!"
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
            }).catch(() => {});
          }


        } catch {

          const current =
            pendingTransfers.get(
              interaction.user.id
            );


          if (
            current &&
            current.id === transactionId
          ) {

            pendingTransfers.delete(
              interaction.user.id
            );


            await interaction.channel.send({
              content:
                `${interaction.user}`,

              embeds: [

                new EmbedBuilder()

                  .setColor("#ED4245")

                  .setTitle(
                    "⌛ انتهى الوقت"
                  )

                  .setDescription(
                    "تم إلغاء التحويل ولم يتم خصم أي Zyro."
                  )

              ]
            }).catch(() => {});
          }

        }


        return;
      }

    }
  );
    // ========================================
  // ZYRO SHOP MESSAGE COMMANDS
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


      if (
        !Array.isArray(
          zyroShop[message.guild.id]
        )
      ) {
        zyroShop[message.guild.id] = [];
      }


      const guildShop =
        zyroShop[message.guild.id];


      // ====================================
      // SHOW SHOP
      // !zshop
      // ====================================

      if (
        content.toLowerCase() ===
        settings.shopCommand.toLowerCase()
      ) {

        if (!guildShop.length) {

          return message.reply({
            embeds: [

              new EmbedBuilder()

                .setColor("#5865F2")

                .setTitle(
                  `🛒 ${settings.currencyName} Shop`
                )

                .setDescription(
                  "❌ لا توجد منتجات في المتجر حاليًا."
                )

            ]
          });
        }


        const products =
          guildShop
            .map(
              (item, index) => {

                return (
`**${index + 1}. ${item.emoji || "🛒"} ${item.name}**

${item.description || "بدون وصف"}

💠 السعر:
**${money(
  Number(item.price),
  settings
)}**

🛍️ للشراء:
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


        const embed =
          new EmbedBuilder()

            .setColor("#5865F2")

            .setTitle(
              `💠 ${settings.currencyName} Shop`
            )

            .setDescription(
`${products}

━━━━━━━━━━━━━━

💰 رصيدك الحالي:
**${money(
  balance,
  settings
)}**`
            )

            .setFooter({
              text:
                `للشراء: ${settings.buyCommand} رقم المنتج`
            })

            .setTimestamp();


        return message.reply({
          embeds: [embed]
        });
      }


      // ====================================
      // BUY COMMAND
      // !zbuy 1
      // ====================================

      const buyCommand =
        settings.buyCommand.toLowerCase();


      if (
        content.toLowerCase() ===
          buyCommand ||
        content.toLowerCase().startsWith(
          buyCommand + " "
        )
      ) {

        const value =
          content
            .slice(
              settings.buyCommand.length
            )
            .trim();


        const productNumber =
          Number(value);

        const productIndex =
          productNumber - 1;

        const product =
          guildShop[productIndex];


        if (
          !Number.isInteger(productNumber) ||
          productNumber <= 0 ||
          !product
        ) {

          return message.reply(
            `❌ الاستخدام: \`${settings.buyCommand} 1\``
          );
        }


        const price =
          Number(product.price);


        if (
          !Number.isSafeInteger(price) ||
          price <= 0
        ) {

          return message.reply(
            "❌ سعر هذا المنتج غير صحيح."
          );
        }


        const balance =
          getBalance(
            message.guild.id,
            message.author.id
          );


        if (
          balance < price
        ) {

          return message.reply({
            embeds: [

              new EmbedBuilder()

                .setColor("#ED4245")

                .setTitle(
                  "❌ رصيد غير كافي"
                )

                .setDescription(
`🛒 المنتج:
**${product.name}**

💠 السعر:
**${money(
  price,
  settings
)}**

💰 رصيدك:
**${money(
  balance,
  settings
)}**

📉 ينقصك:
**${money(
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


        const purchaseId =
          `${message.author.id}-${Date.now()}`;


        pendingPurchases.set(
          message.author.id,
          {
            id: purchaseId,

            guildId:
              message.guild.id,

            channelId:
              message.channel.id,

            userId:
              message.author.id,

            productIndex,

            productName:
              String(product.name),

            price,

            roleId:
              product.roleId
                ? String(product.roleId)
                : null,

            stage: "confirm",

            createdAt:
              Date.now()
          }
        );


        const row =
          new ActionRowBuilder()

            .addComponents(

              new ButtonBuilder()

                .setCustomId(
                  `zyro_buy_confirm:${purchaseId}`
                )

                .setLabel(
                  "تأكيد الشراء"
                )

                .setEmoji("✅")

                .setStyle(
                  ButtonStyle.Success
                ),


              new ButtonBuilder()

                .setCustomId(
                  `zyro_buy_cancel:${purchaseId}`
                )

                .setLabel("إلغاء")

                .setEmoji("❌")

                .setStyle(
                  ButtonStyle.Danger
                )

            );


        const embed =
          new EmbedBuilder()

            .setColor("#5865F2")

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
                "لن يتم خصم الرصيد قبل التحقق"
            })

            .setTimestamp();


        await message.reply({
          embeds: [embed],
          components: [row]
        });


        setTimeout(
          () => {

            const pending =
              pendingPurchases.get(
                message.author.id
              );


            if (
              pending &&
              pending.id === purchaseId &&
              pending.stage === "confirm"
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
  // ZYRO SHOP BUTTONS
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

        const purchaseId =
          interaction.customId.slice(
            "zyro_buy_cancel:".length
          );


        const pending =
          pendingPurchases.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !== purchaseId
        ) {

          return interaction.reply({
            content:
              "❌ العملية انتهت أو ليست خاصة بك.",

            ephemeral: true
          });
        }


        pendingPurchases.delete(
          interaction.user.id
        );


        return interaction.update({
          embeds: [

            new EmbedBuilder()

              .setColor("#ED4245")

              .setTitle(
                "❌ تم إلغاء الشراء"
              )

              .setDescription(
                "لم يتم خصم أي Zyro من حسابك."
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

        const purchaseId =
          interaction.customId.slice(
            "zyro_buy_confirm:".length
          );


        const pending =
          pendingPurchases.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !== purchaseId
        ) {

          return interaction.reply({
            content:
              "❌ العملية انتهت أو ليست خاصة بك.",

            ephemeral: true
          });
        }


        if (
          pending.stage !== "confirm"
        ) {

          return interaction.reply({
            content:
              "❌ تم تأكيد العملية بالفعل.",

            ephemeral: true
          });
        }


        // ==================================
        // CHECK BALANCE AGAIN
        // ==================================

        const balance =
          getBalance(
            interaction.guild.id,
            interaction.user.id
          );


        if (
          balance < pending.price
        ) {

          pendingPurchases.delete(
            interaction.user.id
          );


          return interaction.update({
            embeds: [

              new EmbedBuilder()

                .setColor("#ED4245")

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


        // ==================================
        // CREATE 4 DIGIT CODE
        // ==================================

        const code =
          createCode();


        pending.code = code;
        pending.stage = "captcha";
        pending.expiresAt =
          Date.now() + 60000;


        const image =
          createCodeImage(code);


        await interaction.update({
          embeds: [

            new EmbedBuilder()

              .setColor("#FEE75C")

              .setTitle(
                "🔐 تأكيد عملية الشراء"
              )

              .setDescription(
`اكتب **الأرقام الأربعة الموجودة في الصورة** في الشات.

⏱️ أمامك **60 ثانية**.

إذا كتبت الرقم الصحيح سيتم إكمال عملية الشراء.

إذا أخطأت أو انتهى الوقت فلن يتم خصم أي Zyro.`
              )

              .setImage(
                "attachment://zyro-code.svg"
              )

              .setFooter({
                text:
                  "KRX • Zyro Security"
              })

          ],

          files: [image],
          components: []
        });


        const filter =
          msg =>
            msg.author.id ===
              interaction.user.id &&
            msg.channel.id ===
              interaction.channel.id;


        try {

          const collected =
            await interaction.channel
              .awaitMessages({
                filter,
                max: 1,
                time: 60000,
                errors: ["time"]
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
            current.id !== purchaseId
          ) {
            return;
          }


          // ==================================
          // WRONG SECURITY CODE
          // ==================================

          if (
            answer !== current.code
          ) {

            pendingPurchases.delete(
              interaction.user.id
            );


            return interaction.channel.send({
              embeds: [

                new EmbedBuilder()

                  .setColor("#ED4245")

                  .setTitle(
                    "❌ الرقم غير صحيح"
                  )

                  .setDescription(
                    "تم إلغاء الشراء ولم يتم خصم أي Zyro."
                  )

              ]
            });
          }


          // ==================================
          // GET PRODUCT AGAIN
          // ==================================

          const currentShop =
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
            currentShop[
              current.productIndex
            ];


          if (!product) {

            pendingPurchases.delete(
              interaction.user.id
            );


            return interaction.channel.send(
              "❌ المنتج لم يعد موجودًا. لم يتم الخصم."
            );
          }


          if (
            String(product.name) !==
              current.productName ||
            Number(product.price) !==
              current.price
          ) {

            pendingPurchases.delete(
              interaction.user.id
            );


            return interaction.channel.send(
              "❌ تم تعديل المنتج أثناء عملية الشراء. لم يتم الخصم."
            );
          }


          // ==================================
          // FINAL BALANCE CHECK
          // ==================================

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
              "❌ رصيدك لم يعد كافيًا. لم يتم الخصم."
            );
          }


          // ==================================
          // CHECK PRODUCT ROLE
          // ==================================

          let role = null;


          if (current.roleId) {

            role =
              interaction.guild.roles.cache.get(
                current.roleId
              );


            if (!role) {

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
                "❌ أنت تمتلك هذه الرتبة بالفعل. لم يتم الخصم."
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
                "❌ رتبة البوت يجب أن تكون أعلى من رتبة المنتج. لم يتم الخصم."
              );
            }

          }


          // ==================================
          // GIVE ROLE
          // ==================================

          if (role) {

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
                "❌ لم أستطع إعطاء الرتبة، لذلك لم يتم الخصم."
              );
            }

          }


          // ==================================
          // CHARGE
          // ==================================

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


          const guildSettings =
            getZyroGuild(
              interaction.guild.id
            ).settings;


          // ==================================
          // PURCHASE SUCCESS
          // ==================================

          return interaction.channel.send({
            content:
              `${interaction.user}`,

            embeds: [

              new EmbedBuilder()

                .setColor("#57F287")

                .setTitle(
                  "✅ تمت عملية الشراء"
                )

                .setDescription(
`🎁 **المنتج:**
${product.emoji || "🛒"} ${product.name}

💠 **تم خصم:**
${money(
  current.price,
  guildSettings
)}

💰 **رصيدك الجديد:**
${money(
  newBalance,
  guildSettings
)}

${role
  ? `🎉 تم إعطاؤك الرتبة ${role}`
  : "🎉 تمت عملية الشراء بنجاح."}`
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
            current &&
            current.id === purchaseId
          ) {

            pendingPurchases.delete(
              interaction.user.id
            );


            await interaction.channel.send({
              content:
                `${interaction.user}`,

              embeds: [

                new EmbedBuilder()

                  .setColor("#ED4245")

                  .setTitle(
                    "⌛ انتهى الوقت"
                  )

                  .setDescription(
                    "تم إلغاء الشراء ولم يتم خصم أي Zyro."
                  )

              ]
            }).catch(() => {});

          }

        }


        return;
      }

    }
  );


  // ========================================
  // ZYRO READY
  // ========================================

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
