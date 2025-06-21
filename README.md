# Backend Vercel - Webhook Mercado Pago

Este é o backend serverless para processar webhooks do Mercado Pago.

## 🚀 URL do Webhook
```
https://vercel-backend-lovat-five.vercel.app/api/webhook
```

## 🔧 Configuração

### 1. Variáveis de Ambiente no Vercel

Configure as seguintes variáveis no painel do Vercel:

```bash
MP_ACCESS_TOKEN=TEST-4131876402317524-051114-b8749a0bc7e14c962661536fb5363405-1957801625
MP_WEBHOOK_SECRET=417064de8ceeb65b2b30803096f6ec8d556ca9da80eb5132c28c5f9a18469260
```

### 2. Configuração do Webhook no Mercado Pago

1. Acesse o [painel do desenvolvedor](https://www.mercadopago.com.br/developers/panel)
2. Vá em **Webhooks** na sua aplicação
3. Configure a URL: `https://vercel-backend-lovat-five.vercel.app/api/webhook`
4. Selecione os eventos: **Payments**
5. Salve a configuração

## 📋 Funcionalidades

### ✅ Implementado
- ✅ Validação de assinatura do webhook
- ✅ Busca de detalhes do pagamento na API do MP
- ✅ Processamento de diferentes status de pagamento
- ✅ Logs detalhados para debugging
- ✅ Tratamento de erros robusto
- ✅ CORS configurado
- ✅ Health check (GET request)

### 🔄 Status de Pagamento Suportados
- **approved**: Pagamento aprovado
- **pending**: Pagamento pendente
- **rejected**: Pagamento rejeitado
- **cancelled**: Pagamento cancelado
- **refunded**: Pagamento reembolsado

## 🧪 Testando o Webhook

### Health Check
```bash
curl https://vercel-backend-lovat-five.vercel.app/api/webhook
```

### Teste Manual (Desenvolvimento)
```bash
curl -X POST https://vercel-backend-lovat-five.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "action": "payment.updated",
    "data": {
      "id": "123456789"
    },
    "date_created": "2025-06-21T10:00:00Z"
  }'
```

## 📦 Estrutura do Projeto

```
vercel-backend/
├── api/
│   └── webhook.js          # Função principal do webhook
├── package.json            # Dependências
├── vercel.json            # Configuração do Vercel
└── README.md              # Este arquivo
```

## 🔍 Logs e Debugging

O webhook gera logs detalhados que você pode ver no painel do Vercel:

- 🔔 Webhook recebido
- 🔐 Validação de assinatura
- 📦 Detalhes do pagamento
- ✅ Processamento concluído
- ❌ Erros (se houver)

## 🚨 Próximos Passos

Para completar a integração, você precisa implementar:

1. **Banco de Dados**: Conectar com Firebase/MongoDB para salvar pedidos
2. **Email Service**: Enviar confirmações por email
3. **Gestão de Estoque**: Atualizar produtos após pagamento
4. **Auditoria**: Sistema de logs persistentes

## 💡 Dicas de Segurança

- ✅ Sempre validar assinatura do webhook
- ✅ Usar HTTPS apenas
- ✅ Configurar variáveis de ambiente seguras
- ✅ Implementar rate limiting se necessário
- ✅ Logs não devem expor dados sensíveis

## 📞 Suporte

Se você encontrar problemas:

1. Verifique os logs no painel do Vercel
2. Confirme se as variáveis de ambiente estão configuradas
3. Teste o health check do webhook
4. Verifique se a URL está correta no painel do MP