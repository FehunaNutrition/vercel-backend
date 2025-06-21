import crypto from 'crypto';

// Configurações do Mercado Pago
const MP_CONFIG = {
  // Para sandbox, use o Access Token de test
  ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || 'TEST-4131876402317524-051114-b8749a0bc7e14c962661536fb5363405-1957801625',
  WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET || '417064de8ceeb65b2b30803096f6ec8d556ca9da80eb5132c28c5f9a18469260',
  API_BASE_URL: 'https://api.mercadopago.com'
};

export default async function handler(req, res) {
  // Configurar headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-signature, x-request-id');

  // Tratar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar se é GET (health check)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'Webhook do Mercado Pago ativo',
      timestamp: new Date().toISOString()
    });
  }

  // Processar apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('🔔 Webhook recebido do Mercado Pago');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    // Validar assinatura do webhook
    const isValidSignature = await validateWebhookSignature(req);
    if (!isValidSignature) {
      console.error('❌ Assinatura inválida');
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    // Extrair dados do webhook
    const { type, action, data, date_created } = req.body;

    console.log(`📦 Tipo: ${type}, Ação: ${action}, Data: ${date_created}`);

    // Processar apenas notificações de pagamento
    if (type === 'payment') {
      const paymentId = data?.id;
      
      if (!paymentId) {
        console.error('❌ ID do pagamento não encontrado');
        return res.status(400).json({ error: 'ID do pagamento não encontrado' });
      }

      // Buscar detalhes do pagamento
      const paymentDetails = await getPaymentDetails(paymentId);
      
      if (!paymentDetails) {
        console.error('❌ Não foi possível obter detalhes do pagamento');
        return res.status(400).json({ error: 'Pagamento não encontrado' });
      }

      // Processar o pagamento
      await processPayment(paymentDetails);

      console.log('✅ Webhook processado com sucesso');
      return res.status(200).json({ 
        status: 'success',
        message: 'Webhook processado com sucesso',
        payment_id: paymentId
      });
    }

    // Para outros tipos de notificação, apenas confirmar recebimento
    console.log(`ℹ️ Tipo de notificação não processada: ${type}`);
    return res.status(200).json({ 
      status: 'received',
      message: 'Notificação recebida mas não processada',
      type: type
    });

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}

/**
 * Valida a assinatura do webhook do Mercado Pago
 */
async function validateWebhookSignature(req) {
  try {
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    
    if (!signature || !requestId) {
      console.log('⚠️ Headers de assinatura não encontrados - modo desenvolvimento');
      return true; // Em desenvolvimento, pode pular validação
    }

    // Extrair timestamp e hash da assinatura
    const parts = signature.split(',');
    let ts, v1;
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') v1 = value;
    }

    if (!ts || !v1) {
      console.error('❌ Formato de assinatura inválido');
      return false;
    }

    // Construir payload para validação
    const payload = `id:${req.body.data?.id};request-id:${requestId};ts:${ts};`;
    
    // Gerar hash esperado
    const expectedHash = crypto
      .createHmac('sha256', MP_CONFIG.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    const isValid = expectedHash === v1;
    console.log(`🔐 Validação de assinatura: ${isValid ? 'VÁLIDA' : 'INVÁLIDA'}`);
    
    return isValid;

  } catch (error) {
    console.error('❌ Erro na validação da assinatura:', error);
    return false;
  }
}

/**
 * Busca detalhes do pagamento na API do Mercado Pago
 */
async function getPaymentDetails(paymentId) {
  try {
    console.log(`🔍 Buscando detalhes do pagamento: ${paymentId}`);
    
    const response = await fetch(`${MP_CONFIG.API_BASE_URL}/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MP_CONFIG.ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ Erro ao buscar pagamento: ${response.status} - ${response.statusText}`);
      return null;
    }

    const paymentData = await response.json();
    console.log('📦 Detalhes do pagamento obtidos:', {
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      external_reference: paymentData.external_reference,
      transaction_amount: paymentData.transaction_amount,
      payment_method_id: paymentData.payment_method_id
    });

    return paymentData;

  } catch (error) {
    console.error('❌ Erro ao buscar detalhes do pagamento:', error);
    return null;
  }
}

