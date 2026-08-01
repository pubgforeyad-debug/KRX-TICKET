const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const path = require("path");
const BOT_OWNER_ID = process.env.BOT_OWNER_ID;

const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

module.exports = function startDashboard(ctx) {

  const {
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
  } = ctx;

  const app = express();

  const PORT =
    process.env.PORT || 3000;


  // ==========================================
  // DISCORD OAUTH
  // ==========================================

  const CLIENT_ID =
    process.env.DISCORD_CLIENT_ID ||
    "1531918719402377226";

  const CLIENT_SECRET =
    process.env.DISCORD_CLIENT_SECRET;

  const PUBLIC_URL =
    (process.env.PUBLIC_URL || "")
      .replace(/\/+$/, "");

  const CALLBACK_URL =
    `${PUBLIC_URL}/auth/discord/callback`;


  const BOT_INVITE =
    "https://discord.com/oauth2/authorize?client_id=1531918719402377226&permissions=8&integration_type=0&scope=bot";

  const SUPPORT_INVITE =
    "https://discord.gg/NpkKW7YTz";


  // ==========================================
  // EXPRESS SETTINGS
  // ==========================================

  app.set(
    "trust proxy",
    1
  );


  app.use(
    express.urlencoded({
      extended: false
    })
  );


  app.use(
    express.json()
  );


  app.use(
    session({

      secret:
        process.env.SESSION_SECRET ||
        "KRX_CHANGE_THIS_SECRET",

      resave: false,

      saveUninitialized: false,

      cookie: {

        httpOnly: true,

        sameSite: "lax",

        secure:
          process.env.NODE_ENV ===
          "production",

        maxAge:
          1000 *
          60 *
          60 *
          24

      }

    })
  );


  app.use(
    express.static(
      path.join(
        __dirname,
        "public"
      )
    )
  );


  // ==========================================
  // SECURITY / HELPERS
  // ==========================================

  function esc(value = "") {

    return String(value)

      .replaceAll(
        "&",
        "&amp;"
      )

      .replaceAll(
        "<",
        "&lt;"
      )

      .replaceAll(
        ">",
        "&gt;"
      )

      .replaceAll(
        '"',
        "&quot;"
      )

      .replaceAll(
        "'",
        "&#039;"
      );

  }


  function canManage(guild) {

    if (guild.owner) {
      return true;
    }


    try {

      const permissions =
        BigInt(
          guild.permissions || "0"
        );


      const ADMINISTRATOR =
        1n << 3n;


      const MANAGE_GUILD =
        1n << 5n;


      return (

        (
          permissions &
          ADMINISTRATOR
        ) ===
        ADMINISTRATOR

        ||

        (
          permissions &
          MANAGE_GUILD
        ) ===
        MANAGE_GUILD

      );


    } catch {

      return false;

    }

  }


  async function discordGet(
    route,
    token
  ) {

    const response =
      await fetch(

        `https://discord.com/api/v10${route}`,

        {

          headers: {

            Authorization:
              `Bearer ${token}`

          }

        }

      );


    if (!response.ok) {

      throw new Error(
        `Discord API ${response.status}`
      );

    }


    return response.json();

  }


  function requireLogin(
    req,
    res,
    next
  ) {

    if (
      !req.session.user ||
      !req.session.accessToken
    ) {

      return res.redirect(
        "/auth/discord"
      );

    }


    next();

  }
  function requireBotOwner(
  req,
  res,
  next
) {

  if (
    !BOT_OWNER_ID
  ) {

    return res
      .status(500)
      .send(
        "❌ BOT_OWNER_ID غير موجود في Railway Variables."
      );

  }


  if (
    !req.session?.user ||
    String(req.session.user.id) !==
      String(BOT_OWNER_ID)
  ) {

    return res
      .status(403)
      .send(
        "❌ التعديل متاح لصاحب البوت فقط."
      );

  }


  return next();

}


  async function getAllowedGuilds(
    req
  ) {

    const guilds =
      await discordGet(

        "/users/@me/guilds",

        req.session.accessToken

      );


    return guilds.filter(

      guild =>

        canManage(guild)

        &&

        client.guilds.cache.has(
          guild.id
        )

    );

  }


  async function ensureAllowedGuild(
    req,
    res
  ) {

    const allowed =
      await getAllowedGuilds(
        req
      );


    const found =
      allowed.find(

        guild =>
          guild.id ===
          req.params.guildId

      );


    if (!found) {

      res
        .status(403)
        .send(
          "❌ لا يمكنك التحكم في هذا السيرفر."
        );


      return null;

    }


    return client.guilds.cache.get(
      req.params.guildId
    );

  }


  // ==========================================
  // ROLE OPTIONS
  // ==========================================

  function roleOptions(
    roles,
    selected = []
  ) {

    return roles

      .map(
        role =>

`<option
value="${role.id}"
${selected.includes(role.id)
  ? "selected"
  : ""}
>
${esc(role.name)}
</option>`

      )

      .join("");

  }


  // ==========================================
  // CHANNEL OPTIONS
  // ==========================================

  function channelOptions(
    channels,
    selected = ""
  ) {

    return channels

      .map(
        channel =>

`<option
value="${channel.id}"
${selected === channel.id
  ? "selected"
  : ""}
>
${esc(channel.name)}
</option>`

      )

      .join("");

  }


  // ==========================================
  // DASHBOARD LAYOUT
  // ==========================================

  function layout({

    user,
    guild,
    active,
    content

  }) {


    const avatar =
      user.avatar

        ?

`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`

        :

"https://cdn.discordapp.com/embed/avatars/0.png";

const nav = [

  [
    "home",
    "🏠",
    "الرئيسية",
    `/dashboard/${guild.id}`
  ],

  [
    "staff",
    "👮",
    "الرتب",
    `/dashboard/${guild.id}/staff`
  ],

  [
    "tickets",
    "🎫",
    "التذاكر",
    `/dashboard/${guild.id}/tickets`
  ],

  [
    "panels",
    "🧩",
    "البانلات",
    `/dashboard/${guild.id}/panels`
  ],

  [
    "shop",
    "🛒",
    "الشوب",
    `/dashboard/${guild.id}/shop`
  ],

  [
    "zyro",
    "💠",
    "متجر Zyro",
    `/dashboard/${guild.id}/zyro`
  ],

  [
    "points",
    "⭐",
    "النقاط",
    `/dashboard/${guild.id}/points`
  ],

  [
    "messages",
    "📨",
    "الرسائل",
    `/dashboard/${guild.id}/messages`
  ],

  [
    "settings",
    "⚙️",
    "الإعدادات",
    `/dashboard/${guild.id}/settings`
  ]

];
    
    return `
<!DOCTYPE html>

<html
lang="ar"
dir="rtl"
>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1"
>

<meta
name="theme-color"
content="#5865F2"
>

<title>
KRX Dashboard
</title>

<link
rel="stylesheet"
href="/style.css"
>

</head>


<body class="dashboard-body">


<div
class="bg-orb orb-1"
></div>


<div
class="bg-orb orb-2"
></div>


<header class="topbar">


<a
class="brand"
href="/"
>

<span class="logo">
K
</span>


<span>

<b>
KRX Bot
</b>

<small>
Advanced Dashboard
</small>

</span>

</a>


<div class="top-actions">


<div class="server-mini">

<b>
${esc(guild.name)}
</b>

<span>
● Online
</span>

</div>


<div class="user-box">

<img
src="${avatar}"
alt="avatar"
>


<span>
${esc(
  user.global_name ||
  user.username
)}
</span>


<a
href="/logout"
class="small-btn"
>

خروج

</a>


</div>


</div>


</header>


<div class="dashboard-shell">


<aside class="sidebar">


<div class="sidebar-title">

KRX CONTROL

</div>


${nav

.map(

  ([id, icon, label, href]) =>

`<a
href="${href}"
class="${active === id
  ? "active"
  : ""}"
>

<span>
${icon}
</span>

<b>
${label}
</b>

</a>`

)

.join("")}


<div class="sidebar-bottom">


<a
href="${BOT_INVITE}"
target="_blank"
>

➕ إضافة البوت

</a>


<a
href="${SUPPORT_INVITE}"
target="_blank"
>

💬 سيرفر الدعم

</a>


</div>


</aside>


<main class="dash-main">

${content}

</main>


</div>


<script
src="/dashboard.js"
></script>


</body>

</html>
`;

  }


  // ==========================================
  // PAGE HEADER
  // ==========================================

  function pageHeader(
    title,
    desc,
    badge = "KRX DASHBOARD"
  ) {

    return `

<div class="page-head reveal">

<div>

<span class="eyebrow">
${esc(badge)}
</span>

<h1>
${esc(title)}
</h1>

<p>
${esc(desc)}
</p>

</div>

</div>

`;

  }


  // ==========================================
  // DISCORD LOGIN
  // ==========================================

  app.get(
    "/auth/discord",

    (req, res) => {


      if (
        !CLIENT_SECRET ||
        !PUBLIC_URL
      ) {

        return res
          .status(500)
          .send(
            "OAuth غير مضبوط في Railway."
          );

      }


      const state =
        crypto
          .randomBytes(24)
          .toString("hex");


      req.session.oauthState =
        state;


      const params =
        new URLSearchParams({

          client_id:
            CLIENT_ID,

          redirect_uri:
            CALLBACK_URL,

          response_type:
            "code",

          scope:
            "identify guilds",

          state

        });


      res.redirect(

        `https://discord.com/oauth2/authorize?${params.toString()}`

      );

    }

  );


  // ==========================================
  // DISCORD CALLBACK
  // ==========================================

  app.get(
    "/auth/discord/callback",

    async (req, res) => {


      try {


        if (
          !req.query.code ||
          !req.query.state ||
          req.query.state !==
          req.session.oauthState
        ) {

          return res
            .status(400)
            .send(
              "❌ OAuth State غير صحيح."
            );

        }


        delete req.session.oauthState;


        const body =
          new URLSearchParams({

            client_id:
              CLIENT_ID,

            client_secret:
              CLIENT_SECRET,

            grant_type:
              "authorization_code",

            code:
              req.query.code,

            redirect_uri:
              CALLBACK_URL

          });


        const tokenResponse =
          await fetch(

            "https://discord.com/api/v10/oauth2/token",

            {

              method:
                "POST",

              headers: {

                "Content-Type":
                  "application/x-www-form-urlencoded"

              },

              body

            }

          );


        if (!tokenResponse.ok) {

          console.error(
            await tokenResponse.text()
          );


          return res
            .status(500)
            .send(
              "❌ فشل تسجيل الدخول بديسكورد."
            );

        }


        const token =
          await tokenResponse.json();


        const user =
          await discordGet(

            "/users/@me",

            token.access_token

          );


        req.session.accessToken =
          token.access_token;


        req.session.user =
          user;


        res.redirect(
          "/dashboard"
        );


      } catch (error) {


        console.error(
          "OAuth ERROR:",
          error
        );


        res
          .status(500)
          .send(
            "❌ حصل خطأ أثناء تسجيل الدخول."
          );

      }

    }

  );
  // ==========================================
