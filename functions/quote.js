export async function onRequest({ request, env }) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    if (!env.SENDGRID_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured. Set SENDGRID_API_KEY in your Pages environment.' }), { status: 500, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), { status: 400, headers });
    }

    const requiredFields = ['name', 'phone', 'email', 'vehicleYear', 'vehicleMake', 'vehicleModel', 'carColor', 'serviceWanted'];
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
    }

    try {
      if (!env.SENDGRID_API_KEY) {
        return new Response(JSON.stringify({ error: 'Email service not configured. Set SENDGRID_API_KEY in your Pages environment.' }), { status: 500, headers });
      }

      let body;
      try {
        body = await request.json();
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), { status: 400, headers });
      }

      const requiredFields = ['name', 'phone', 'email', 'vehicleYear', 'vehicleMake', 'vehicleModel', 'carColor', 'serviceWanted'];
      for (const field of requiredFields) {
        if (!body[field] || String(body[field]).trim().length === 0) {
          return new Response(JSON.stringify({ error: `Missing required field: ${field}.` }), { status: 400, headers });
        }
      }

      const recipient = env.TARGET_EMAIL || 'knockitoutluxurydetail@gmail.com';
      const sender = env.SENDER_EMAIL || 'quotes@knockitoutluxurydetail.com';

      const messageText = `Quote Request Submitted:\n\n` +
        `Name: ${body.name}\n` +
        `Phone: ${body.phone}\n` +
        `Email: ${body.email}\n` +
        `Vehicle Year: ${body.vehicleYear}\n` +
        `Vehicle Make: ${body.vehicleMake}\n` +
        `Vehicle Model: ${body.vehicleModel}\n` +
        `Vehicle Color: ${body.carColor ? body.carColor : 'Unknown'}\n` +
        `Service Wanted: ${body.serviceWanted}\n` +
        `Extra Notes: ${body.extraNotes ? body.extraNotes : 'None'}\n`;

      const sendgridPayload = {
        personalizations: [
          {
            to: [{ email: recipient }],
            subject: `New Quote Request from ${body.name}`,
          },
        ],
        from: {
          email: sender,
          name: 'Knock-It-Out Luxury Detail',
        },
        reply_to: {
          email: body.email,
          name: body.name,
        },
        content: [
          {
            type: 'text/plain',
            value: messageText,
          },
        ],
      };

      let sendResp;
      try {
        sendResp = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sendgridPayload),
        });
      } catch (networkErr) {
        return new Response(JSON.stringify({ error: 'Network error when contacting email provider.', details: String(networkErr) }), { status: 502, headers });
      }

      if (!sendResp.ok) {
        const details = await sendResp.text();
        return new Response(JSON.stringify({ error: 'Failed to send email.', details }), { status: 502, headers });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    } catch (err) {
      console.error('Quote function error:', err);
      return new Response(JSON.stringify({ error: 'Server error', details: String(err) }), { status: 500, headers });
    }
  }