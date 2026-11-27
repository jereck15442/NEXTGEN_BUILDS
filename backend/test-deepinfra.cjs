require('dotenv').config();

async function testDeepInfra() {
  const apiKey = process.env.DEEPINFRA_API_KEY;

  if (!apiKey) {
    console.log('DEEPINFRA_API_KEY is not set. This provider is not used by the advisor.');
    return;
  }

  try {
    const response = await fetch('https://api.deepinfra.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(20000)
    });

    console.log('Status:', response.status);
    if (!response.ok) {
      console.error('DeepInfra returned an error.');
      process.exitCode = 1;
      return;
    }

    const data = await response.json();
    console.log('Available models:', data.results ? data.results.length : 'no results');
    console.log('DeepInfra is working.');
  } catch (err) {
    console.error('DeepInfra test failed:', err.message);
    process.exitCode = 1;
  }
}

testDeepInfra();
