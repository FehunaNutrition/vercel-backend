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
    console.log('💳 Criando pagamento com cartão via backend...');
    
    const { formData, orderData } = req.body;
    
    if (!formData || !orderData) {
      return res.status(400).json({ error: 'Dados do formulário e pedido são obrigatórios' });
    }

    // Preparar dados do pagamento com cartão
    const cardData = {
      transaction_amount: parseFloat(orderData.total),
      payment_method_id: formData.payment_method_id || 'visa', // Detectar pela bandeira
      token: formData.token, // Token do cartão (seria gerado pelo SDK no frontend)
      installments: parseInt(formData.installments) || 1,
      payer: {
        email: orderData.cliente.email,
        first_name: orderData.cliente.nome.split(' ')[0],
        last_name: orderData.cliente.nome.split(' ').slice(1).join(' ') || 'Cliente',
        identification: {
          type: 'CPF',
          number: formData.cpf || '00000000000'
        }
      },
      external_reference: orderData.orderId || 'ORDER_' + Date.now(),
      description: `Pedido Fehuna Nutrition - ${orderData.items?.length || 0} item(s)`,
      notification_url: 'https://vercel-backend-lovat-five.vercel.app/api/webhook'
    };

    console.log('📤 Enviando dados de cartão para Mercado Pago:', cardData);

    // Fazer chamada para a API do Mercado Pago
    const response = await fetch(`${MP_CONFIG.API_BASE_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${Date.now()}-${Math.random()}`
      },
      body: JSON.stringify(cardData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erro da API do Mercado Pago:', response.status, errorData);
      throw new Error(`Erro na API do Mercado Pago: ${response.status}`);
    }

    const paymentResponse = await response.json();
    console.log('✅ Pagamento com cartão criado:', paymentResponse.id);

    // Retornar dados formatados
    return res.status(200).json({
      success: paymentResponse.status === 'approved',
      payment_id: paymentResponse.id,
      status: paymentResponse.status,
      payment_method: 'credit_card',
      external_reference: paymentResponse.external_reference,
      transaction_amount: paymentResponse.transaction_amount,
      installments: paymentResponse.installments,
      card_token: paymentResponse.card?.last_four_digits,
      status_detail: paymentResponse.status_detail
    });

  } catch (error) {
    console.error('❌ Erro ao criar pagamento com cartão:', error);
    return res.status(500).json({
      success: false,
      error: `Erro no cartão: ${error.message}`,
      payment_method: 'credit_card',
      status: 'failed'
    });
  }
}
