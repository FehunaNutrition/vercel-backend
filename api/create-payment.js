import crypto from 'crypto';

// Configurações do Mercado Pago
const MP_CONFIG = {
  ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || 'APP_USR-4131876402317524-051114-b8749a0bc7e14c962661536fb5363405-1957801625',
  API_BASE_URL: 'https://api.mercadopago.com'
};

export default async function handler(req, res) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Tratar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('🚀 Criando pagamento PIX via backend...');
    
    const { orderData } = req.body;
    
    if (!orderData) {
      return res.status(400).json({ error: 'Dados do pedido são obrigatórios' });
    }

    // Preparar dados do pagamento PIX
    const pixData = {
      transaction_amount: parseFloat(orderData.total),
      payment_method_id: 'pix',
      payer: {
        email: orderData.cliente.email,
        first_name: orderData.cliente.nome.split(' ')[0],
        last_name: orderData.cliente.nome.split(' ').slice(1).join(' ') || 'Cliente',
      },
      external_reference: orderData.orderId || 'ORDER_' + Date.now(),
      description: `Pedido Fehuna Nutrition - ${orderData.items?.length || 0} item(s)`,
      notification_url: 'https://vercel-backend-lovat-five.vercel.app/api/webhook'
    };

    console.log('📤 Enviando dados para Mercado Pago:', pixData);

    // Fazer chamada para a API do Mercado Pago
    const response = await fetch(`${MP_CONFIG.API_BASE_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${Date.now()}-${Math.random()}`
      },
      body: JSON.stringify(pixData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erro da API do Mercado Pago:', response.status, errorData);
      throw new Error(`Erro na API do Mercado Pago: ${response.status}`);
    }

    const paymentResponse = await response.json();
    console.log('✅ Pagamento PIX criado:', paymentResponse.id);

    // Retornar dados formatados
    return res.status(200).json({
      success: false, // PIX nunca é aprovado imediatamente
      payment_id: paymentResponse.id,
      status: paymentResponse.status,
      payment_method: 'pix',
      qr_code_base64: paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64,
      qr_code: paymentResponse.point_of_interaction?.transaction_data?.qr_code,
      external_reference: paymentResponse.external_reference,
      expires_at: paymentResponse.date_of_expiration,
      ticket_url: paymentResponse.point_of_interaction?.transaction_data?.ticket_url,
      transaction_amount: paymentResponse.transaction_amount
    });

  } catch (error) {
    console.error('❌ Erro ao criar pagamento PIX:', error);
    return res.status(500).json({
      success: false,
      error: `Erro no PIX: ${error.message}`,
      payment_method: 'pix',
      status: 'failed'
    });
  }
}
