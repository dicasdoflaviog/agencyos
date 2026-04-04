import { NextResponse } from 'next/server'

export async function GET() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'Agency OS API',
      version: '1.0.0',
      description: 'API pública da plataforma Agency OS para integração com sistemas externos.',
    },
    servers: [{ url: '/api/v1', description: 'Production' }],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key gerada em Configurações > API Keys',
        },
      },
    },
    paths: {
      '/clients': {
        get: {
          summary: 'Lista clientes',
          description: 'Retorna os clientes da workspace autenticada.',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': { description: 'Lista de clientes', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array' }, total: { type: 'integer' } } } } } },
            '401': { description: 'API key inválida ou ausente' },
          },
        },
      },
      '/jobs': {
        get: {
          summary: 'Lista jobs',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': { description: 'Lista de jobs' },
            '401': { description: 'Unauthorized' },
          },
        },
        post: {
          summary: 'Cria um job',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['client_id', 'title'],
                  properties: {
                    client_id: { type: 'string', format: 'uuid' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Job criado' },
            '400': { description: 'Campos inválidos' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/agents/run': {
        post: {
          summary: 'Aciona um agente',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agent_id', 'prompt'],
                  properties: {
                    agent_id: { type: 'string' },
                    prompt: { type: 'string' },
                    client_id: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Saída do agente', content: { 'application/json': { schema: { type: 'object', properties: { output_id: { type: 'string' }, content: { type: 'string' } } } } } },
            '401': { description: 'Unauthorized' },
          },
        },
      },
    },
  }

  return NextResponse.json(spec)
}