// DASHBOARD SERVER PICKER
// ==========================================

app.get(
  "/dashboard",

  requireLogin,

  async (req, res) => {

    try {

      const guilds =
        await getAllowedGuilds(req);


      if (!guilds.length) {

        return res.send(
`<!DOCTYPE html>

<html
lang="ar"
dir="rtl"
>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1"
>

<link
rel="stylesheet"
href="/style.css"
>

<title>
KRX Dashboard
</title>

</head>


<body class="dashboard-body">


<div class="center-page">


<div class="empty-card">


<h1>
❌ لا يوجد سيرفر متاح
</h1>


<p>

لازم البوت يكون داخل السيرفر،
وحسابك يكون Owner أو عنده
Manage Server أو Administrator.

</p>


<a
class="primary-btn"
href="${BOT_INVITE}"
>

➕ إضافة البوت

</a>


</div>


</div>


</body>

</html>`
        );

      }


      if (
        guilds.length === 1
      ) {

        return res.redirect(
          `/dashboard/${guilds[0].id}`
        );

      }


      const cards =
        guilds

          .map(
            guild => {


              const icon =
                guild.icon

                  ?

`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`

                  :

"";


              return `

<a
class="server-card"
href="/dashboard/${guild.id}"
>

${
  icon

    ?

`<img
src="${icon}"
alt="server icon"
>`

    :

`<div class="server-fallback">
${esc(
  guild.name.slice(
    0,
    1
  )
)}
</div>`
}


<div>

<b>
${esc(guild.name)}
</b>

<span>
فتح لوحة التحكم
</span>

</div>


</a>

`;

            }
          )

          .join("");


      return res.send(
`<!DOCTYPE html>

<html
lang="ar"
dir="rtl"
>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1"
>

<link
rel="stylesheet"
href="/style.css"
>

<title>
اختيار السيرفر
</title>

</head>


<body class="dashboard-body">


<div class="center-page">


<div class="server-picker">


<span class="eyebrow">

KRX DASHBOARD

</span>


<h1>

اختر السيرفر

</h1>


<p>

اختر السيرفر الذي تريد التحكم فيه.

</p>


<div class="server-list">

${cards}

</div>


</div>


</div>


</body>

</html>`
      );


    } catch (error) {


      console.error(
        "DASHBOARD PICKER ERROR:",
        error
      );


      return res
        .status(500)
        .send(
          "❌ حصل خطأ أثناء تحميل السيرفرات."
        );

    }

  }

);


// ==========================================
// DASHBOARD HOME
// ==========================================

app.get(
  "/dashboard/:guildId",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const cfg =
      getGuildConfig(
        guild.id
      );


    const guildShop =
      getGuildShop(
        guild.id
      );


    const guildPoints =
      getGuildPoints(
        guild.id
      );


    const totalPoints =
      Object.values(
        guildPoints
      )

        .reduce(
          (total, value) =>
            total +
            Number(
              value || 0
            ),
          0
        );


    const content = `

${pageHeader(

  `أهلاً بك في ${guild.name}`,

  "تحكم في البوت والتذاكر والشوب والنقاط والرسائل من مكان واحد."

)}


<section class="stat-grid reveal">


<div class="stat-card">

<span>
🎫
</span>

<div>

<b>
${cfg.panels.length}
</b>

<small>
بانلات
</small>

</div>

</div>


<div class="stat-card">

<span>
👮
</span>

<div>

<b>
${
  cfg.staffRoles.length +
  cfg.highRoles.length
}
</b>

<small>
رتب إدارة
</small>

</div>

</div>


<div class="stat-card">

<span>
🛒
</span>

<div>

<b>
${guildShop.length}
</b>

<small>
منتجات
</small>

</div>

</div>


<div class="stat-card">

<span>
⭐
</span>

<div>

<b>
${totalPoints}
</b>

<small>
إجمالي النقاط
</small>

</div>

</div>


</section>


<section class="panel-card reveal">


<div class="card-title">

<div>

<span class="eyebrow">

QUICK ACTIONS

</span>

<h2>

اختصارات سريعة

</h2>

</div>

</div>


<div class="quick-grid">


<a
href="/dashboard/${guild.id}/panels"
>

🧩 إنشاء بانل جديد

</a>


<a
href="/dashboard/${guild.id}/staff"
>

👮 إضافة رتب إدارة

</a>


<a
href="/dashboard/${guild.id}/shop"
>

🛒 تعديل الشوب

</a>


<a
href="/dashboard/${guild.id}/points"
>

⭐ تعديل النقاط

</a>


<a
href="/dashboard/${guild.id}/messages"
>

📨 إرسال رسالة

</a>


<a
href="/dashboard/${guild.id}/tickets"
>

🎫 إعداد التذاكر

</a>


</div>


</section>

`;


    return res.send(
      layout({

        user:
          req.session.user,

        guild,

        active:
          "home",

        content

      })
    );

  }

);


// ==========================================
// STAFF ROLES PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/staff",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    await guild.roles.fetch();


    const cfg =
      getGuildConfig(
        guild.id
      );


    const roles =
      [
        ...guild.roles.cache.values()
      ]

        .filter(
          role =>

            role.id !==
            guild.id

            &&

            !role.managed
        )

        .sort(
          (a, b) =>
            b.position -
            a.position
        );


    const content = `

${pageHeader(

  "رتب الإدارة",

  "تقدر تختار أكثر من رتبة Staff وأكثر من رتبة إدارة عليا.",

  "MULTI ROLES"

)}


<form

method="POST"

action="/dashboard/${guild.id}/staff/save"

class="panel-card form-card reveal"

>


<div class="field">


<label>

👮 Staff Roles

</label>


<p>

اختر كل رتب الاستف التي تريدها.

</p>


<select

name="staffRoles"

multiple

size="10"

>


${roleOptions(
  roles,
  cfg.staffRoles
)}


</select>


</div>



<div class="field">


<label>

👑 High Staff Roles

</label>


<p>

اختر رتب الإدارة العليا.

</p>


<select

name="highRoles"

multiple

size="10"

>


${roleOptions(
  roles,
  cfg.highRoles
)}


</select>


</div>



<button

class="primary-btn full"

type="submit"

>

💾 حفظ الرتب

</button>


</form>

`;


    return res.send(
      layout({

        user:
          req.session.user,

        guild,

        active:
          "staff",

        content

      })
    );

  }

);


// ==========================================
// SAVE STAFF ROLES
// ==========================================

app.post(
  "/dashboard/:guildId/staff/save",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const cfg =
      getGuildConfig(
        guild.id
      );


    function normalize(value) {

      if (
        Array.isArray(value)
      ) {

        return value;

      }


      if (value) {

        return [
          value
        ];

      }


      return [];

    }


    cfg.staffRoles =

      normalize(
        req.body.staffRoles
      )

        .filter(
          roleId =>
            guild.roles.cache.has(
              roleId
            )
        );


    cfg.highRoles =

      normalize(
        req.body.highRoles
      )

        .filter(
          roleId =>
            guild.roles.cache.has(
              roleId
            )
        );


    saveConfig();


    return res.redirect(

      `/dashboard/${guild.id}/staff?saved=1`

    );

  }

);


