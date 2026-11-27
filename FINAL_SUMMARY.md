# AI Advisor Fix Summary

## Problem

The AI Assistant failed or timed out because the advisor called a MongoDB Atlas inference endpoint that does not exist. That call returned HTTP 404 on every request. The Gemini fallback used `gemini-3.8-flash`, which was slow or returned 503 during high demand. The frontend cancelled the request after 30 seconds, so users saw a failure even when the backend eventually returned a result.

## What changed

- Removed the dead MongoDB Atlas call.
- Gemini is the only AI provider.
- The advisor tries `gemini-3.5-flash`, then `gemini-3.6-flash`, then `gemini-3.8-flash`.
- Each model attempt has a 20 second timeout. The advisor stops after 50 seconds and falls back to the catalog.
- Gemini is called over the REST API with the key in the `x-goog-api-key` header, so the key never appears in a URL or log.
- The response schema uses a flat array of `{ category, productId }` entries. The earlier object schema let the model pack several categories into one string.
- A repair step also accepts the old object shape and splits packed strings such as `<id> RAM: <id> GPU: <id>`.
- Responses use JSON mode and a response schema.
- The server validates every AI response:
  - product IDs must exist in the candidate list;
  - category keys must match the product category;
  - the total must stay within the budget;
  - required categories must be present;
  - the parts must pass the compatibility check.
- If the AI fails or returns an invalid selection, the advisor builds a recommendation from the catalog instead.
- If the budget is below the cheapest complete build, the advisor returns a partial build with `minimumBudget`, `shortfall`, `omittedCategories`, and `unavailableCategories`.
- The frontend now waits 60 seconds for the advisor, distinguishes a timeout from an offline error, shows a retry button, and labels catalog-based results.
- Removed hardcoded API keys from the test scripts and this report.

## Current behavior

- A complete budget returns an AI-assisted build when the provider responds, or a catalog-based build when it does not.
- A low budget returns a partial build and explains the minimum budget needed.
- A missing in-stock category returns a partial build and names the out-of-stock category.
- Provider failures are logged with the model name and the error. Keys are never logged.

## Verification

- `npx vitest run tests/unit/advisor.test.js` passed 21 tests, including the component array format, the packed-string repair, and duplicate or unknown category rejection.
- The full backend test suite passed 61 tests across 9 files.
- Frontend lint passed with no errors or warnings.
- The frontend production build passed.
- Live endpoint, PHP 70,000 gaming budget: HTTP 200 in 32.7 seconds, `source=ai`, `partial=false`, total PHP 66,765, all seven categories, compatible with no warnings. The first model timed out; the second returned a valid selection.
- Live endpoint, PHP 50,000 gaming budget: HTTP 200 in 103 ms, `source=fallback`, `partial=true`, total PHP 48,480, minimum PHP 66,765, shortfall PHP 16,765, missing storage, PSU and case.
- The earlier 504 errors came from the SDK combined with `thinkingConfig: { thinkingLevel: 'LOW' }`. The same request without that option returned in about 6 seconds over REST.

## Security note

The exposed Gemini, DeepInfra, and Atlas keys that were previously written into test files and reports should be rotated in their provider consoles. The application now reads credentials from environment variables only.
