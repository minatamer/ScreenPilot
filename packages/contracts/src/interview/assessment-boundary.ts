const sensitiveInferencePattern =
  /\b(?:accent|age|disability|ethnicity|gender|marital status|nationality|pregnancy|protected(?: characteristic| trait)?|race|religion|sexual orientation)\b/iu;

const assessmentPattern =
  /\b(?:culture[ -]?fit|emotion(?:al)?(?: state)?|employab\w*|hireab\w*|personality|rank(?:ed|ing)?|rating|sentiment|score(?:d|s|ing)?|pass[ /-]?fail|english (?:fluency|level|proficiency|rating|score)|language (?:fluency|level|proficiency|rating|score)|fluen(?:cy|t))\b/iu;

const hiringJudgmentPatterns = [
  /\b(?:should|must|ought to|deserves? to|is|are|seems?|appears?)\b[^.!?\n]{0,40}\b(?:be )?(?:hired|rejected|selected|shortlisted|advanced)\b/iu,
  /\b(?:candidate|applicant|they|he|she)\b[^.!?\n]{0,56}\b(?:employable|hireable|suitable|unsuitable|hired|rejected|selected|shortlisted|advanced)\b/iu,
  /\b(?:hire|reject|select|shortlist|advance|move)\b[^.!?\n]{0,40}\b(?:candidate|applicant|them|him|her|forward)\b/iu,
  /\b(?:recommend|recommended|recommending|recommendation|endorse|endorsed|endorsement)\b[^.!?\n]{0,72}\b(?:hire|hiring|reject|rejection|role|position|shortlist|advance|selection|move (?:the candidate|them|him|her) forward)\b/iu,
  /\b(?:hire|hiring|reject|rejection|role|position|shortlist|advance|selection)\b[^.!?\n]{0,72}\b(?:recommend|recommended|recommending|recommendation|endorse|endorsed|endorsement)\b/iu,
  /\b(?:recommend|recommended|recommending|endorse|endorsed)\s+(?:the\s+)?(?:candidate|applicant|them|him|her)\b/iu,
] as const;

function normalizeAssessmentBoundaryText(value: string): string {
  return value.normalize("NFKC").replaceAll(/[‘’]/gu, "'");
}

export function containsUnsupportedAssessmentOrSensitiveInference(
  value: string,
): boolean {
  const normalizedValue = normalizeAssessmentBoundaryText(value);
  return (
    sensitiveInferencePattern.test(normalizedValue) ||
    assessmentPattern.test(normalizedValue) ||
    hiringJudgmentPatterns.some((pattern) => pattern.test(normalizedValue))
  );
}