// ==========================================
// TICKET SETTINGS PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/tickets",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    await guild.channels.fetch();


    const cfg =
      getGuildConfig(
        guild.id
      );


    const categories =
      [
        ...guild.channels.cache.values()
      ]

        .filter(
          channel =>
            channel.type ===
            ChannelType.GuildCategory
        );


    const textChannels =
      [
        ...guild.channels.cache.values()
      ]

        .filter(
          channel =>
            channel.type ===
            ChannelType.GuildText
        );


    const content = `

${pageHeader(

  "إعدادات التذاكر",

  "حدد الكاتيجوري وروم التقييم ورسالة التذكرة وعدد النقاط عند الاستلام.",

  "TICKET SETTINGS"

)}


<form

method="POST"

action="/dashboard/${guild.id}/tickets/save"

class="panel-card form-card reveal"

>


<div class="two-col">


<div class="field">


<label>

🎫 Ticket Category

</label>


<select

name="ticketCategory"

required

>


<option value="">

اختر كاتيجوري

</option>


${channelOptions(
  categories,
  cfg.ticketCategory
)}


</select>


</div>



<div class="field">


<label>

⭐ Rating Channel

</label>


<select

name="ratingChannel"

>


<option value="">

بدون روم تقييم

</option>


${channelOptions(
  textChannels,
  cfg.ratingChannel
)}


</select>


</div>


</div>



<div class="field">


<label>

⭐ نقاط استلام التذكرة

</label>


<input

type="number"

name="claimPoints"

min="0"

max="1000"

value="${
  Number(
    cfg.claimPoints || 2
  )
}"

>


</div>



<div class="field">


<label>

💬 رسالة التذكرة الافتراضية

</label>


<textarea

name="ticketMessage"

rows="7"

>${
  esc(
    cfg.ticketMessage
  )
}</textarea>


<p>

استخدم

<code>
{user}
</code>

لمنشن العضو

و

<code>
{username}
</code>

لاسم المستخدم.

</p>


</div>



<button

class="primary-btn full"

type="submit"

>

💾 حفظ إعدادات التذاكر

</button>


</form>

`;


    return res.send(
      layout({

        user:
          req.session.user,

        guild,

        active:
          "tickets",

        content

      })
    );

  }

);


// ==========================================
// SAVE TICKET SETTINGS
// ==========================================

app.post(
  "/dashboard/:guildId/tickets/save",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const cfg =
      getGuildConfig(
        guild.id
      );


    const category =
      guild.channels.cache.get(
        req.body.ticketCategory
      );


    const rating =
      req.body.ratingChannel

        ?

        guild.channels.cache.get(
          req.body.ratingChannel
        )

        :

        null;


    if (
      !category ||
      category.type !==
      ChannelType.GuildCategory
    ) {

      return res
        .status(400)
        .send(
          "❌ الكاتيجوري غير صحيح."
        );

    }


    if (
      rating &&
      rating.type !==
      ChannelType.GuildText
    ) {

      return res
        .status(400)
        .send(
          "❌ روم التقييم غير صحيح."
        );

    }


    cfg.ticketCategory =
      category.id;


    cfg.ratingChannel =
      rating?.id || "";


    cfg.claimPoints =
      Math.max(

        0,

        Math.min(

          1000,

          Number(
            req.body.claimPoints || 2
          )

        )

      );


    cfg.ticketMessage =
      String(
        req.body.ticketMessage || ""
      )

        .slice(
          0,
          3500
        );


    saveConfig();


    return res.redirect(

      `/dashboard/${guild.id}/tickets?saved=1`

    );

  }

);


// ==========================================
// PANELS PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/panels",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const cfg =
      getGuildConfig(
        guild.id
      );


    const cards =

      cfg.panels.length

        ?

        cfg.panels

          .map(
            (panel, index) => `

<div class="item-card">


<div>


<span class="item-icon">

🧩

</span>


<div>


<b>

${esc(
  panel.title ||
  `Panel ${index + 1}`
)}

</b>


<small>

${
  panel.buttons?.length ||
  0
}

أزرار

</small>


</div>


</div>



<div class="item-actions">


<a

class="small-action"

href="/dashboard/${guild.id}/panels/${index}"

>

تعديل

</a>



<form

method="POST"

action="/dashboard/${guild.id}/panels/${index}/delete"

onsubmit="return confirm('حذف البانل؟')"

>


<button class="danger-action">

حذف

</button>


</form>


</div>


</div>

`
          )

          .join("")

        :

`<div class="empty-inline">
لا توجد بانلات حتى الآن.
</div>`;


    const content = `

${pageHeader(

  "Ticket Panels",

  "أنشئ بانلات متعددة وعدّل النص واللون والأزرار بدون تعديل الكود.",

  "PANEL BUILDER"

)}


<div class="page-actions reveal">


<a

class="primary-btn"

href="/dashboard/${guild.id}/panels/new"

>

➕ بانل جديد

</a>


</div>



<section class="panel-card reveal">


<div class="item-list">

${cards}

</div>


</section>



<section class="panel-card tip reveal">


<b>

💡 إرسال البانل

</b>


<p>

بعد إنشاء البانل اكتب في روم ديسكورد:

<code>
!panel 1
</code>

لإرسال أول بانل.

</p>


</section>

`;


    return res.send(
      layout({

        user:
          req.session.user,

        guild,

        active:
          "panels",

        content

      })
    );

  }

);
  // ==========================================
// PANEL EDITOR
// ==========================================

function panelEditor(
  guild,
  cfg,
  index,
  panel
) {

  const roles =
    [
      ...guild.roles.cache.values()
    ]

      .filter(
        role =>
          role.id !== guild.id &&
          !role.managed
      )

      .sort(
        (a, b) =>
          b.position -
          a.position
      );


  const categories =
    [
      ...guild.channels.cache.values()
    ]

      .filter(
        channel =>
          channel.type ===
          ChannelType.GuildCategory
      );


  const buttons =
    panel.buttons || [];


  const buttonEditors =

    buttons

      .map(
        (button, i) => `

<div class="button-editor">


<div class="button-editor-head">


<b>

زر ${i + 1}

</b>


<label class="remove-check">

<input

type="checkbox"

name="deleteButton_${i}"

value="1"

>

حذف الزر

</label>


</div>



<div class="three-col">


<div class="field">


<label>

اسم الزر

</label>


<input

name="buttonLabel_${i}"

value="${esc(
  button.label || ""
)}"

>


</div>



<div class="field">


<label>

الإيموجي

</label>


<input

name="buttonEmoji_${i}"

value="${esc(
  button.emoji || "🎫"
)}"

>


</div>



<div class="field">


<label>

لون الزر

</label>


<select

name="buttonStyle_${i}"

>


${[
  "Primary",
  "Secondary",
  "Success",
  "Danger"
]

.map(
  style =>

`<option
${button.style === style
  ? "selected"
  : ""}
>
${style}
</option>`
)

.join("")}


</select>


</div>


</div>



<div class="two-col">


<div class="field">


<label>

كاتيجوري هذا الزر

</label>


<select

name="buttonCategory_${i}"

>


<option value="">

استخدم الافتراضي

</option>


${channelOptions(
  categories,
  button.categoryId || ""
)}


</select>


</div>



<div class="field">


<label>

بداية اسم روم التذكرة

</label>


<input

name="buttonPrefix_${i}"

value="${esc(
  button.channelPrefix ||
  "ticket"
)}"

>


</div>


</div>



<div class="field">


<label>

الرتب التي يتم منشنها

</label>


<select

name="buttonRoles_${i}"

multiple

size="7"

>


${roleOptions(
  roles,
  button.mentionRoles || []
)}


</select>


</div>



<div class="field">


<label>

عنوان رسالة داخل التذكرة

</label>


<input

name="ticketTitle_${i}"

value="${esc(
  button.ticketTitle ||
  "🎫 تذكرة جديدة"
)}"

>


</div>



<div class="field">


<label>

رسالة داخل التذكرة

</label>


<textarea

name="ticketMessage_${i}"

rows="5"

>${
  esc(
    button.ticketMessage ||
    cfg.ticketMessage
  )
}</textarea>


</div>



<div class="field">


<label>

لون رسالة التذكرة

</label>


<input

type="color"

name="ticketColor_${i}"

value="${esc(
  button.ticketColor ||
  "#5865F2"
)}"

>


</div>


</div>

`
      )

      .join("");


  return `

${pageHeader(

  index === "new"
    ?
    "إنشاء بانل"
    :
    "تعديل البانل",

  "غيّر الرسالة واللون والصورة والأزرار كما تريد.",

  "PANEL EDITOR"

)}


<form

method="POST"

action="/dashboard/${guild.id}/panels/${index}/save"

class="panel-card form-card reveal"

>


<div class="two-col">


<div class="field">


<label>

عنوان البانل

</label>


<input

name="title"

value="${esc(
  panel.title ||
  "🎫 KRX Tickets"
)}"

required

>


</div>



<div class="field">


<label>

لون الـ Embed

</label>


<input

type="color"

name="color"

value="${esc(
  panel.color ||
  "#5865F2"
)}"

>


</div>


</div>



<div class="field">


<label>

وصف البانل

</label>


<textarea

name="description"

rows="6"

required

>${
  esc(
    panel.description ||
    "اختر نوع التذكرة من الأزرار بالأسفل."
  )
}</textarea>


</div>



<div class="two-col">


<div class="field">


<label>

رابط صورة كبيرة

</label>


<input

name="image"

placeholder="https://..."

value="${esc(
  panel.image || ""
)}"

>


</div>



<div class="field">


<label>

رابط Thumbnail

</label>


<input

name="thumbnail"

placeholder="https://..."

value="${esc(
  panel.thumbnail || ""
)}"

>


</div>


</div>



<hr class="soft-line">



<div class="section-mini-head">


<div>


<span class="eyebrow">

BUTTONS

</span>


<h2>

أزرار البانل

</h2>


</div>



<button

type="button"

class="ghost-btn"

onclick="addButtonEditor()"

>

➕ إضافة زر

</button>


</div>



<input

type="hidden"

name="buttonCount"

id="buttonCount"

value="${buttons.length}"

>



<div id="buttonsWrap">

${buttonEditors}

</div>



<button

class="primary-btn full"

type="submit"

>

💾 حفظ البانل

</button>


</form>



<template id="buttonTemplate">


<div class="button-editor">


<div class="button-editor-head">

<b>

زر جديد

</b>

</div>



<div class="three-col">


<div class="field">


<label>

اسم الزر

</label>


<input

data-name="buttonLabel"

value="فتح تذكرة"

>


</div>



<div class="field">


<label>

الإيموجي

</label>


<input

data-name="buttonEmoji"

value="🎫"

>


</div>



<div class="field">


<label>

لون الزر

</label>


<select data-name="buttonStyle">


<option>

Primary

</option>


<option>

Secondary

</option>


<option>

Success

</option>


<option>

Danger

</option>


</select>


</div>


</div>



<div class="two-col">


<div class="field">


<label>

كاتيجوري هذا الزر

</label>


<select

data-name="buttonCategory"

>


<option value="">

استخدم الافتراضي

</option>


${channelOptions(
  categories
)}


</select>


</div>



<div class="field">


<label>

بداية اسم الروم

</label>


<input

data-name="buttonPrefix"

value="ticket"

>


</div>


</div>



<div class="field">


<label>

الرتب التي يتم منشنها

</label>


<select

data-name="buttonRoles"

multiple

size="7"

>


${roleOptions(
  roles
)}


</select>


</div>



<div class="field">


<label>

عنوان رسالة داخل التذكرة

</label>


<input

data-name="ticketTitle"

value="🎫 تذكرة جديدة"

>


</div>



<div class="field">


<label>

رسالة داخل التذكرة

</label>


<textarea

data-name="ticketMessage"

rows="5"

>${
  esc(
    cfg.ticketMessage
  )
}</textarea>


</div>



<div class="field">


<label>

لون رسالة التذكرة

</label>


<input

type="color"

data-name="ticketColor"

value="#5865F2"

>


</div>


</div>


</template>

`;

}


