import { describe, expect, it } from 'vitest';
import { authorizeAdminRequest, isAdminPubliclyOpen } from './adminAuth.js';

describe('admin public access', () => {
  it('allows an empty token only outside production', () => {
    expect(isAdminPubliclyOpen('', false)).toBe(true);
    expect(isAdminPubliclyOpen('', true)).toBe(false);
  });

  it('never treats a configured token as publicly open', () => {
    expect(isAdminPubliclyOpen('secret', false)).toBe(false);
    expect(isAdminPubliclyOpen('secret', true)).toBe(false);
  });
});

describe('admin authorization', () => {
  it('allows unauthenticated admin in local/demo when ADMIN_TOKEN is empty', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: '',
        isProduction: false,
        providedToken: undefined,
      }),
    ).toBe(true);
  });

  it('locks admin in production when ADMIN_TOKEN is empty', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: '',
        isProduction: true,
        providedToken: undefined,
      }),
    ).toBe(false);
  });

  it('does not accept a guessed token when production has no ADMIN_TOKEN', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: '',
        isProduction: true,
        providedToken: 'anything',
      }),
    ).toBe(false);
  });

  it('accepts the configured token via header value', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: 'ops-secret',
        isProduction: true,
        providedToken: 'ops-secret',
      }),
    ).toBe(true);
  });

  it('rejects a missing token when ADMIN_TOKEN is set', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: 'ops-secret',
        isProduction: false,
        providedToken: undefined,
      }),
    ).toBe(false);
  });

  it('rejects a wrong token', () => {
    expect(
      authorizeAdminRequest({
        expectedToken: 'ops-secret',
        isProduction: true,
        providedToken: 'nope',
      }),
    ).toBe(false);
  });
});
