/* Cloudflare Worker: принимает данные о записи с сайта NAILBLAACK
   и пересылает уведомление в Telegram. Токен бота и chat_id хранятся
   как секреты воркера (env.BOT_TOKEN, env.CHAT_ID), а не в коде. */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    let booking;
    try {
      booking = await request.json();
    } catch (e) {
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
    }

    const text = formatBookingMessage(booking);

    const tgResponse = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text, parse_mode: 'HTML' }),
    });

    if (!tgResponse.ok) {
      return new Response('Failed to notify Telegram', { status: 502, headers: corsHeaders });
    }

    return new Response('OK', { headers: corsHeaders });
  },
};

function formatBookingMessage(b) {
  if (b.type === 'conflict') {
    return (
      `⚠️ <b>Клиент не смог записаться — время занято</b>\n` +
      `Хотел(а): ${escapeHtml(b.masterName)} — ${escapeHtml(b.serviceName)}\n` +
      `Желаемое время: ${escapeHtml(b.date)} в ${escapeHtml(b.time)}\n` +
      `Клиент: ${escapeHtml(b.name)}\n` +
      `Телефон: ${escapeHtml(b.phone)}\n` +
      `Свяжитесь с клиентом (звонок/WhatsApp), чтобы предложить другое время.`
    );
  }
  return (
    `💅 <b>Новая запись NAILBLAACK</b>\n` +
    `Мастер: ${escapeHtml(b.masterName)}\n` +
    `Услуга: ${escapeHtml(b.serviceName)} (${escapeHtml(b.price)} ₸)\n` +
    `Дата: ${escapeHtml(b.date)} в ${escapeHtml(b.time)}\n` +
    `Клиент: ${escapeHtml(b.name)}\n` +
    `Телефон: ${escapeHtml(b.phone)}`
  );
}

function escapeHtml(value) {
  return String(value).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}
