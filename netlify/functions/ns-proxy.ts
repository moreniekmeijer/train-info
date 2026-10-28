import type { Handler, HandlerEvent } from '@netlify/functions';

const NS_BASE = 'https://gateway.apiportal.ns.nl/reisinformatie-api/api';

const handler: Handler = async (event: HandlerEvent) => {
  const apiKey = process.env.NS_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'NS_API_KEY is niet geconfigureerd op de server.' }),
    };
  }

  const path = event.queryStringParameters?.path ?? '';
  const params = { ...event.queryStringParameters };
  delete params['path'];

  const queryString = new URLSearchParams(params).toString();
  const url = `${NS_BASE}/${path}${queryString ? '?' + queryString : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        Accept: 'application/json',
      },
    });

    const text = await response.text();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
      body: text,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: String(err) }),
    };
  }
};

export { handler };