// ==========================================
// NEW PANEL PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/panels/new",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    await guild.roles.fetch();

    await guild.channels.fetch();


    const cfg =
      getGuildConfig(
        guild.id
      );


    const panel = {

      title:
        "🎫 KRX Tickets",

      description:
        "اختر نوع التذكرة من الأزرار بالأسفل.",

      color:
        "#5865F2",

      image:
        "",

      thumbnail:
        "",

      buttons: [

        {

          label:
            "الدعم",

          emoji:
            "🛠️",

          style:
            "Primary",

          categoryId:
            "",

          channelPrefix:
            "support",

          mentionRoles:
            [],

          ticketTitle:
            "🎫 تذكرة دعم",

          ticketMessage:
            cfg.ticketMessage,

          ticketColor:
            "#5865F2"

        }

      ]

    };


    return res.send(
      layout({

        user:
          req.session.user,

        guild,

        active:
          "panels",

        content:
          panelEditor(
            guild,
            cfg,
            "new",
            panel
          )

      })
    );

  }

);


// ==========================================
// EDIT PANEL PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/panels/:index",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    await guild.roles.fetch();

    await guild.channels.fetch();


    const cfg =
      getGuildConfig(
        guild.id
      );


    const index =
      Number(
        req.params.index
      );


    const panel =
      cfg.panels[index];


    if (!panel) {

      return res
        .status(404)
        .send(
          "❌ البانل غير موجود."
        );

    }


    return res.send(
      layout({

        user:
          req.session.user,

        guild,

        active:
          "panels",

        content:
          panelEditor(
            guild,
            cfg,
            String(index),
            panel
          )

      })
    );

  }

);


// ==========================================
// SAVE PANEL
// ==========================================

app.post(
  "/dashboard/:guildId/panels/:index/save",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const cfg =
      getGuildConfig(
        guild.id
      );


    const existing =

      req.params.index ===
      "new"

        ?

        {
          buttons: []
        }

        :

        cfg.panels[
          Number(
            req.params.index
          )
        ];


    if (!existing) {

      return res
        .status(404)
        .send(
          "❌ البانل غير موجود."
        );

    }


    function normalize(value) {

      if (
        Array.isArray(value)
      ) {

        return value;

      }


      if (value) {

        return [
          value
        ];

      }


      return [];

    }


    const buttonCount =

      Math.min(

        5,

        Math.max(

          0,

          Number(
            req.body.buttonCount ||
            0
          )

        )

      );


    const buttons = [];


    for (
      let i = 0;
      i < buttonCount;
      i++
    ) {


      if (
        req.body[
          `deleteButton_${i}`
        ] === "1"
      ) {

        continue;

      }


      const label =
        String(
          req.body[
            `buttonLabel_${i}`
          ] || ""
        )

          .trim();


      if (!label) {
        continue;
      }


      const style =

        [
          "Primary",
          "Secondary",
          "Success",
          "Danger"
        ]

          .includes(
            req.body[
              `buttonStyle_${i}`
            ]
          )

          ?

          req.body[
            `buttonStyle_${i}`
          ]

          :

          "Primary";


      buttons.push({

        label:
          label.slice(
            0,
            80
          ),

        emoji:
          String(
            req.body[
              `buttonEmoji_${i}`
            ] || "🎫"
          )

            .slice(
              0,
              50
            ),

        style,

        categoryId:
          String(
            req.body[
              `buttonCategory_${i}`
            ] || ""
          ),

        channelPrefix:
          String(
            req.body[
              `buttonPrefix_${i}`
            ] || "ticket"
          )

            .slice(
              0,
              30
            ),

        mentionRoles:
          normalize(
            req.body[
              `buttonRoles_${i}`
            ]
          )

            .filter(
              roleId =>
                guild.roles.cache.has(
                  roleId
                )
            ),

        ticketTitle:
          String(
            req.body[
              `ticketTitle_${i}`
            ] ||
            "🎫 تذكرة جديدة"
          )

            .slice(
              0,
              256
            ),

        ticketMessage:
          String(
            req.body[
              `ticketMessage_${i}`
            ] ||
            cfg.ticketMessage
          )

            .slice(
              0,
              3500
            ),

        ticketColor:

          /^#[0-9A-Fa-f]{6}$/

            .test(
              req.body[
                `ticketColor_${i}`
              ] || ""
            )

            ?

            req.body[
              `ticketColor_${i}`
            ]

            :

            "#5865F2"

      });

    }


    const panel = {

      title:
        String(
          req.body.title ||
          "🎫 KRX Tickets"
        )

          .slice(
            0,
            256
          ),

      description:
        String(
          req.body.description ||
          ""
        )

          .slice(
            0,
            3500
          ),

      color:

        /^#[0-9A-Fa-f]{6}$/

          .test(
            req.body.color || ""
          )

          ?

          req.body.color

          :

          "#5865F2",

      image:
        String(
          req.body.image || ""
        )

          .slice(
            0,
            1000
          ),

      thumbnail:
        String(
          req.body.thumbnail || ""
        )

          .slice(
            0,
            1000
          ),

      buttons

    };


    if (
      req.params.index ===
      "new"
    ) {

      cfg.panels.push(
        panel
      );

    } else {

      cfg.panels[
        Number(
          req.params.index
        )
      ] = panel;

    }


    saveConfig();


    return res.redirect(

      `/dashboard/${guild.id}/panels`

    );

  }

);


// ==========================================
// DELETE PANEL
// ==========================================

app.post(
  "/dashboard/:guildId/panels/:index/delete",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const cfg =
      getGuildConfig(
        guild.id
      );


    const index =
      Number(
        req.params.index
      );


    if (
      cfg.panels[index]
    ) {

      cfg.panels.splice(
        index,
        1
      );


      saveConfig();

    }


    return res.redirect(

      `/dashboard/${guild.id}/panels`

    );

  }

);


