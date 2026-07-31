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

const ZYRO_FILE =
  path.join(__dirname, "zyro.json");

const ZYRO_SHOP_FILE =
  path.join(__dirname, "zyroShop.json");

const BOT_OWNER_ID =
  process.env.BOT_OWNER_ID;


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

    const raw =
      fs.readFileSync(file, "utf8").trim();

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


let zyro =
  loadJSON(ZYRO_FILE, {});

let zyroShop =
  loadJSON(ZYRO_SHOP_FILE, {});


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
// GET SERVER DATA
// ==========================================

function getZyroGuild(guildId) {

  if (!zyro[guildId]) {

    zyro[guildId] =
      defaultZyroGuild();

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
// GET BALANCE
// ==========================================

function getBalance(
  guildId,
  userId
) {

  const data =
    getZyroGuild(guildId);


  return Number(
    data.balances[userId] || 0
  );
}


// ==========================================
// SET BALANCE
// ==========================================

function setBalance(
  guildId,
  userId,
  amount
) {

  const data =
    getZyroGuild(guildId);


  data.balances[userId] =
    Math.max(
      0,
      Math.floor(
        Number(amount) || 0
      )
    );


  saveZyro();


  return data.balances[userId];
}


// ==========================================
// ADD BALANCE
// ==========================================

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
    current + Number(amount)
  );
}


// ==========================================
// REMOVE BALANCE
// ==========================================

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
    current - Number(amount)
  );
}


// ==========================================
// FORMAT MONEY
// ==========================================

function money(
  amount,
  settings
) {

  return `${settings.currencySymbol} ${Number(
    amount
  ).toLocaleString("en-US")} ${settings.currencyName}`;
}


// ==========================================
// OWNER CHECK
// ==========================================

