import fs from 'fs';

const API_URL = 'http://localhost:4000/api';
const ADMIN_CREDENTIALS = { email: 'admin@acerosquintana.com', password: '548528-Chester' };
const timestamp = Date.now() + Math.floor(Math.random() * 1000);
const USER_CREDENTIALS = { email: `user${timestamp}@acerosquintana.com`, password: 'user123', name: 'Operario Test', role: 'user' };

const report: any[] = [];

async function request(endpoint: string, method: string, body?: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await res.json();
  report.push({
    endpoint: `${method} ${endpoint}`,
    status: res.status,
    requestBody: body,
    response: data,
  });

  return data;
}

async function runTest() {
  try {
    console.log('1. Admin Login');
    const adminLogin = await request('/auth/login', 'POST', ADMIN_CREDENTIALS);
    const adminToken = adminLogin.data.token;

    console.log('2. Admin crea usuario ordinario');
    await request('/users', 'POST', USER_CREDENTIALS, adminToken);

    console.log('3. User Login');
    const userLogin = await request('/auth/login', 'POST', { email: USER_CREDENTIALS.email, password: USER_CREDENTIALS.password });
    const userToken = userLogin.data.token;

    console.log('4. Admin obtiene unidades');
    const unitsRes = await request('/catalog/units', 'GET', null, adminToken);
    const unitId = unitsRes.data.find((u: any) => u.name === 'Metro')._id;

    console.log('5. Admin crea Categoría');
    const categoryRes = await request('/catalog/categories', 'POST', { name: `Tubos ${timestamp}`, description: 'Tubos' }, adminToken);
    const categoryId = categoryRes.data._id;

    console.log('6. Admin crea Subcategoría');
    const subcategoryRes = await request('/catalog/subcategories', 'POST', { category: categoryId, name: `Tubo Redondo ${timestamp}`, unit: unitId }, adminToken);
    const subcategoryId = subcategoryRes.data._id;

    console.log('7. Admin crea Ítem en el inventario');
    const itemRes = await request('/inventory/items', 'POST', { subcategory: subcategoryId, name: `Tubo 2 pulgadas ${timestamp}`, kind: 'material' }, adminToken);
    const itemId = itemRes.data._id;

    console.log('8. User registra una compra');
    // User does not send price
    await request(`/inventory/items/${itemId}/purchases`, 'POST', { quantity: 100, note: 'Llegaron 100 tubos' }, userToken);

    console.log('9. Admin revisa solicitudes pendientes');
    const pendingRes = await request('/requests', 'GET', null, adminToken);
    const purchaseRequest = pendingRes.data.find((r: any) => r.action === 'purchase');

    console.log('10. Admin aprueba la compra asignando precio total');
    await request(`/requests/${purchaseRequest._id}/approve`, 'POST', { overrides: { totalCost: 5000 } }, adminToken);

    console.log('11. User crea una obra consumiendo inventario');
    await request('/works', 'POST', {
      clientName: 'Juan Perez',
      description: 'Techo de cochera',
      performedAt: new Date().toISOString(),
      items: [{ item: itemId, quantity: 10 }] // Consuming 10 units
    }, userToken);

    console.log('12. Admin revisa solicitudes de obras');
    const pendingWorks = await request('/requests', 'GET', null, adminToken);
    const workRequest = pendingWorks.data.find((r: any) => r.action === 'create' && r.entity === 'work');

    console.log('13. Admin aprueba la obra y asigna el precio cobrado al cliente');
    await request(`/requests/${workRequest._id}/approve`, 'POST', { overrides: { chargedPrice: 1200 } }, adminToken);

    console.log('14. User obtiene el inventario (Verificando R3: Sin precios)');
    await request('/inventory/items', 'GET', null, userToken);

    fs.writeFileSync('integration_report.json', JSON.stringify(report, null, 2));
    console.log('Flujo de prueba finalizado con éxito.');

  } catch (error) {
    console.error('Error durante la prueba:', error);
    fs.writeFileSync('integration_report.json', JSON.stringify(report, null, 2));
  }
}

runTest();
