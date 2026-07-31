const express = require("express");
const session = require("express-session");
const crypto = require("crypto");
const path = require("path");
const { ChannelType } = require("discord.js");

module.exports = function startDashboard(client, config, saveConfig){
  const app = express();
  const PORT = process.env.PORT || 3000;
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID || "1531918719402377226";
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const PUBLIC_URL = (process.env.PUBLIC_URL || "").replace(/\/+$/, "");
  const CALLBACK_URL = `${PUBLIC_URL}/auth/discord/callback`;

  app.set("trust proxy", 1);
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  app.use(session({
    secret: process.env.SESSION_SECRET || "CHANGE_ME_KRX_SESSION_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24
    }
  }));

  app.use(express.static(path.join(__dirname, "public")));

  function esc(v=""){
    return String(v)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function canManage(g){
    if(g.owner) return true;
    try{
      const p = BigInt(g.permissions || "0");
      const ADMIN = 1n << 3n;
      const MANAGE_GUILD = 1n << 5n;
      return (p & ADMIN) === ADMIN || (p & MANAGE_GUILD) === MANAGE_GUILD;
    }catch{return false;}
  }

  async function discordGet(route, token){
    const r = await fetch(`https://discord.com/api/v10${route}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if(!r.ok) throw new Error(`Discord API ${r.status}`);
    return r.json();
  }

  function requireLogin(req,res,next){
    if(!req.session.user || !req.session.accessToken){
      return res.redirect("/auth/discord");
    }
    next();
  }

  async function allowedGuilds(req){
    const guilds = await discordGet("/users/@me/guilds", req.session.accessToken);
    return guilds.filter(g => canManage(g) && client.guilds.cache.has(g.id));
  }

  app.get("/auth/discord", (req,res) => {
    if(!CLIENT_SECRET || !PUBLIC_URL){
      return res.status(500).send("أضف DISCORD_CLIENT_SECRET و PUBLIC_URL في Railway أولاً.");
    }
    const state = crypto.randomBytes(24).toString("hex");
    req.session.oauthState = state;
    const q = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: CALLBACK_URL,
      response_type: "code",
      scope: "identify guilds",
      state
    });
    res.redirect(`https://discord.com/oauth2/authorize?${q.toString()}`);
  });

  app.get("/auth/discord/callback", async (req,res) => {
    try{
      if(!req.query.code || !req.query.state || req.query.state !== req.session.oauthState){
        return res.status(400).send("OAuth state غير صحيح.");
      }
      delete req.session.oauthState;
      const body = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code: req.query.code,
        redirect_uri: CALLBACK_URL
      });
      const tr = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body
      });
      if(!tr.ok) throw new Error(await tr.text());
      const token = await tr.json();
      const user = await discordGet("/users/@me", token.access_token);
      req.session.accessToken = token.access_token;
      req.session.user = user;
      res.redirect("/dashboard");
    }catch(err){
      console.error("OAuth error:", err);
      res.status(500).send("فشل تسجيل الدخول بديسكورد.");
    }
  });

  app.get("/dashboard", requireLogin, async (req,res) => {
    try{
      const guilds = await allowedGuilds(req);
      if(guilds.length === 1) return res.redirect(`/dashboard/${guilds[0].id}`);
      const cards = guilds.map(g => `
        <a class="server-card" href="/dashboard/${g.id}">
          <div class="server-fallback">${esc(g.name.slice(0,1))}</div>
          <div><b>${esc(g.name)}</b><span>فتح Dashboard</span></div>
        </a>`).join("");
      res.send(page("اختر السيرفر", `
        <div class="panel"><h1>اختر السيرفر</h1>
        <p>يظهر هنا فقط السيرفرات التي فيها البوت ولديك صلاحية إدارتها.</p>
        <div class="server-list">${cards || "<p>لا يوجد سيرفر متاح.</p>"}</div></div>`));
    }catch(err){
      console.error(err);
      res.status(500).send("تعذر تحميل السيرفرات.");
    }
  });

  app.get("/dashboard/:guildId", requireLogin, async (req,res) => {
    try{
      const list = await allowedGuilds(req);
      if(!list.some(g => g.id === req.params.guildId)) return res.status(403).send("غير مسموح.");
      const guild = client.guilds.cache.get(req.params.guildId);
      await guild.roles.fetch();
      await guild.channels.fetch();

      const roles = [...guild.roles.cache.values()]
        .filter(r => r.id !== guild.id && !r.managed)
        .sort((a,b) => b.position-a.position);
      const cats = [...guild.channels.cache.values()]
        .filter(c => c.type === ChannelType.GuildCategory)
        .sort((a,b) => a.position-b.position);
      const texts = [...guild.channels.cache.values()]
        .filter(c => c.type === ChannelType.GuildText)
        .sort((a,b) => a.position-b.position);

      const opts = (arr, selected, prefix="") => arr.map(x =>
        `<option value="${x.id}" ${selected===x.id?"selected":""}>${prefix}${esc(x.name)}</option>`
      ).join("");

      res.send(page(`KRX Dashboard - ${guild.name}`, `
        <div class="panel wide">
          <div class="dash-head"><div><span class="eyebrow">KRX DASHBOARD</span><h1>${esc(guild.name)}</h1>
          <p>غير إعدادات البوت من القوائم واضغط حفظ.</p></div><a class="logout" href="/logout">تسجيل خروج</a></div>
          ${req.query.saved === "1" ? '<div class="success">✅ تم حفظ الإعدادات بنجاح</div>' : ''}
          <form method="POST" action="/dashboard/${guild.id}/save" class="settings">
            <label>👮 رتبة Staff<select name="staffRole" required><option value="">اختر رتبة</option>${opts(roles,config.STAFF_ROLE)}</select></label>
            <label>👑 الإدارة العليا<select name="highRole" required><option value="">اختر رتبة</option>${opts(roles,config.HIGH_ROLE)}</select></label>
            <label>🎫 كاتيجوري التذاكر<select name="ticketCategory" required><option value="">اختر كاتيجوري</option>${opts(cats,config.TICKET_CATEGORY)}</select></label>
            <label>⭐ روم التقييم<select name="ratingChannel" required><option value="">اختر روم</option>${opts(texts,config.RATING_CHANNEL,"# ")}</select></label>
            <button class="save" type="submit">💾 حفظ الإعدادات</button>
          </form>
        </div>`));
    }catch(err){
      console.error(err);
      res.status(500).send("تعذر تحميل Dashboard.");
    }
  });

  app.post("/dashboard/:guildId/save", requireLogin, async (req,res) => {
    try{
      const list = await allowedGuilds(req);
      if(!list.some(g => g.id === req.params.guildId)) return res.status(403).send("غير مسموح.");
      const guild = client.guilds.cache.get(req.params.guildId);
      const staff = guild.roles.cache.get(req.body.staffRole);
      const high = guild.roles.cache.get(req.body.highRole);
      const cat = guild.channels.cache.get(req.body.ticketCategory);
      const rating = guild.channels.cache.get(req.body.ratingChannel);
      if(!staff || !high || !cat || cat.type !== ChannelType.GuildCategory || !rating || rating.type !== ChannelType.GuildText){
        return res.status(400).send("الإعدادات المختارة غير صحيحة.");
      }
      config.STAFF_ROLE = staff.id;
      config.HIGH_ROLE = high.id;
      config.TICKET_CATEGORY = cat.id;
      config.RATING_CHANNEL = rating.id;
      saveConfig();
      res.redirect(`/dashboard/${guild.id}?saved=1`);
    }catch(err){
      console.error(err);
      res.status(500).send("تعذر حفظ الإعدادات.");
    }
  });

  app.get("/logout", (req,res) => req.session.destroy(() => res.redirect("/")));
  app.get("/health", (req,res) => res.json({ status:"ok", botReady:client.isReady() }));

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 KRX Website + Dashboard running on ${PORT}`);
  });

  function page(title, content){
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><link rel="stylesheet" href="/style.css"></head><body><main class="dash-page">${content}</main></body></html>`;
  }
};
