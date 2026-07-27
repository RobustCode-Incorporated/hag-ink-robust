import { describe, expect, it } from 'vitest';
import { managementMenuByRole, managementRoleFromPath } from './management-navigation';

describe('managementRoleFromPath', () => {
  it('detects CEO area from root and /ceo paths', () => {
    expect(managementRoleFromPath('/')).toBe('CEO');
    expect(managementRoleFromPath('/ceo')).toBe('CEO');
    expect(managementRoleFromPath('/ceo/products')).toBe('CEO');
  });

  it('detects manager area from /manager paths', () => {
    expect(managementRoleFromPath('/manager')).toBe('MANAGER');
    expect(managementRoleFromPath('/manager/depenses')).toBe('MANAGER');
  });

  it('returns null for non-management routes', () => {
    expect(managementRoleFromPath('/login')).toBeNull();
    expect(managementRoleFromPath('/client')).toBeNull();
    expect(managementRoleFromPath(undefined)).toBeNull();
  });
});

describe('managementMenuByRole', () => {
  it('returns only CEO routes for CEO role', () => {
    const ceoMenu = managementMenuByRole('CEO');
    expect(ceoMenu.length).toBeGreaterThan(0);
    expect(ceoMenu.every((item) => item.href.startsWith('/ceo'))).toBe(true);
    expect(ceoMenu.some((item) => item.href === '/ceo/robust')).toBe(true);
  });

  it('returns only manager routes for manager role', () => {
    const managerMenu = managementMenuByRole('MANAGER');
    expect(managerMenu.length).toBeGreaterThan(0);
    expect(managerMenu.every((item) => item.href.startsWith('/manager'))).toBe(true);
    expect(managerMenu.some((item) => item.href === '/manager/robust')).toBe(true);
  });
});