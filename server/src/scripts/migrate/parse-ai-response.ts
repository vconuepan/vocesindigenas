import type { ParsedAiResponse } from './types.js';

/**
 * Parse the old ai_response text field into structured fields.
 *
 * The format is consistently:
 *   Article summary: ...
 *   Conservative rating: N
 *   Reasons
 *   - ...
 *   Speculative rating: N
 *   Scenarios
 *   - ...
 *   Relevance summary: ...
 *   Relevance title: ...
 */
export function parseAiResponse(raw: string): ParsedAiResponse {
  const result: ParsedAiResponse = {
    summary: null,
    conservativeRating: null,
    speculativeRating: null,
    reasons: null,
    scenarios: null,
    relevanceSummary: null,
    relevanceTitle: null,
  };

  if (!raw || raw.trim() === '') return result;

  // Article summary
  const summaryMatch = raw.match(
    /Article summary:\s*([\s\S]*?)(?=\n\s*Conservative rating:|$)/i,
  );
  if (summaryMatch) {
    result.summary = summaryMatch[1].trim();
  }

  // Conservative rating
  const conservativeMatch = raw.match(/Conservative rating:\s*(\d+)/i);
  if (conservativeMatch) {
    result.conservativeRating = parseInt(conservativeMatch[1], 10);
  }

  // Speculative rating
  const speculativeMatch = raw.match(/Speculative rating:\s*(\d+)/i);
  if (speculativeMatch) {
    result.speculativeRating = parseInt(speculativeMatch[1], 10);
  }

  // Reasons section (between "Reasons" and "Speculative rating")
  const reasonsMatch = raw.match(
    /Reasons\s*\n([\s\S]*?)(?=\n\s*Speculative rating:|$)/i,
  );
  if (reasonsMatch) {
    result.reasons = reasonsMatch[1].trim();
  }

  // Scenarios section (between "Scenarios" and "Relevance summary")
  const scenariosMatch = raw.match(
    /Scenarios\s*\n([\s\S]*?)(?=\n\s*Relevance summary:|$)/i,
  );
  if (scenariosMatch) {
    result.scenarios = scenariosMatch[1].trim();
  }

  // Relevance summary
  const relSummaryMatch = raw.match(
    /Relevance summary:\s*([\s\S]*?)(?=\n\s*Relevance title:|$)/i,
  );
  if (relSummaryMatch) {
    result.relevanceSummary = relSummaryMatch[1].trim();
  }

  // Relevance title
  const relTitleMatch = raw.match(/Relevance title:\s*([\s\S]*?)$/i);
  if (relTitleMatch) {
    result.relevanceTitle = relTitleMatch[1].trim();
  }

  return result;
}
