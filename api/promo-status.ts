export const config = {
  runtime: 'edge',
};

export default function handler(request: Request) {
  const promoEnabled = process.env.PROMO_ENABLED !== 'false';
  
  return new Response(
    JSON.stringify({ enabled: promoEnabled }),
    {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    }
  );
}