// ==========================================
// SHOP PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/shop",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const guildShop =
      getGuildShop(
        guild.id
      );


    const items =

      guildShop.length

        ?

        guildShop

          .map(
            (item, index) => `

<div class="item-card">


<div>


<span class="item-icon">

🛒

</span>


<div>


<b>

${esc(
  item.name
)}

</b>


<small>

${Number(
  item.price
)}

نقطة

</small>


</div>


</div>



<div class="item-actions">


<form

method="POST"

action="/dashboard/${guild.id}/shop/${index}/delete"

>


<button class="danger-action">

حذف

</button>


</form>


</div>


</div>

`
          )

          .join("")

        :

`<div class="empty-inline">
الشوب فارغ.
</div>`;


    const content = `

${pageHeader(

  "متجر النقاط",

  "أضف واحذف المنتجات وحدد أسعارها من هنا.",

  "POINTS SHOP"

)}


<form

method="POST"

action="/dashboard/${guild.id}/shop/add"

class="panel-card compact-form reveal"

>


<div class="two-col">


<div class="field">


<label>

اسم المنتج

</label>


<input

name="name"

placeholder="VIP"

required

>


</div>



<div class="field">


<label>

السعر بالنقاط

</label>


<input

type="number"

name="price"

min="1"

max="999999999"

placeholder="100"

required

>


</div>


</div>



<button

class="primary-btn"

type="submit"

>

➕ إضافة المنتج

</button>


</form>



<section class="panel-card reveal">


<div class="item-list">

${items}

</div>


</section>

`;


    return res.send(
      layout({

        user:
          req.session.user,

        guild,

        active:
          "shop",

        content

      })
    );

  }

);


// ==========================================
// ADD SHOP ITEM
// ==========================================

app.post(
  "/dashboard/:guildId/shop/add",

  requireLogin,

  requireBotOwner,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const guildShop =
      getGuildShop(
        guild.id
      );


    const name =
      String(
        req.body.name || ""
      )

        .trim()

        .slice(
          0,
          100
        );


    const price =
      Number(
        req.body.price
      );


    if (
      !name ||
      !Number.isInteger(price) ||
      price <= 0
    ) {

      return res
        .status(400)
        .send(
          "❌ بيانات المنتج غير صحيحة."
        );

    }


    guildShop.push({

      name,

      price

    });


    saveShop();


    return res.redirect(

      `/dashboard/${guild.id}/shop`

    );

  }

);
  
// ==========================================
// DELETE SHOP ITEM
// ==========================================

app.post(
  "/dashboard/:guildId/shop/:index/delete",

  requireLogin,

  requireBotOwner,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const guildShop =
      getGuildShop(
        guild.id
      );


    const index =
      Number(
        req.params.index
      );


    if (
      guildShop[index]
    ) {

      guildShop.splice(
        index,
        1
      );


      saveShop();

    }


    return res.redirect(
      `/dashboard/${guild.id}/shop`
    );

  }

);
  
  // ==========================================
// PANEL EDITOR
// ==========================================

function panelEditor(
  guild,
  cfg,
  index,
  panel
) {

  const roles =
    [
      ...guild.roles.cache.values()
    ]

      .filter(
        role =>
          role.id !== guild.id &&
          !role.managed
      )

      .sort(
        (a, b) =>
          b.position -
          a.position
      );


  const categories =
    [
      ...guild.channels.cache.values()
    ]

      .filter(
        channel =>
          channel.type ===
          ChannelType.GuildCategory
      );


  const buttons =
    panel.buttons || [];


  const buttonEditors =

    buttons

      .map(
        (button, i) => `

<div class="button-editor">


<div class="button-editor-head">


<b>

زر ${i + 1}

</b>


<label class="remove-check">

<input

type="checkbox"

name="deleteButton_${i}"

value="1"

>

حذف الزر

</label>


</div>



<div class="three-col">


<div class="field">


<label>

اسم الزر

</label>


<input

name="buttonLabel_${i}"

value="${esc(
  button.label || ""
)}"

>


</div>



<div class="field">


<label>

الإيموجي

</label>


<input

name="buttonEmoji_${i}"

value="${esc(
  button.emoji || "🎫"
)}"

>


</div>



<div class="field">


<label>

لون الزر

</label>


<select

name="buttonStyle_${i}"

>


${[
  "Primary",
  "Secondary",
  "Success",
  "Danger"
]

.map(
  style =>

`<option
${button.style === style
  ? "selected"
  : ""}
>
${style}
</option>`
)

.join("")}


</select>


</div>


</div>



<div class="two-col">


<div class="field">


<label>

كاتيجوري هذا الزر

</label>


<select

name="buttonCategory_${i}"

>


<option value="">

استخدم الافتراضي

</option>


${channelOptions(
  categories,
  button.categoryId || ""
)}


</select>


</div>



<div class="field">


<label>

بداية اسم روم التذكرة

</label>


<input

name="buttonPrefix_${i}"

value="${esc(
  button.channelPrefix ||
  "ticket"
)}"

>


</div>


</div>



<div class="field">


<label>

الرتب التي يتم منشنها

</label>


<select

name="buttonRoles_${i}"

multiple

size="7"

>


${roleOptions(
  roles,
  button.mentionRoles || []
)}


</select>


</div>



<div class="field">


<label>

عنوان رسالة داخل التذكرة

</label>


<input

name="ticketTitle_${i}"

value="${esc(
  button.ticketTitle ||
  "🎫 تذكرة جديدة"
)}"

>


</div>



<div class="field">


<label>

رسالة داخل التذكرة

</label>


<textarea

name="ticketMessage_${i}"

rows="5"

>${
  esc(
    button.ticketMessage ||
    cfg.ticketMessage
  )
}</textarea>


</div>



<div class="field">


<label>

لون رسالة التذكرة

</label>


<input

type="color"

name="ticketColor_${i}"

value="${esc(
  button.ticketColor ||
  "#5865F2"
)}"

>


</div>


</div>

`
      )

      .join("");


  return `

${pageHeader(

  index === "new"
    ?
    "إنشاء بانل"
    :
    "تعديل البانل",

  "غيّر الرسالة واللون والصورة والأزرار كما تريد.",

  "PANEL EDITOR"

)}


<form

method="POST"

action="/dashboard/${guild.id}/panels/${index}/save"

class="panel-card form-card reveal"

>


<div class="two-col">


<div class="field">


<label>

عنوان البانل

</label>


<input

name="title"

value="${esc(
  panel.title ||
  "🎫 KRX Tickets"
)}"

required

>


</div>



<div class="field">


<label>

لون الـ Embed

</label>


<input

type="color"

name="color"

value="${esc(
  panel.color ||
  "#5865F2"
)}"

>


</div>


</div>



<div class="field">


<label>

وصف البانل

</label>


<textarea

name="description"

rows="6"

required

>${
  esc(
    panel.description ||
    "اختر نوع التذكرة من الأزرار بالأسفل."
  )
}</textarea>


</div>



<div class="two-col">


<div class="field">


<label>

رابط صورة كبيرة

</label>


<input

name="image"

placeholder="https://..."

value="${esc(
  panel.image || ""
)}"

>


</div>



<div class="field">


<label>

رابط Thumbnail

</label>


<input

name="thumbnail"

placeholder="https://..."

value="${esc(
  panel.thumbnail || ""
)}"

>


</div>


</div>



<hr class="soft-line">



<div class="section-mini-head">


<div>


<span class="eyebrow">

BUTTONS

</span>


<h2>

أزرار البانل

</h2>


</div>



<button

type="button"

class="ghost-btn"

onclick="addButtonEditor()"

>

➕ إضافة زر

</button>


</div>



<input

type="hidden"

name="buttonCount"

id="buttonCount"

value="${buttons.length}"

>



<div id="buttonsWrap">

${buttonEditors}

</div>



<button

class="primary-btn full"

type="submit"

>

💾 حفظ البانل

</button>


</form>



<template id="buttonTemplate">


<div class="button-editor">


<div class="button-editor-head">

<b>

زر جديد

</b>

</div>



<div class="three-col">


<div class="field">


<label>

اسم الزر

</label>


<input

data-name="buttonLabel"

value="فتح تذكرة"

>


</div>



<div class="field">


<label>

الإيموجي

</label>


<input

data-name="buttonEmoji"

value="🎫"

>


</div>



<div class="field">


<label>

لون الزر

</label>


<select data-name="buttonStyle">


<option>

Primary

</option>


<option>

Secondary

</option>


<option>

Success

</option>


<option>

Danger

</option>


</select>


</div>


</div>



<div class="two-col">


<div class="field">


<label>

كاتيجوري هذا الزر

</label>


<select

data-name="buttonCategory"

>


<option value="">

استخدم الافتراضي

</option>


${channelOptions(
  categories
)}


</select>


</div>



<div class="field">


<label>

بداية اسم الروم

</label>


<input

data-name="buttonPrefix"

value="ticket"

>


</div>


</div>



<div class="field">


<label>

الرتب التي يتم منشنها

</label>


<select

data-name="buttonRoles"

multiple

size="7"

>


${roleOptions(
  roles
)}


</select>


</div>



<div class="field">


<label>

عنوان رسالة داخل التذكرة

</label>


<input

data-name="ticketTitle"

value="🎫 تذكرة جديدة"

>


</div>



<div class="field">


<label>

رسالة داخل التذكرة

</label>


<textarea

data-name="ticketMessage"

rows="5"

>${
  esc(
    cfg.ticketMessage
  )
}</textarea>


</div>



<div class="field">


<label>

لون رسالة التذكرة

</label>


<input

type="color"

data-name="ticketColor"

value="#5865F2"

>


</div>


</div>


</template>

`;

}


