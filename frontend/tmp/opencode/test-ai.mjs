const loginResponse = await fetch('http://localhost:4000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'nextgen.ui.1795661163189@example.com', password: 'TestPass123!' }),
});
const login = await loginResponse.json();
const advisorResponse = await fetch('http://localhost:4000/api/v1/advisor/recommend', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${login.token}`,
  },
  body: JSON.stringify({ budget: 50000, usage: 'gaming' }),
});
const advisorBody = await advisorResponse.text();

console.log('loginStatus', loginResponse.status, 'tokenLength', (login.token || '').length);
console.log('advisorStatus', advisorResponse.status);
console.log('advisorBody', advisorBody);

const healthResponse = await fetch('http://localhost:4000/health');
console.log('healthStatus', healthResponse.status, await healthResponse.text());
