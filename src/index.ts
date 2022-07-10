// @ts-ignore: Object is possibly 'null'.


import bodyParser from "body-parser";
import express from "express";
import { URL } from "url";

import { Telegraf } from "telegraf";

import puppeteer from "puppeteer-core";
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

const launch_options = {
  //userDataDir: './tmp',
  executablePath: "/usr/bin/chromium-browser",
  headless: true,
  args: minimal_args,
  defaultViewport: {
    width: 1280,
    height: 720,
  }
}

const stringIsAValidUrl = (s:string) => {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
};
/*
  TELEGRAM_BOT_TOKEN is an environment variable
  that should be configured on Railway
*/
if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("Please add a bot token");
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);


bot.start(ctx => ctx.reply("Welcome"));

bot.hears("hello", ctx => {
  ctx.reply("Hello to you too!");
  ctx.telegram.sendMessage(ctx.message.chat.id, 
    `Hello ${JSON.stringify(ctx.message.from)} chat id - ${ctx.message.chat.id}`)
});

bot.on("text", async ctx => {
  const username:string = ctx.message.from.username || "";
  const url = ctx.update.message.text

  const whitelisted_usernames = String(process.env.TELEGRAM_VALID_USERNAMES || "").split(",")
  if(!whitelisted_usernames.includes(username)){
    ctx.reply("too soon. your username is not whitelisted !");
    return;
  }
  
  if(!stringIsAValidUrl(url)){
    ctx.reply("Invalid URL !");
    return;
  }

  const imageBuffer = await getScreenshot(url)
  //reply to message
  ctx.replyWithPhoto({
    source: imageBuffer
  })

});

bot.launch();

const getScreenshot = async (url:string) => {
  const browser = await puppeteer.launch(launch_options);
  const page = await browser.newPage()
  await page.goto(url,{
    waitUntil: 'networkidle2'
  });

  // image buffer returned from screenshot
  const result = await page.screenshot({
    encoding: 'binary',
    type: 'jpeg',
    quality: 100
  }) as Buffer;
  await page.close();
  await browser.close();
  return result;
}

const sendScreenshot = async (url:string, chat_id:string) => {
  const imageBuffer:Buffer = await getScreenshot(url)
  bot.telegram.sendPhoto(chat_id, {
    source: imageBuffer
  })
}

const app = express();
const port = process.env.PORT || 3333;

app.use(bodyParser.json());
app.use(bodyParser.raw({ type: "application/vnd.custom-type" }));
app.use(bodyParser.text({ type: "text/html" }));

app.get("/", async (req, res) => {
  res.json({ Hello: "World" });
});

app.get("/send-screenshot",async(req,res) => {
  
  let url = String(req.query.url || "");
  let chat_id = String(req.query.chat_id || "");
  
  if(!url || !chat_id){
    return res.json({status:"error",message:"url or chat_id is missing"})
  }

  await sendScreenshot(url, chat_id);

  return res.json({status:"success"})
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))