// ==========================================
// NEW PANEL PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/panels/new",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    await guild.roles.fetch();

    await guild.channels.fetch();


    const cfg =
      getGuildConfig(
        guild.id
      );


    const panel = {

      title:
        "🎫 KRX Tickets",

      description:
        "اختر نوع التذكرة من الأزرار بالأسفل.",

      color:
        "#5865F2",

      image:
        "",

      thumbnail:
        "",

      buttons: [

        {

          label:
            "الدعم",

          emoji:
            "🛠️",

          style:
            "Primary",

          categoryId:
            "",

          channelPrefix:
            "support",

          mentionRoles:
            [],

          ticketTitle:
            "🎫 تذكرة دعم",

          ticketMessage:
            cfg.ticketMessage,

          ticketColor:
            "#5865F2"

        }

      ]

    };


    return res.send(
      layout({

        user:
          req.session.user,

        guild,

        active:
          "panels",

        content:
          panelEditor(
            guild,
            cfg,
            "new",
            panel
          )

      })
    );

  }

);


// ==========================================
// EDIT PANEL PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/panels/:index",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    await guild.roles.fetch();

    await guild.channels.fetch();


    const cfg =
      getGuildConfig(
        guild.id
      );


    const index =
      Number(
        req.params.index
      );


    const panel =
      cfg.panels[index];


    if (!panel) {

      return res
        .status(404)
        .send(
          "❌ البانل غير موجود."
        );

    }


    return res.send(
      layout({

        user:
          req.session.user,

        guild,

        active:
          "panels",

        content:
          panelEditor(
            guild,
            cfg,
            String(index),
            panel
          )

      })
    );

  }

);


// ==========================================
// SAVE PANEL
// ==========================================

app.post(
  "/dashboard/:guildId/panels/:index/save",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const cfg =
      getGuildConfig(
        guild.id
      );


    const existing =

      req.params.index ===
      "new"

        ?

        {
          buttons: []
        }

        :

        cfg.panels[
          Number(
            req.params.index
          )
        ];


    if (!existing) {

      return res
        .status(404)
        .send(
          "❌ البانل غير موجود."
        );

    }


    function normalize(value) {

      if (
        Array.isArray(value)
      ) {

        return value;

      }


      if (value) {

        return [
          value
        ];

      }


      return [];

    }


    const buttonCount =

      Math.min(

        5,

        Math.max(

          0,

          Number(
            req.body.buttonCount ||
            0
          )

        )

      );


    const buttons = [];


    for (
      let i = 0;
      i < buttonCount;
      i++
    ) {


      if (
        req.body[
          `deleteButton_${i}`
        ] === "1"
      ) {

        continue;

      }


      const label =
        String(
          req.body[
            `buttonLabel_${i}`
          ] || ""
        )

          .trim();


      if (!label) {
        continue;
      }


      const style =

        [
          "Primary",
          "Secondary",
          "Success",
          "Danger"
        ]

          .includes(
            req.body[
              `buttonStyle_${i}`
            ]
          )

          ?

          req.body[
            `buttonStyle_${i}`
          ]

          :

          "Primary";


      buttons.push({

        label:
          label.slice(
            0,
            80
          ),

        emoji:
          String(
            req.body[
              `buttonEmoji_${i}`
            ] || "🎫"
          )

            .slice(
              0,
              50
            ),

        style,

        categoryId:
          String(
            req.body[
              `buttonCategory_${i}`
            ] || ""
          ),

        channelPrefix:
          String(
            req.body[
              `buttonPrefix_${i}`
            ] || "ticket"
          )

            .slice(
              0,
              30
            ),

        mentionRoles:
          normalize(
            req.body[
              `buttonRoles_${i}`
            ]
          )

            .filter(
              roleId =>
                guild.roles.cache.has(
                  roleId
                )
            ),

        ticketTitle:
          String(
            req.body[
              `ticketTitle_${i}`
            ] ||
            "🎫 تذكرة جديدة"
          )

            .slice(
              0,
              256
            ),

        ticketMessage:
          String(
            req.body[
              `ticketMessage_${i}`
            ] ||
            cfg.ticketMessage
          )

            .slice(
              0,
              3500
            ),

        ticketColor:

          /^#[0-9A-Fa-f]{6}$/

            .test(
              req.body[
                `ticketColor_${i}`
              ] || ""
            )

            ?

            req.body[
              `ticketColor_${i}`
            ]

            :

            "#5865F2"

      });

    }


    const panel = {

      title:
        String(
          req.body.title ||
          "🎫 KRX Tickets"
        )

          .slice(
            0,
            256
          ),

      description:
        String(
          req.body.description ||
          ""
        )

          .slice(
            0,
            3500
          ),

      color:

        /^#[0-9A-Fa-f]{6}$/

          .test(
            req.body.color || ""
          )

          ?

          req.body.color

          :

          "#5865F2",

      image:
        String(
          req.body.image || ""
        )

          .slice(
            0,
            1000
          ),

      thumbnail:
        String(
          req.body.thumbnail || ""
        )

          .slice(
            0,
            1000
          ),

      buttons

    };


    if (
      req.params.index ===
      "new"
    ) {

      cfg.panels.push(
        panel
      );

    } else {

      cfg.panels[
        Number(
          req.params.index
        )
      ] = panel;

    }


    saveConfig();


    return res.redirect(

      `/dashboard/${guild.id}/panels`

    );

  }

);


// ==========================================
// DELETE PANEL
// ==========================================

app.post(
  "/dashboard/:guildId/panels/:index/delete",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const cfg =
      getGuildConfig(
        guild.id
      );


    const index =
      Number(
        req.params.index
      );


    if (
      cfg.panels[index]
    ) {

      cfg.panels.splice(
        index,
        1
      );


      saveConfig();

    }


    return res.redirect(

      `/dashboard/${guild.id}/panels`

    );

  }

);


// ==========================================
// SHOP PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/shop",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const guildShop =
      getGuildShop(
        guild.id
      );


    const items =

      guildShop.length

        ?

        guildShop

          .map(
            (item, index) => `

<div class="item-card">


<div>


<span class="item-icon">

🛒

</span>


<div>


<b>

${esc(
  item.name
)}

</b>


<small>

${Number(
  item.price
)}

نقطة

</small>


</div>


</div>



<div class="item-actions">


<form

method="POST"

action="/dashboard/${guild.id}/shop/${index}/delete"

>


<button class="danger-action">

حذف

</button>


</form>


</div>


</div>

`
          )

          .join("")

        :

`<div class="empty-inline">
الشوب فارغ.
</div>`;


    const content = `

${pageHeader(

  "متجر النقاط",

  "أضف واحذف المنتجات وحدد أسعارها من هنا.",

  "POINTS SHOP"

)}


<form

method="POST"

action="/dashboard/${guild.id}/shop/add"

class="panel-card compact-form reveal"

>


<div class="two-col">


<div class="field">


<label>

اسم المنتج

</label>


<input

name="name"

placeholder="VIP"

required

>


</div>



<div class="field">


<label>

السعر بالنقاط

</label>


<input

type="number"

name="price"

min="1"

max="999999999"

placeholder="100"

required

>


</div>


</div>



<button

class="primary-btn"

type="submit"

>

➕ إضافة المنتج

</button>


</form>



<section class="panel-card reveal">


<div class="item-list">

${items}

</div>


</section>

`;


    return res.send(
      layout({

        user:
          req.session.user,

        guild,

        active:
          "shop",

        content

      })
    );

  }

);


// ==========================================
// ADD SHOP ITEM
// ==========================================

app.post(
  "/dashboard/:guildId/shop/add",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const guildShop =
      getGuildShop(
        guild.id
      );


    const name =
      String(
        req.body.name || ""
      )

        .trim()

        .slice(
          0,
          100
        );


    const price =
      Number(
        req.body.price
      );


    if (
      !name ||
      !Number.isInteger(price) ||
      price <= 0
    ) {

      return res
        .status(400)
        .send(
          "❌ بيانات المنتج غير صحيحة."
        );

    }


    guildShop.push({

      name,

      price

    });


    saveShop();


    return res.redirect(

      `/dashboard/${guild.id}/shop`

    );

  }

);


// ==========================================
// DELETE SHOP ITEM
// ==========================================

