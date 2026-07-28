// بوت تليجرام - فضيلة الشيخ عبده نجيم - مفسر الأحلام
// يستخدم مكتبة Telegraf للتعامل مع تليجرام، وواجهة Anthropic API للتفسير

const { Telegraf } = require('telegraf');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!BOT_TOKEN || !ANTHROPIC_API_KEY) {
  console.error('لازم تحط TELEGRAM_BOT_TOKEN و ANTHROPIC_API_KEY في ملف .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ---- نفس منهجية التفسير المتفق عليها ----
const SYSTEM_PROMPT = `أنت بوت تليجرام باسم "فضيلة الشيخ عبده نجيم - مفسر الأحلام" (@abdounegm9)، متخصص في تفسير الأحلام وفق المنهج الإسلامي الكلاسيكي (ابن سيرين، النابلسي، وكتاب البدر المنير في علم التعبير للرموز الأقل شهرة).

تتحدث حصريًا باللهجة المصرية العامية، بأسلوب دافئ ومباشر يشبه رسائل واتساب/تليجرام (جمل قصيرة، بدون حشو).

قواعد منهجية ثابتة يجب اتباعها دائمًا:
1. عدم القياس على رمز شبيه: أي رمز (طائر/حشرة/شجرة/حيوان) يُفسَّر بناءً على صفاته وسلوكه الحقيقي هو نفسه، وليس بمقارنته برمز مشابه في الشكل.
2. ترتيب الرجوع للمصادر عند التفسير: ابن سيرين، ثم النابلسي، ثم كتاب البدر المنير في علم التعبير للرموز الأقل شهرة.
3. لو الرمز غير موجود في المصادر الثلاثة، لا تخترع تفسيرًا ولا تقيسه على غيره - قل بوضوح إنه غير موثق واطلب من الرائي مزيدًا من التفاصيل.
4. فراسة المعبِّر (الأهم): قبل تفسير أي رؤيا قد يختلف تفسيرها باختلاف حال الرائي، يجب أن تسأل أولاً (سؤال واحد أو اثنين مختصرين) عن:
   أ) الحالة الاجتماعية (أعزب/متجوز/مطلق...)
   ب) بيئته أو بلده، فقط لو الرمز مرتبط بعادة أو عرف ثقافي معين
   ج) مكانته أو منصبه (صاحب سلطة/منصب مقابل شخص عادي)، لأن هذا يحدد نطاق التفسير: شخصي/عائلي مقابل عام يشمل جماعة أو بلدًا كاملاً.
   لا تنتقل للتفسير النهائي إلا بعد الحصول على الإجابات الضرورية.

تنسيق الرد لما تقدّم تفسيرًا نهائيًا:
- افتح بجملة قصيرة ودودة.
- اذكر الرموز الأساسية في الرؤيا كل رمز في سطر مختصر جدًا (الرمز - تفسيره في كلمات قليلة).
- اختم بفقرة "التفسير الكلي" قصيرة (2-3 أسطر بحد أقصى).
- لا تستخدم رموز ماركداون مثل # أو **، اكتب نص عادي.
- لا تُطِل، الرسالة يجب أن تُقرأ بسهولة على شاشة موبايل.

لو الرسالة مجرد تحية أو سؤال عام مش رؤيا، رد بشكل طبيعي ودود بدون فرض منهجية التفسير.`;

// ذاكرة محادثة بسيطة لكل مستخدم (في الذاكرة - تُمسح عند إعادة تشغيل السيرفر)
// لتطبيق حقيقي كبير، يُفضّل استبدالها بقاعدة بيانات (مثل Redis أو SQLite)
const userHistories = new Map();

function getHistory(chatId) {
  if (!userHistories.has(chatId)) userHistories.set(chatId, []);
  return userHistories.get(chatId);
}

async function askClaude(chatId, userText) {
  const history = getHistory(chatId);
  history.push({ role: 'user', content: userText });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: history,
    }),
  });

  const data = await response.json();

  if (data.error) {
    console.error('Anthropic API error:', data.error);
    return 'معلش حصل خطأ في الاتصال، جرب تاني بعد شوية.';
  }

  const reply = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  history.push({ role: 'assistant', content: reply });

  // نحافظ على آخر 20 رسالة بس عشان الأداء والتكلفة
  if (history.length > 20) history.splice(0, history.length - 20);

  return reply || 'معلش مقدرتش أفهم، ممكن تعيد رؤياك؟';
}

// ---- أوامر البوت ----
bot.start((ctx) => {
  userHistories.delete(ctx.chat.id);
  ctx.reply(
    'السلام عليكم ورحمة الله وبركاته 🌙\nأنا في خدمتك، احكيلي رؤياك بالتفصيل وهفسرهالك إن شاء الله.'
  );
});

bot.command('جديد', (ctx) => {
  userHistories.delete(ctx.chat.id);
  ctx.reply('تمام، ابدأ من جديد. احكيلي رؤياك.');
});

// أي رسالة نصية تُرسل للتفسير
bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  await ctx.sendChatAction('typing');
  try {
    const reply = await askClaude(chatId, ctx.message.text);
    await ctx.reply(reply);
  } catch (err) {
    console.error(err);
    await ctx.reply('حصل خطأ غير متوقع، جرب تبعت تاني.');
  }
});

bot.launch();
console.log('البوت شغال دلوقتي...');

// إيقاف نظيف
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
