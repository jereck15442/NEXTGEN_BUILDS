const base = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const email = process.env.TEST_EMAIL || 'admin@example.com';
const password = process.env.TEST_PASSWORD || 'Admin123!';

async function main() {
  const loginResponse = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const login = await loginResponse.json();

  if (!loginResponse.ok || !login.token) {
    console.error('Login failed:', loginResponse.status, login.message || 'No token returned');
    process.exitCode = 1;
    return;
  }

  const started = Date.now();
  const advisorResponse = await fetch(`${base}/advisor/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${login.token}`
    },
    body: JSON.stringify({ budget: 50000, usage: 'gaming' })
  });
  const advisor = await advisorResponse.json();

  console.log('Advisor status:', advisorResponse.status, `(${Date.now() - started} ms)`);
  if (!advisorResponse.ok) {
    console.error('Advisor message:', advisor.message || advisor);
    process.exitCode = 1;
    return;
  }

  console.log('Source:', advisor.source);
  console.log('Partial:', advisor.partial);
  console.log('Estimated total:', advisor.estimatedPrice);
  console.log('Minimum budget:', advisor.minimumBudget);
  console.log('Components:', Object.keys(advisor.components || {}).join(', ') || 'none');
}

main().catch((err) => {
  console.error('Smoke test failed:', err.message);
  process.exitCode = 1;
});