app.post(
  "/dashboard/:guildId/shop/:index/delete",

  requireLogin,

  async (req, res) => {


    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const guildShop =
      getGuildShop(
        guild.id
      );


    const index =
      Number(
        req.params.index
      );


    if (
      guildShop[index]
    ) {

      guildShop.splice(
        index,
        1
      );


      saveShop();

    }


    return res.redirect(

      `/dashboard/${guild.id}/shop`

    );

  }

);
// ==========================================
// POINTS PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/points",
  requireLogin,
  async (req, res) => {

    const guild =
      await ensureAllowedGuild(
        req,
        res
      );

    if (!guild) return;


    const guildPoints =
      getGuildPoints(
        guild.id
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
          20
        );


    const rows =
      top.length
        ?
        top.map(
          ([userId, value], index) => {

            const member =
              guild.members.cache.get(
                userId
              );

            return `
<div class="leader-row">

<span class="rank">
${index + 1}
</span>

<div class="leader-user">

<b>
${esc(
  member?.user?.username ||
  userId
)}
</b>

<small>
${userId}
</small>

</div>

<strong>
⭐ ${Number(value)}
</strong>

</div>
`;

          }
        ).join("")
        :
        `<div class="empty-inline">
لا توجد نقاط.
</div>`;


    const content = `

${pageHeader(
  "إدارة النقاط",
  "أضف أو اخصم أو عيّن أو صفّر نقاط أي عضو.",
  "POINTS CONTROL"
)}

<form
method="POST"
action="/dashboard/${guild.id}/points/update"
class="panel-card compact-form reveal"
>

<div class="three-col">

<div class="field">

<label>
ID العضو
</label>

<input
name="userId"
placeholder="123456789..."
required
>

</div>

<div class="field">

<label>
العملية
</label>

<select name="action">

<option value="add">
إضافة
</option>

<option value="remove">
خصم
</option>

<option value="set">
تعيين
</option>

<option value="reset">
تصفير
</option>

</select>

</div>

<div class="field">

<label>
العدد
</label>

<input
type="number"
name="amount"
min="0"
value="10"
>

</div>

</div>

<button
class="primary-btn"
type="submit"
>
⭐ تنفيذ
</button>

</form>


<section class="panel-card reveal">

<div class="card-title">

<h2>
🏆 أعلى النقاط
</h2>

</div>

<div class="leader-list">
${rows}
</div>

</section>
`;


    return res.send(
      layout({
        user:
          req.session.user,

        guild,

        active:
          "points",

        content
      })
    );

  }
);


// ==========================================
// UPDATE POINTS
// ==========================================

app.post(
  "/dashboard/:guildId/points/update",
  requireLogin,
  async (req, res) => {

    const guild =
      await ensureAllowedGuild(
        req,
        res
      );

    if (!guild) return;


    const guildPoints =
      getGuildPoints(
        guild.id
      );


    const userId =
      String(
        req.body.userId || ""
      ).trim();


    const action =
      String(
        req.body.action || ""
      );


    const amount =
      Math.max(
        0,
        Number(
          req.body.amount || 0
        )
      );


    if (
      !/^\d{15,25}$/.test(
        userId
      )
    ) {

      return res
        .status(400)
        .send(
          "❌ ID العضو غير صحيح."
        );

    }


    guildPoints[
      userId
    ] =
      Number(
        guildPoints[
          userId
        ] || 0
      );


    if (
      action === "add"
    ) {

      guildPoints[
        userId
      ] += amount;

    }


    if (
      action === "remove"
    ) {

      guildPoints[
        userId
      ] =
        Math.max(
          0,
          guildPoints[
            userId
          ] - amount
        );

    }


    if (
      action === "set"
    ) {

      guildPoints[
        userId
      ] = amount;

    }


    if (
      action === "reset"
    ) {

      guildPoints[
        userId
      ] = 0;

    }


    savePoints();


    return res.redirect(
      `/dashboard/${guild.id}/points`
    );

  }
);


// ==========================================
// MESSAGES PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/messages",
  requireLogin,
  async (req, res) => {

    const guild =
      await ensureAllowedGuild(
        req,
        res
      );

    if (!guild) return;


    const content = `

${pageHeader(
  "الرسائل",
  "أرسل رسالة خاصة لعضو أو رسالة جماعية لكل أعضاء السيرفر.",
  "MESSAGE CENTER"
)}

<div class="two-col-panels reveal">

<form
method="POST"
action="/dashboard/${guild.id}/messages/dm"
class="panel-card form-card"
>

<div class="card-title">

<h2>
👤 رسالة لعضو
</h2>

</div>

<div class="field">

<label>
ID العضو
</label>

<input
name="userId"
placeholder="123456789..."
required
>

</div>

<div class="field">

<label>
الرسالة
</label>

<textarea
name="message"
rows="8"
placeholder="اكتب الرسالة هنا..."
required
></textarea>

</div>

<label class="check-line">

<input
type="checkbox"
name="mention"
value="1"
checked
>

إضافة منشن العضو أعلى الرسالة

</label>

<button
class="primary-btn full"
type="submit"
>
📨 إرسال
</button>

</form>


<form
method="POST"
action="/dashboard/${guild.id}/messages/broadcast"
class="panel-card form-card"
>

<div class="card-title">

<h2>
📣 رسالة جماعية
</h2>

</div>

<div class="warning-box">

الإرسال الجماعي قد يستغرق وقتاً،
وسيتم الإرسال بتأخير بسيط لتقليل مشاكل Rate Limit.

</div>

<div class="field">

<label>
الرسالة
</label>

<textarea
name="message"
rows="8"
placeholder="اكتب الرسالة التي ستصل للجميع..."
required
></textarea>

</div>

<label class="check-line">

<input
type="checkbox"
name="mention"
value="1"
checked
>

منشن تلقائي لكل شخص في الخاص

</label>

<button
class="danger-btn full"
type="submit"
onclick="return confirm('إرسال الرسالة لكل أعضاء السيرفر؟')"
>
📨 إرسال للجميع
</button>

</form>

</div>
`;


    return res.send(
      layout({
        user:
          req.session.user,

        guild,

        active:
          "messages",

        content
      })
    );

  }
);


// ==========================================
// SEND DM TO ONE MEMBER
// ==========================================

app.post(
  "/dashboard/:guildId/messages/dm",
  requireLogin,
  async (req, res) => {

    const guild =
      await ensureAllowedGuild(
        req,
        res
      );

    if (!guild) return;


    const userId =
      String(
        req.body.userId || ""
      ).trim();


    const member =
      await guild.members.fetch(
        userId
      )
        .catch(
          () => null
        );


    if (!member) {

      return res
        .status(400)
        .send(
          "❌ العضو غير موجود."
        );

    }


    const text =
      String(
        req.body.message || ""
      )
        .slice(
          0,
          1800
        );


    if (!text) {

      return res
        .status(400)
        .send(
          "❌ الرسالة فارغة."
        );

    }


    const prefix =
      req.body.mention === "1"
        ?
        `<@${member.id}>\n\n`
        :
        "";


    try {

      await member.send(
        prefix +
        text
      );


      return res.redirect(
        `/dashboard/${guild.id}/messages?sent=1`
      );


    } catch {

      return res
        .status(400)
        .send(
          "❌ لم أستطع إرسال الرسالة."
        );

    }

  }
);


// ==========================================
// BROADCAST
// ==========================================

app.post(
  "/dashboard/:guildId/messages/broadcast",
  requireLogin,
  async (req, res) => {

    const guild =
      await ensureAllowedGuild(
        req,
        res
      );

    if (!guild) return;


    const text =
      String(
        req.body.message || ""
      )
        .slice(
          0,
          1800
        );


    if (!text) {

      return res
        .status(400)
        .send(
          "❌ الرسالة فارغة."
        );

    }


    await guild.members.fetch()
      .catch(
        () => {}
      );


    let sent = 0;
    let failed = 0;


    for (
      const member
      of
      guild.members.cache.values()
    ) {

      if (
        member.user.bot
      ) {

        continue;

      }


      const prefix =
        req.body.mention === "1"
          ?
          `<@${member.id}>\n\n`
          :
          "";


      try {

        await member.send(
          prefix +
          text
        );

        sent++;

      } catch {

        failed++;

      }


      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            1000
          )
      );

    }


    return res.send(
`<!DOCTYPE html>

<html lang="ar" dir="rtl">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1"
>

<link
rel="stylesheet"
href="/style.css"
>

<title>
KRX Messages
</title>

</head>

<body class="dashboard-body">

<div class="center-page">

<div class="empty-card">

<h1>
✅ انتهى الإرسال
</h1>

<p>

📨 تم:
<strong>
${sent}
</strong>

<br><br>

❌ فشل:
<strong>
${failed}
</strong>

</p>

<a
class="primary-btn"
href="/dashboard/${guild.id}/messages"
>
رجوع
</a>

</div>

</div>

</body>

</html>`
    );

  }
);