function isBotOwner(userId) {

  return (
    Boolean(BOT_OWNER_ID) &&
    userId === BOT_OWNER_ID
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
// RANDOM 4 DIGIT CODE
// ==========================================

function createCode() {

  return String(
    Math.floor(
      1000 +
      Math.random() * 9000
    )
  );
}


// ==========================================
// CAPTCHA IMAGE
// بدون Canvas
// ==========================================

function createCodeImage(code) {

  const rotations =
    [-8, 5, -4, 7];


  const numbers =
    code
      .split("")
      .map(
        (number, index) => {

          const x =
            68 + index * 70;

          const y =
            index % 2 === 0
              ? 108
              : 98;

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
        }
      )
      .join("");


  const svg = `
<svg
xmlns="http://www.w3.org/2000/svg"
width="360"
height="160"
viewBox="0 0 360 160"
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
stop-color="#111827"
/>

<stop
offset="100%"
stop-color="#312e81"
/>

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
      name:
        "zyro-code.svg"
    }
  );
}


// ==========================================
// BALANCE COMMAND
// default: z
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
                size: 128
              })
            )

            .setFooter({
              text:
                "KRX • Zyro Economy"
            })

            .setTimestamp();


        return message.reply({
          embeds: [embed]
        });
      }


      // ====================================
      // OWNER: ADD ZYRO
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


        const newBalance =
          addBalance(
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
      // OWNER: REMOVE ZYRO
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


        const newBalance =
          removeBalance(
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
      // OWNER: SET ZYRO
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

    }
  );
        // ====================================
      // OWNER: RESET ZYRO
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
      // default: ztop
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


        if (!top.length) {

          return message.reply(
            `❌ لا توجد أرصدة ${settings.currencyName} حتى الآن.`
          );
        }


        const description =
          top

            .map(
              ([userId, balance], index) => {

                let medal =
                  `#${index + 1}`;


                if (index === 0) {
                  medal = "🥇";
                }

                if (index === 1) {
                  medal = "🥈";
                }

                if (index === 2) {
                  medal = "🥉";
                }


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

            .setDescription(
              description
            )

            .setFooter({
              text:
                "KRX • Zyro Leaderboard"
            })

            .setTimestamp();


        return message.reply({
          embeds: [embed]
        });
      }


      // ====================================
      // TRANSFER ZYRO
      // default:
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


        // لازم يحدد عضو
        if (!target) {

          return message.reply(
            `❌ الاستخدام: \`${settings.transferCommand} @user 500\``
          );
        }


        // ممنوع التحويل لبوت
        if (target.user.bot) {

          return message.reply(
            "❌ لا يمكنك تحويل الرصيد إلى بوت."
          );
        }


        // ممنوع التحويل لنفسك
        if (
          target.id ===
          message.author.id
        ) {

          return message.reply(
            "❌ لا يمكنك تحويل الرصيد لنفسك."
          );
        }


        // تحقق من الرقم
        if (
          !Number.isSafeInteger(amount) ||
          amount <= 0
        ) {

          return message.reply(
            "❌ اكتب مبلغ صحيح أكبر من 0."
          );
        }


        const currentBalance =
          getBalance(
            message.guild.id,
            message.author.id
          );


        // تحقق من الرصيد
        if (
          currentBalance <
          amount
        ) {

          return message.reply({

            embeds: [

              new EmbedBuilder()

                .setColor("#ED4245")

                .setTitle(
                  "❌ رصيد غير كافي"
                )

                .setDescription(
`المبلغ المطلوب:
**${money(
  amount,
  settings
)}**

رصيدك:
**${money(
  currentBalance,
  settings
)}**

ينقصك:
**${money(
  amount - currentBalance,
  settings
)}**`
                )

            ]

          });
        }


        // عملية معلقة بالفعل
        if (
          pendingTransfers.has(
            message.author.id
          )
        ) {

          return message.reply(
            "❌ لديك عملية تحويل معلقة بالفعل. أكملها أو انتظر انتهاءها."
          );
        }


        const transactionId =
          `${message.author.id}-${Date.now()}`;


        pendingTransfers.set(
          message.author.id,
          {

            id:
              transactionId,

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
              "confirm",

            createdAt:
              Date.now()

          }
        );


        const confirmRow =
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

                .setLabel(
                  "إلغاء"
                )

                .setEmoji("❌")

                .setStyle(
                  ButtonStyle.Danger
                )

            );


        const confirmEmbed =
          new EmbedBuilder()

            .setColor("#5865F2")

            .setTitle(
              "💠 تأكيد تحويل Zyro"
            )

            .setDescription(
`هل تريد تأكيد عملية التحويل؟

👤 **إلى:**
${target}

💸 **المبلغ:**
${money(
  amount,
  settings
)}

💰 **رصيدك الحالي:**
${money(
  currentBalance,
  settings
)}

💳 **رصيدك بعد التحويل:**
${money(
  currentBalance - amount,
  settings
)}

اضغط **تأكيد التحويل** للمتابعة.`
            )

            .setFooter({
              text:
                "لن يتم خصم أي رصيد قبل التحقق"
            })

            .setTimestamp();


        await message.reply({

          embeds: [
            confirmEmbed
          ],

          components: [
            confirmRow
          ]

        });


        // انتهاء التأكيد بعد دقيقتين
        setTimeout(
          () => {

            const pending =
              pendingTransfers.get(
                message.author.id
              );


            if (
              pending &&
              pending.id ===
              transactionId
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
            .split(":")[1];


        const pending =
          pendingTransfers.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !==
          transactionId
        ) {

          return interaction.reply({

            content:
              "❌ هذه العملية انتهت أو ليست خاصة بك.",

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

              .setColor("#ED4245")

              .setTitle(
                "❌ تم إلغاء التحويل"
              )

              .setDescription(
                "لم يتم خصم أي رصيد من حسابك."
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
            .split(":")[1];


        const pending =
          pendingTransfers.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !==
          transactionId
        ) {

          return interaction.reply({

            content:
              "❌ هذه العملية انتهت أو ليست خاصة بك.",

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
              "❌ تم تأكيد هذه العملية بالفعل.",

            ephemeral:
              true

          });
        }


        // فحص الرصيد مرة أخرى
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

                .setColor("#ED4245")

                .setTitle(
                  "❌ تم إلغاء التحويل"
                )

                .setDescription(
                  "رصيدك لم يعد كافيًا لإتمام العملية."
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

        pending.expiresAt =
          Date.now() + 60000;


        pendingTransfers.set(
          interaction.user.id,
          pending
        );


        const image =
          createCodeImage(
            code
          );


        await interaction.update({

          embeds: [

            new EmbedBuilder()

              .setColor("#FEE75C")

              .setTitle(
                "🔐 التحقق من التحويل"
              )

              .setDescription(
`اكتب **الأرقام الأربعة الموجودة في الصورة** في هذه القناة.

⏱️ لديك **60 ثانية**.

⚠️ لا ترسل الأرقام لأي شخص.
لن يتم خصم الرصيد إلا بعد إدخال الكود الصحيح.`
              )

              .setImage(
                "attachment://zyro-code.svg"
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


        // ==================================
        // WAIT FOR CAPTCHA MESSAGE
        // ==================================

        const filter =
          msg =>
            msg.author.id ===
              interaction.user.id
            &&
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
            collected.first()
              ?.content
              ?.trim();


          const currentPending =
            pendingTransfers.get(
              interaction.user.id
            );


          if (
            !currentPending ||
            currentPending.id !==
            transactionId
          ) {

            return;
          }


          // الكود غلط
          if (
            answer !==
            currentPending.code
          ) {

            pendingTransfers.delete(
              interaction.user.id
            );


            return interaction.channel.send({

              embeds: [

                new EmbedBuilder()

                  .setColor("#ED4245")

                  .setTitle(
                    "❌ كود غير صحيح"
                  )

                  .setDescription(
`تم إلغاء عملية التحويل.

💠 **لم يتم خصم أي Zyro من حسابك.**`
                  )

              ]

            });
          }


          // ==================================
          // FINAL BALANCE CHECK
          // ==================================

          const finalSenderBalance =
            getBalance(
              interaction.guild.id,
              interaction.user.id
            );


          if (
            finalSenderBalance <
            currentPending.amount
          ) {

            pendingTransfers.delete(
              interaction.user.id
            );


            return interaction.channel.send(
              "❌ تم إلغاء العملية لأن رصيدك لم يعد كافيًا."
            );
          }


          // ==================================
          // EXECUTE TRANSFER
          // ==================================

          const receiverBalance =
            getBalance(
              interaction.guild.id,
              currentPending.targetId
            );


          setBalance(
            interaction.guild.id,
            interaction.user.id,
            finalSenderBalance -
              currentPending.amount
          );


          setBalance(
            interaction.guild.id,
            currentPending.targetId,
            receiverBalance +
              currentPending.amount
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


          const successEmbed =
            new EmbedBuilder()

              .setColor("#57F287")

              .setTitle(
                "✅ تم تحويل Zyro"
              )

              .setDescription(
`${interaction.user} قام بتحويل:

**${money(
  currentPending.amount,
  settings
)}**

إلى:
<@${currentPending.targetId}>

💰 رصيد المرسل الآن:
**${money(
  newSenderBalance,
  settings
)}**`
              )

              .setFooter({
                text:
                  "KRX • Zyro Transfer"
              })

              .setTimestamp();


          await interaction.channel.send({

            embeds: [
              successEmbed
            ]

          });


          // رسالة خاصة للمستلم
          const receiver =
            await interaction.guild.members
              .fetch(
                currentPending.targetId
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

                  .setColor("#57F287")

                  .setTitle(
                    "💠 استلمت Zyro!"
                  )

                  .setDescription(
`${interaction.user} أرسل لك:

**${money(
  currentPending.amount,
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

          const currentPending =
            pendingTransfers.get(
              interaction.user.id
            );


          if (
            currentPending &&
            currentPending.id ===
            transactionId
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
                    "⌛ انتهى وقت التحقق"
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

      const content =
        message.content.trim();

      const guildShop =
        Array.isArray(
          zyroShop[message.guild.id]
        )
          ? zyroShop[message.guild.id]
          : [];


      // ====================================
      // SHOW ZYRO SHOP
      // default: !zshop
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
                  "❌ لا توجد منتجات في المتجر حالياً."
                )
            ]
          });
        }


        const description =
          guildShop
            .map(
              (item, index) => {

                return (
`**${index + 1}. ${item.emoji || "🛒"} ${item.name}**

${item.description || "بدون وصف"}

💠 السعر:
**${money(
  item.price,
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


        return message.reply({
          embeds: [

            new EmbedBuilder()

              .setColor("#5865F2")

              .setTitle(
                `🛒 ${settings.currencyName} Shop`
              )

              .setDescription(
`${description}

━━━━━━━━━━━━━━

💰 رصيدك:
**${money(
  balance,
  settings
)}**`
              )

              .setFooter({
                text:
                  `للشراء استخدم ${settings.buyCommand} رقم المنتج`
              })

              .setTimestamp()

          ]
        });
      }


      // ====================================
      // BUY PRODUCT
      // !zbuy 1
      // ====================================

      const lowerContent =
        content.toLowerCase();

      const buyPrefix =
        settings.buyCommand.toLowerCase();


      if (
        lowerContent === buyPrefix ||
        lowerContent.startsWith(
          buyPrefix + " "
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
          guildShop[
            productIndex
          ];


        if (
          !Number.isInteger(
            productNumber
          ) ||
          !product
        ) {

          return message.reply(
            `❌ استخدم: \`${settings.buyCommand} رقم المنتج\`\nمثال: \`${settings.buyCommand} 1\``
          );
        }


        const price =
          Number(
            product.price
          );


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
                  "❌ رصيدك غير كافي"
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

ينقصك:
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
            id:
              purchaseId,

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
                : null,

            stage:
              "confirm",

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

                .setLabel(
                  "إلغاء"
                )

                .setEmoji("❌")

                .setStyle(
                  ButtonStyle.Danger
                )

            );


        await message.reply({
          embeds: [

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

💳 **بعد الشراء:**
${money(
  balance - price,
  settings
)}

اضغط **تأكيد الشراء** للمتابعة.`
              )

              .setFooter({
                text:
                  "لن يتم الخصم قبل التحقق"
              })

              .setTimestamp()

          ],

          components: [
            row
          ]
        });


        setTimeout(
          () => {

            const pending =
              pendingPurchases.get(
                message.author.id
              );


            if (
              pending &&
              pending.id ===
              purchaseId
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
          interaction.customId
            .split(":")[1];


        const pending =
          pendingPurchases.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !==
          purchaseId
        ) {

          return interaction.reply({
            content:
              "❌ هذه العملية انتهت أو ليست خاصة بك.",

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
          interaction.customId
            .split(":")[1];


        const pending =
          pendingPurchases.get(
            interaction.user.id
          );


        if (
          !pending ||
          pending.id !==
          purchaseId
        ) {

          return interaction.reply({
            content:
              "❌ هذه العملية انتهت أو ليست خاصة بك.",

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


        // فحص الرصيد قبل الكابتشا
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


        const code =
          createCode();


        pending.code =
          code;

        pending.stage =
          "captcha";

        pending.expiresAt =
          Date.now() + 60000;


        pendingPurchases.set(
          interaction.user.id,
          pending
        );


        const image =
          createCodeImage(
            code
          );


        await interaction.update({
          embeds: [

            new EmbedBuilder()

              .setColor("#FEE75C")

              .setTitle(
                "🔐 تأكيد عملية الشراء"
              )

              .setDescription(
`اكتب **الأرقام الأربعة الموجودة في الصورة**.

⏱️ لديك **60 ثانية**.

إذا كتبت الرقم الصحيح سيتم خصم الرصيد وإعطاؤك المنتج.

إذا كان الرقم خطأ أو انتهى الوقت، لن يتم خصم أي شيء.`
              )

              .setImage(
                "attachment://zyro-code.svg"
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
          msg =>
            msg.author.id ===
              interaction.user.id
            &&
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
            current.id !==
            purchaseId
          ) {
            return;
          }


          // ==================================
          // WRONG CODE
          // ==================================

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

                  .setColor("#ED4245")

                  .setTitle(
                    "❌ كود غير صحيح"
                  )

                  .setDescription(
                    "تم إلغاء الشراء ولم يتم خصم أي Zyro."
                  )

              ]
            });
          }


          // ==================================
          // FINAL PRODUCT CHECK
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


          if (
            !product ||
            String(product.name) !==
              current.productName ||
            Number(product.price) !==
              current.price
          ) {

            pendingPurchases.delete(
              interaction.user.id
            );


            return interaction.channel.send(
              "❌ تم تغيير المنتج أثناء عملية الشراء. تم إلغاء العملية بدون خصم."
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
          // ROLE CHECK BEFORE CHARGING
          // ==================================

          let role = null;


          if (
            current.roleId
          ) {

            role =
              interaction.guild.roles.cache.get(
                current.roleId
              );


            if (!role) {

              pendingPurchases.delete(
                interaction.user.id
              );


              return interaction.channel.send(
                "❌ الرتبة المرتبطة بالمنتج غير موجودة. لم يتم الخصم."
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
                "❌ البوت لا يستطيع إعطاء هذه الرتبة. ارفع رتبة البوت فوق رتبة المنتج. لم يتم الخصم."
              );
            }

          }


          // ==================================
          // GIVE ROLE FIRST
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
                "❌ فشل إعطاء المنتج، لذلك لم يتم خصم الرصيد."
              );
            }

          }


          // ==================================
          // CHARGE USER
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


          const settings =
            getZyroGuild(
              interaction.guild.id
            ).settings;


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
`🎉 تم شراء:

**${product.emoji || "🛒"} ${product.name}**

💠 تم خصم:
**${money(
  current.price,
  settings
)}**

💰 رصيدك الآن:
**${money(
  newBalance,
  settings
)}**

${role
  ? `🎁 حصلت على الرتبة: ${role}`
  : "🎁 تم تسجيل عملية الشراء."}`
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
            current.id ===
              purchaseId
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
// EXPORT
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
