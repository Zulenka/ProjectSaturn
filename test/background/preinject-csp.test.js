import { analyzeCspForInject } from '@/background/utils/preinject-csp';

describe('analyzeCspForInject', () => {
  test('extracts nonce when CSP declares script nonce', () => {
    const res = analyzeCspForInject("default-src 'self'; script-src 'self' 'nonce-abc123' https://cdn.example.com");
    expect(res).toEqual({ nonce: 'abc123' });
  });

  test('forces content realm when script-src disallows unsafe-inline', () => {
    const res = analyzeCspForInject("script-src 'self' https://cdn.example.com");
    expect(res).toEqual({ forceContent: true });
  });

  test('does not force content realm when unsafe-inline is allowed', () => {
    const res = analyzeCspForInject("script-src 'self' 'unsafe-inline'");
    expect(res).toBeUndefined();
  });

  test('falls back to default-src policy when script-src is absent', () => {
    const res = analyzeCspForInject("default-src 'self'");
    expect(res).toEqual({ forceContent: true });
  });

  test('returns undefined when CSP has no script/default source directives', () => {
    const res = analyzeCspForInject("img-src 'self' data:; style-src 'self'");
    expect(res).toBeUndefined();
  });
});