// ==========================================
// SETTINGS PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/settings",
  requireLogin,
  async (req, res) => {

    const guild =
      await ensureAllowedGuild(
        req,
        res
      );

    if (!guild) return;


    const cfg =
      getGuildConfig(
        guild.id
      );


    const content = `

${pageHeader(
  "الإعدادات",
  "ملخص إعدادات KRX في هذا السيرفر.",
  "SETTINGS"
)}

<section class="panel-card reveal">

<div class="settings-summary">

<div>
<span>👮 Staff Roles</span>
<b>${cfg.staffRoles.length}</b>
</div>

<div>
<span>👑 High Roles</span>
<b>${cfg.highRoles.length}</b>
</div>

<div>
<span>🎫 Ticket Category</span>
<code>
${esc(
  cfg.ticketCategory ||
  "غير محدد"
)}
</code>
</div>

<div>
<span>⭐ Rating Channel</span>
<code>
${esc(
  cfg.ratingChannel ||
  "غير محدد"
)}
</code>
</div>

<div>
<span>🧩 Panels</span>
<b>${cfg.panels.length}</b>
</div>

<div>
<span>⭐ Claim Points</span>
<b>
${Number(
  cfg.claimPoints || 2
)}
</b>
</div>

</div>

</section>
`;


    return res.send(
      layout({
        user:
          req.session.user,

        guild,

        active:
          "settings",

        content
      })
    );

  }
);


// ==========================================
// LOGOUT
// ==========================================

app.get(
  "/logout",
  (req, res) => {

    req.session.destroy(
      () => {

        res.redirect("/");

      }
    );

  }
);


// ==========================================
// HEALTH
// ==========================================

app.get(
  "/health",
  (req, res) => {

    return res.json({

      status:
        "ok",

      botReady:
        client.isReady()

    });

  }
);


// ==========================================
// ZYRO DASHBOARD SYSTEM
// ==========================================

const zyroSystem =
  require("./zyro");


function getDashboardZyroShop(
  guildId
) {

  if (
    !Array.isArray(
      zyroSystem.zyroShop[
        guildId
      ]
    )
  ) {

    zyroSystem.zyroShop[
      guildId
    ] = [];

    zyroSystem.saveZyroShop();
  }


  return zyroSystem.zyroShop[
    guildId
  ];
}


// ==========================================
// ZYRO SHOP PAGE
// ==========================================

app.get(
  "/dashboard/:guildId/zyro",

  requireLogin,

  async (req, res) => {

    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    await guild.roles.fetch();


    const guildShop =
      getDashboardZyroShop(
        guild.id
      );


    const ownerMode =
      String(
        req.session.user.id
      ) ===
      String(
        BOT_OWNER_ID
      );


    const roles = [
      ...guild.roles.cache.values()
    ]

      .filter(
        role =>

          role.id !== guild.id &&

          !role.managed
      )

      .sort(
        (a, b) =>
          b.position -
          a.position
      );


    const roleOptionsHtml =
      roles

        .map(
          role => `

<option value="${role.id}">

${esc(role.name)}

</option>

`
        )

        .join("");


    const items =
      guildShop.length

        ?

        guildShop

          .map(
            (item, index) => {

              const role =
                item.roleId

                  ?

                  guild.roles.cache.get(
                    String(
                      item.roleId
                    )
                  )

                  :

                  null;


              return `

<div class="item-card">


<div>


<span class="item-icon">

${esc(
  item.emoji ||
  "💠"
)}

</span>


<div>


<b>

${esc(
  item.name ||
  "منتج Zyro"
)}

</b>


<small>

السعر:
${Number(
  item.price ||
  0
).toLocaleString("en-US")}
Zyro

</small>


${
  item.description

    ?

    `<p>${esc(
      item.description
    )}</p>`

    :

    ""
}


${
  role

    ?

    `<small>
      الرتبة: ${esc(role.name)}
    </small>`

    :

    `<small>
      بدون رتبة
    </small>`
}


</div>


</div>


${
  ownerMode

    ?

    `

<div class="item-actions">


<form

method="POST"

action="/dashboard/${guild.id}/zyro/shop/${index}/delete"

onsubmit="return confirm('هل تريد حذف المنتج؟')"

>


<button

type="submit"

class="danger-action"

>

حذف

</button>


</form>


</div>

`

    :

    ""
}


</div>

`;

            }
          )

          .join("")

        :

        `

<div class="empty-inline">

متجر Zyro فارغ حاليًا.

</div>

`;


    const ownerControls =
      ownerMode

        ?

        `

<form

method="POST"

action="/dashboard/${guild.id}/zyro/shop/add"

class="panel-card form-card reveal"

>


<div class="two-col">


<div class="field">


<label>

اسم المنتج

</label>


<input

name="name"

placeholder="VIP"

maxlength="100"

required

>


</div>



<div class="field">


<label>

السعر بـ Zyro

</label>


<input

type="number"

name="price"

min="1"

max="999999999"

placeholder="1000"

required

>


</div>


</div>



<div class="two-col">


<div class="field">


<label>

الإيموجي

</label>


<input

name="emoji"

placeholder="💠"

maxlength="50"

value="💠"

>


</div>



<div class="field">


<label>

الرتبة بعد الشراء

</label>


<select name="roleId">


<option value="">

بدون رتبة

</option>


${roleOptionsHtml}


</select>


</div>


</div>



<div class="field">


<label>

وصف المنتج

</label>


<textarea

name="description"

rows="4"

maxlength="500"

placeholder="اكتب وصف المنتج هنا"

></textarea>


</div>



<button

type="submit"

class="primary-btn full"

>

➕ إضافة منتج Zyro

</button>


</form>

`

        :

        `

<section class="panel-card tip reveal">


<b>

🔒 وضع العرض فقط

</b>


<p>

إضافة وحذف منتجات Zyro متاح لصاحب البوت فقط.

</p>


</section>

`;


    const content = `

${pageHeader(

  "متجر Zyro",

  "تحكم في منتجات عملة Zyro والأسعار والرتب التي يحصل عليها المشتري.",

  "ZYRO SHOP"

)}


${ownerControls}



<section class="panel-card reveal">


<div class="card-title">


<div>


<span class="eyebrow">

ZYRO PRODUCTS

</span>


<h2>

منتجات المتجر

</h2>


</div>


</div>



<div class="item-list">

${items}

</div>


</section>



<section class="panel-card tip reveal">


<b>

💡 طريقة الشراء في ديسكورد

</b>


<p>

العضو يكتب:

<code>
!zshop
</code>

ثم يشتري باستخدام:

<code>
!zbuy 1
</code>

</p>


</section>

`;


    return res.send(
      layout({

        user:
          req.session.user,

        guild,

        active:
          "zyro",

        content

      })
    );

  }

);


// ==========================================
// ADD ZYRO SHOP ITEM
// OWNER ONLY
// ==========================================

app.post(
  "/dashboard/:guildId/zyro/shop/add",

  requireLogin,

  requireBotOwner,

  async (req, res) => {

    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    await guild.roles.fetch();


    const guildShop =
      getDashboardZyroShop(
        guild.id
      );


    const name =
      String(
        req.body.name ||
        ""
      )

        .trim()

        .slice(
          0,
          100
        );


    const price =
      Number(
        req.body.price
      );


    const emoji =
      String(
        req.body.emoji ||
        "💠"
      )

        .trim()

        .slice(
          0,
          50
        );


    const description =
      String(
        req.body.description ||
        ""
      )

        .trim()

        .slice(
          0,
          500
        );


    const roleId =
      String(
        req.body.roleId ||
        ""
      );


    if (
      !name ||

      !Number.isSafeInteger(
        price
      ) ||

      price <= 0
    ) {

      return res
        .status(400)
        .send(
          "❌ بيانات المنتج غير صحيحة."
        );
    }


    if (
      roleId &&

      !guild.roles.cache.has(
        roleId
      )
    ) {

      return res
        .status(400)
        .send(
          "❌ الرتبة المختارة غير موجودة."
        );
    }


    guildShop.push({

      name,

      price,

      emoji,

      description,

      roleId

    });


    zyroSystem.saveZyroShop();


    return res.redirect(

      `/dashboard/${guild.id}/zyro`

    );

  }

);


// ==========================================
// DELETE ZYRO SHOP ITEM
// OWNER ONLY
// ==========================================

app.post(
  "/dashboard/:guildId/zyro/shop/:index/delete",

  requireLogin,

  requireBotOwner,

  async (req, res) => {

    const guild =
      await ensureAllowedGuild(
        req,
        res
      );


    if (!guild) {
      return;
    }


    const guildShop =
      getDashboardZyroShop(
        guild.id
      );


    const index =
      Number(
        req.params.index
      );


    if (
      Number.isInteger(index) &&
      guildShop[index]
    ) {

      guildShop.splice(
        index,
        1
      );


      zyroSystem.saveZyroShop();

    }


    return res.redirect(

      `/dashboard/${guild.id}/zyro`

    );

  }

);


// ==========================================
// START WEBSITE
// ==========================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `🌐 KRX Dashboard running on port ${PORT}`
    );

  }
);


};