/**
 * Processa o pagamento recebido
 */
async function processPayment(paymentData) {
  try {
    const {
      id,
      status,
      status_detail,
      external_reference,
      transaction_amount,
      payment_method_id,
      date_created,
      date_approved,
      payer
    } = paymentData;

    console.log(`💰 Processando pagamento: ${id}`);
    console.log(`📊 Status: ${status} (${status_detail})`);
    console.log(`🏷️ Referência: ${external_reference}`);
    console.log(`💵 Valor: R$ ${transaction_amount}`);
    console.log(`💳 Método: ${payment_method_id}`);

    // Aqui você pode implementar sua lógica de negócio
    switch (status) {
      case 'approved':
        await handleApprovedPayment(paymentData);
        break;
      
      case 'pending':
        await handlePendingPayment(paymentData);
        break;
      
      case 'rejected':
        await handleRejectedPayment(paymentData);
        break;
      
      case 'cancelled':
        await handleCancelledPayment(paymentData);
        break;
      
      case 'refunded':
        await handleRefundedPayment(paymentData);
        break;
      
      default:
        console.log(`⚠️ Status não reconhecido: ${status}`);
    }

    // Log para auditoria
    await logPaymentEvent(paymentData);

  } catch (error) {
    console.error('❌ Erro ao processar pagamento:', error);
    throw error;
  }
}

/**
 * Processa pagamento aprovado
 */
async function handleApprovedPayment(paymentData) {
  console.log('✅ Pagamento aprovado - processando...');
  
  // Aqui você pode:
  // 1. Atualizar status do pedido no banco de dados
  // 2. Enviar email de confirmação
  // 3. Liberar produto/serviço
  // 4. Atualizar estoque
  
  // Exemplo de estrutura de dados para salvar:
  const orderUpdate = {
    orderId: paymentData.external_reference,
    paymentId: paymentData.id,
    status: 'paid',
    amount: paymentData.transaction_amount,
    paymentMethod: paymentData.payment_method_id,
    paidAt: paymentData.date_approved,
    updatedAt: new Date().toISOString()
  };
  
  console.log('📝 Dados para atualização do pedido:', orderUpdate);
  
  // TODO: Implementar salvamento no seu banco de dados
  // await updateOrderInDatabase(orderUpdate);
  
  // TODO: Enviar email de confirmação
  // await sendConfirmationEmail(paymentData.payer.email, orderUpdate);
}

/**
 * Processa pagamento pendente
 */
async function handlePendingPayment(paymentData) {
  console.log('⏳ Pagamento pendente - aguardando confirmação...');
  
  // Aqui você pode:
  // 1. Manter status do pedido como "aguardando pagamento"
  // 2. Enviar email informando sobre pendência
  // 3. Configurar retry para verificar status posteriormente
}

/**
 * Processa pagamento rejeitado
 */
async function handleRejectedPayment(paymentData) {
  console.log('❌ Pagamento rejeitado');
  
  // Aqui você pode:
  // 1. Marcar pedido como rejeitado
  // 2. Liberar estoque reservado
  // 3. Enviar email informando sobre rejeição
}

/**
 * Processa pagamento cancelado
 */
async function handleCancelledPayment(paymentData) {
  console.log('🚫 Pagamento cancelado');
  
  // Aqui você pode:
  // 1. Marcar pedido como cancelado
  // 2. Liberar estoque reservado
  // 3. Enviar email de cancelamento
}

/**
 * Processa pagamento reembolsado
 */
async function handleRefundedPayment(paymentData) {
  console.log('💸 Pagamento reembolsado');
  
  // Aqui você pode:
  // 1. Marcar pedido como reembolsado
  // 2. Atualizar estoque se necessário
  // 3. Enviar email de confirmação de reembolso
}

/**
 * Registra evento de pagamento para auditoria
 */
async function logPaymentEvent(paymentData) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: 'webhook_received',
    payment_id: paymentData.id,
    status: paymentData.status,
    external_reference: paymentData.external_reference,
    amount: paymentData.transaction_amount,
    payment_method: paymentData.payment_method_id
  };
  
  console.log('📋 Log do evento:', logEntry);
  
  // TODO: Salvar log no seu sistema de auditoria
  // await saveAuditLog(logEntry);
}