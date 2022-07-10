import bodyParser from "body-parser";
import express from "express";
import { Telegraf } from "telegraf";

import puppeteer from "puppeteer";
const minimal_args = [
  '--autoplay-policy=user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-features=AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-speech-api',
  '--disable-sync',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-sandbox',
  '--no-zygote',
  '--password-store=basic',
  '--use-gl=swiftshader',
  '--use-mock-keychain',
  '--single-process'
];

/*
  TELEGRAM_BOT_TOKEN is an environment variable
  that should be configured on Railway
*/
if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("Please add a bot token");
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start(ctx => ctx.reply("Welcome"));
bot.hears("hello", ctx => {
  ctx.reply("Hello to you too!");
  ctx.telegram.sendMessage(ctx.message.chat.id, `Hello ${JSON.stringify(ctx.message.from)} chat id - ${ctx.message.chat.id}`)
});

bot.on("text", ctx => {
  const username:string = ctx.message.from.username || "";
  const url = ctx.update.message.text
  const whitelisted_usernames = String(process.env.TELEGRAM_VALID_USERNAMES || "").split(",")
  if(!whitelisted_usernames.includes(username)){
    ctx.reply("too soon. your username is not whitelisted !");
    return;
  }

  puppeteer
  .launch({
    //userDataDir: './tmp',
    headless: true,
    args: minimal_args,
    defaultViewport: {
      width: 1280,
      height: 720,
    },
  })
  .then(async (browser) => {

    //navigate to url
    const page = await browser.newPage();
    await page.goto(url,{
      waitUntil: 'networkidle2'
    });
      
    // image buffer returned from screenshot
    const imageBuffer:Buffer = await page.screenshot({
      encoding: 'binary',
      type: 'jpeg',
      quality: 100
    }) as Buffer;

    //reply to message
    ctx.replyWithPhoto({
      source: imageBuffer
    })
    await page.close();
    await browser.close();

  });

});

bot.launch();

const app = express();
const port = process.env.PORT || 3333;

app.use(bodyParser.json());
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
app.use(bodyParser.text({ type: "text/html" }));

app.get("/", async (req, res) => {
  res.json({ Hello: "World" });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))