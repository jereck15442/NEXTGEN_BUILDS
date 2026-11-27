require('dotenv').config();

// The advisor no longer calls this endpoint. Kept for manual diagnosis only.
async function testAtlas() {
  const key = process.env.MONGODB_AI_KEY;
  const projectId = process.env.MONGODB_ATLAS_PROJECT_ID;

  if (!key || !projectId) {
    console.log('MONGODB_AI_KEY or MONGODB_ATLAS_PROJECT_ID is not set. The advisor does not use this provider.');
    return;
  }

  try {
    const response = await fetch(
      `https://api.mongodb.com/data/v1/atlas-projects/${projectId}/ai:compute`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'anthropic.claude-3-5-sonnet-20240620-v1',
          messages: [{ role: 'user', content: 'Test: just say "Atlas AI is working"' }],
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(20000)
      }
    );

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response text:', text.slice(0, 100));

    if (!response.ok) {
      console.log('Atlas AI returned an error. The advisor does not depend on this endpoint.');
    }
  } catch (err) {
    console.error('Atlas AI test failed:', err.message);
    process.exitCode = 1;
  }
}

testAtlas();
