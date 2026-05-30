import { describe, it, expect } from 'vitest';
import { validateContentManifest, type ContentValidationIssue } from './contentValidation';

describe('validateContentManifest', () => {
  const issues = validateContentManifest();

  // Release gate: shipped content must never have an error-severity issue
  // (missing monster data or an unimplemented pattern). Warnings are allowed —
  // they flag documented-but-not-yet-playable stages.
  it('reports zero error-severity issues for the shipped content', () => {
    const errors = issues.filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('returns well-formed issue records', () => {
    issues.forEach((issue: ContentValidationIssue) => {
      expect(['warning', 'error']).toContain(issue.severity);
      expect(typeof issue.scope).toBe('string');
      expect(issue.scope.length).toBeGreaterThan(0);
      expect(typeof issue.message).toBe('string');
      expect(issue.message.length).toBeGreaterThan(0);
    });
  });
});
