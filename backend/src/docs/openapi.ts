const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` });
const json = (schema: object) => ({ 'application/json': { schema } });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } };
const page = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
  { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10, maximum: 100 } },
];
const errs = { '400': { description: 'Validation error', content: json(ref('Error')) }, '401': { description: 'Unauthorized', content: json(ref('Error')) } };

export const openApiSpec = {
  openapi: '3.0.3',
  info: { title: 'RBHU Customer & Shipment API', version: '1.0.0', description: 'Customers, shipments, dashboard, AI chat, analytics proxy, announcements. Real-time events: `ws://<host>/ws?token=<JWT>`.' },
  servers: [{ url: '/api' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} } } } },
      CustomerStatus: { type: 'string', enum: ['Active', 'Inactive'] },
      ShipmentStatus: { type: 'string', enum: ['Pending', 'InTransit', 'OutForDelivery', 'Delivered', 'Cancelled'] },
      Customer: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, email: { type: 'string', format: 'email' }, company: { type: 'string' }, status: ref('CustomerStatus'), createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' }, createdBy: { type: 'string', nullable: true }, updatedBy: { type: 'string', nullable: true } } },
      CustomerInput: { type: 'object', required: ['name', 'email', 'company'], properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, company: { type: 'string' }, status: ref('CustomerStatus') } },
      Shipment: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, trackingNumber: { type: 'string' }, customerId: { type: 'string', format: 'uuid' }, origin: { type: 'string' }, destination: { type: 'string' }, status: ref('ShipmentStatus'), createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' }, customer: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, company: { type: 'string' } } } } },
      ShipmentInput: { type: 'object', required: ['customerId', 'origin', 'destination'], properties: { trackingNumber: { type: 'string', description: 'Optional – generated when omitted' }, customerId: { type: 'string', format: 'uuid' }, origin: { type: 'string' }, destination: { type: 'string' }, status: ref('ShipmentStatus') } },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': { post: { tags: ['Auth'], security: [], summary: 'Log in (mock auth mode)', requestBody: { required: true, content: json({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } }) }, responses: { '200': { description: 'JWT + user' }, '401': { description: 'Invalid credentials', content: json(ref('Error')) } } } },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', responses: { '200': { description: 'OK' }, ...errs } } },
    '/dashboard/stats': { get: { tags: ['Dashboard'], summary: 'Totals and shipment status distribution', responses: { '200': { description: 'OK' } } } },
    '/customers': {
      get: { tags: ['Customers'], summary: 'List customers (excludes soft-deleted)', parameters: [...page, { name: 'search', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: ref('CustomerStatus') }], responses: { '200': { description: 'Paged list' } } },
      post: { tags: ['Customers'], summary: 'Create customer', requestBody: { required: true, content: json(ref('CustomerInput')) }, responses: { '201': { description: 'Created', content: json(ref('Customer')) }, '409': { description: 'Email already in use' }, ...errs } },
    },
    '/customers/{id}': {
      get: { tags: ['Customers'], summary: 'Get customer', parameters: [idParam], responses: { '200': { description: 'OK', content: json(ref('Customer')) }, '404': { description: 'Not found' } } },
      put: { tags: ['Customers'], summary: 'Update customer (partial fields allowed)', parameters: [idParam], requestBody: { required: true, content: json(ref('CustomerInput')) }, responses: { '200': { description: 'Updated', content: json(ref('Customer')) }, '404': { description: 'Not found' }, '409': { description: 'Email already in use' } } },
      delete: { tags: ['Customers'], summary: 'Soft delete customer', parameters: [idParam], responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } } },
    },
    '/shipments': {
      get: { tags: ['Shipments'], summary: 'List shipments', parameters: [...page, { name: 'status', in: 'query', schema: ref('ShipmentStatus') }, { name: 'customerId', in: 'query', schema: { type: 'string' } }, { name: 'search', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Paged list' } } },
      post: { tags: ['Shipments'], summary: 'Create shipment', requestBody: { required: true, content: json(ref('ShipmentInput')) }, responses: { '201': { description: 'Created', content: json(ref('Shipment')) }, '409': { description: 'Tracking number exists' }, ...errs } },
    },
    '/shipments/{id}': { get: { tags: ['Shipments'], summary: 'Shipment details incl. status history', parameters: [idParam], responses: { '200': { description: 'OK', content: json(ref('Shipment')) }, '404': { description: 'Not found' } } } },
    '/shipments/{id}/status': { patch: { tags: ['Shipments'], summary: 'Update status – validates lifecycle and broadcasts a WebSocket event', parameters: [idParam], requestBody: { required: true, content: json({ type: 'object', required: ['status'], properties: { status: ref('ShipmentStatus') } }) }, responses: { '200': { description: 'Updated', content: json(ref('Shipment')) }, '400': { description: 'Invalid transition' }, '404': { description: 'Not found' } } } },
    '/chat': { post: { tags: ['AI'], summary: 'Ask the assistant (keeps history per sessionId)', requestBody: { required: true, content: json({ type: 'object', required: ['message'], properties: { sessionId: { type: 'string', format: 'uuid' }, message: { type: 'string', maxLength: 2000 } } }) }, responses: { '200': { description: '{ sessionId, reply, provider }' }, '502': { description: 'AI provider unavailable' }, '429': { description: 'Rate limited' } } } },
    '/chat/{sessionId}': { get: { tags: ['AI'], summary: 'Conversation history', parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': { description: 'OK' } } }, delete: { tags: ['AI'], summary: 'Clear conversation', parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '204': { description: 'Cleared' } } } },
    '/analytics/analyze': { post: { tags: ['Analytics'], summary: 'Upload sales CSV (proxied to Flask service)', parameters: [{ name: 'png', in: 'query', schema: { type: 'boolean' }, description: 'Include base64 PNG exports (Kaleido)' }], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } }, responses: { '200': { description: 'summary + Plotly figures' }, '400': { description: 'Invalid CSV' }, '502': { description: 'Analytics unavailable' } } } },
    '/announcements': { get: { tags: ['SharePoint (bonus)'], summary: 'Mock intranet announcements (SharePoint PoC)', responses: { '200': { description: 'OK' } } } },
    '/health': { get: { tags: ['Ops'], security: [], summary: 'Liveness probe', responses: { '200': { description: 'OK' } } } },
  },
};
