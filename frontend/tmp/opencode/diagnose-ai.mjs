const advisorService = await import('/src/services/advisor.service.js');
try {
  const result = await advisorService.recommend({ budget: 50000, usage: 'gaming' });
  console.log('AI_RESULT', JSON.stringify(result));
} catch (error) {
  console.error('AI_ERROR', error);
}
