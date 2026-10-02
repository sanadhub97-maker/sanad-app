// Regression coverage for the audited security boundaries.
// All database, storage, mail, and external-send operations are mocked.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import pino from 'pino';
import pinoHttp from 'pino-http';

const mocks = vi.hoisted(() => ({
  prisma: {
    file: { findUnique: vi.fn() },
    user: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    role: { findMany: vi.fn() },
    userRole: { deleteMany: vi.fn(), createMany: vi.fn() },
    session: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    auditLog: { create: vi.fn() },
    pushSubscription: { upsert: vi.fn() },
    passwordResetToken: { updateMany: vi.fn(), findUnique: vi.fn() },
    companySettings: { findUnique: vi.fn() },
    employee: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
    notification: { findMany: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  read: vi.fn(),
  auth: { userId: 'limited-user', permissions: new Set(['users.edit']), isSuperAdmin: false },
  getRecentActivity: vi.fn(),
  paymentsReport: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/storage', () => ({ storage: { read: mocks.read } }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/config/env', () => ({ env: { MAX_UPLOAD_SIZE_MB: 15, JWT_REFRESH_EXPIRES_IN: '30d', CLIENT_URL: 'https://example.invalid' }, isProduction: true }));
vi.mock('@/middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!req.headers.authorization) return res.sendStatus(401);
    req.auth = mocks.auth;
    next();
  },
  loadAuthContext: vi.fn(async () => mocks.auth),
}));
vi.mock('@/lib/password', () => ({ hashPassword: vi.fn(async () => 'new-hash'), comparePassword: vi.fn(async () => true) }));
vi.mock('@/lib/jwt', () => ({ signAccessToken: vi.fn(() => 'synthetic-access') }));
vi.mock('@/services/email', () => ({ sendMail: vi.fn() }));
vi.mock('@/services/pdf', () => ({ renderHtmlToPng: vi.fn(), pdfDocumentShell: (opts: any) => opts.bodyHtml }));
vi.mock('@/services/branding', () => ({ getBrandingContext: vi.fn(async () => ({ company: null })), getPrintLogoPng: vi.fn() }));
vi.mock('@/modules/reports/reports.service', () => ({ paymentsReport: mocks.paymentsReport }));

import filesRouter from '@/modules/files/files.routes';
import usersRouter from '@/modules/users/users.routes';
import dashboardRouter from '@/modules/dashboard/dashboard.routes';
import { changePassword, login, logout, refreshSession, resetPassword } from '@/modules/auth/auth.service';
import { buildCsv } from '@/services/excel';
import { subscribe } from '@/services/push';
import { errorHandler } from '@/middleware/errorHandler';
import { employeeProfilePdf } from '@/modules/pdf/templates';
import { createEmployeeSchema } from '@/modules/employees/employees.schemas';
import reportsRouter from '@/modules/reports/reports.routes';
import { LOG_REDACTION, assertPushEndpoint } from '@/lib/security';

function appFor(router: any) {
  const app = express();
  app.use(express.json(), router, errorHandler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.permissions.clear();
  mocks.auth.permissions.add('users.edit');
  mocks.prisma.auditLog.create.mockResolvedValue({});
  mocks.prisma.companySettings.findUnique.mockResolvedValue(null);
  mocks.prisma.user.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.session.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.notification.findMany.mockResolvedValue([]);
  mocks.prisma.$transaction.mockImplementation(async (fn: any) => typeof fn === 'function' ? fn(mocks.prisma) : Promise.all(fn));
  mocks.prisma.$queryRaw.mockResolvedValue([{ id: 'limited-user', passwordHash: 'old-hash', isActive: true, deletedAt: null }]);
});

describe('Security regressions', () => {
  it('rejects unauthenticated access to company documents before reading storage', async () => {
    mocks.prisma.file.findUnique.mockResolvedValue({ id: 'private-document', storedName: 'stored.pdf', module: 'company-document', mimeType: 'application/pdf', originalName: 'document.pdf' });
    mocks.read.mockResolvedValue(Buffer.from('synthetic-confidential-document'));
    const res = await request(appFor(filesRouter)).get('/public/private-document');
    expect(res.status).toBe(403);
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it('rejects an employee download without view permissions', async () => {
    mocks.prisma.file.findUnique.mockResolvedValue({ id: 'employee-passport', storedName: 'passport.pdf', module: 'employee', mimeType: 'application/pdf', originalName: 'passport.pdf' });
    mocks.read.mockResolvedValue(Buffer.from('synthetic-passport'));
    const res = await request(appFor(filesRouter)).get('/employee-passport/download').set('Authorization', 'Bearer synthetic');
    expect(res.status).toBe(403);
    expect(mocks.auth.permissions.has('files.view')).toBe(false);
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it('does not query or expose unauthorized dashboard data', async () => {
    const res = await request(appFor(dashboardRouter)).get('/recent-activity').set('Authorization', 'Bearer synthetic');
    expect(res.status).toBe(200);
    expect(res.body.data.recentEmployees).toEqual([]);
    expect(res.body.data.recentPayments).toEqual([]);
    expect(res.body.data.recentActivities).toEqual([]);
    expect(mocks.prisma.employee.findMany).not.toHaveBeenCalled();
    expect(mocks.prisma.payment.findMany).not.toHaveBeenCalled();
  });

  it('rejects self promotion to Super Admin', async () => {
    const user = { id: 'limited-user', userRoles: [] };
    mocks.prisma.user.findFirst.mockResolvedValue(user);
    mocks.prisma.role.findMany.mockResolvedValue([{ id: 'super-role', name: 'Super Admin' }]);
    mocks.prisma.user.update.mockResolvedValue(user);
    const res = await request(appFor(usersRouter)).put('/limited-user').set('Authorization', 'Bearer synthetic').send({ roleIds: ['super-role'] });
    expect(res.status).toBe(403);
    expect(mocks.prisma.userRole.createMany).not.toHaveBeenCalled();
  });

  it('revokes all existing sessions when a password is changed', async () => {
    mocks.prisma.user.findUniqueOrThrow.mockResolvedValue({ passwordHash: 'old-hash' });
    await changePassword('limited-user', 'old-password', 'NewPassword123');
    expect(mocks.prisma.user.updateMany).toHaveBeenCalled();
    expect(mocks.prisma.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'limited-user', revokedAt: null } }));
  });

  it('cannot issue a session using a password changed during login', async () => {
    mocks.prisma.user.findFirst.mockResolvedValue({ id: 'limited-user', isActive: true, passwordHash: 'old-hash' });
    mocks.prisma.$queryRaw.mockResolvedValue([{ id: 'limited-user', isActive: true, deletedAt: null, passwordHash: 'concurrently-new-hash' }]);
    await expect(login({ email: 'synthetic@example.invalid', password: 'OldPassword12345', rememberMe: false }, {})).rejects.toThrow('Password changed');
    expect(mocks.prisma.session.create).not.toHaveBeenCalled();
  });

  it('cannot refresh a session after concurrent account deactivation', async () => {
    mocks.prisma.session.findUnique.mockResolvedValue({ id: 'session', userId: 'limited-user', revokedAt: null, expiresAt: new Date(Date.now() + 60000) });
    mocks.prisma.$queryRaw.mockResolvedValue([{ id: 'limited-user', isActive: false, deletedAt: null }]);
    await expect(refreshSession('synthetic-refresh', {})).rejects.toThrow();
    expect(mocks.prisma.session.create).not.toHaveBeenCalled();
  });

  it('allows a password reset token to change the password only once', async () => {
    mocks.prisma.passwordResetToken.findUnique.mockResolvedValue({ id: 'reset', userId: 'limited-user', usedAt: null, expiresAt: new Date(Date.now() + 60000) });
    let used = false;
    mocks.prisma.passwordResetToken.updateMany.mockImplementation(async ({ where }: any) => {
      if (where.id !== 'reset') return { count: 0 };
      if (used) return { count: 0 }; used = true; return { count: 1 };
    });
    const results = await Promise.allSettled([resetPassword('synthetic-reset', 'NewPassword12345'), resetPassword('synthetic-reset', 'OtherPassword12345')]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(mocks.prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('allows only one successor for concurrent use of a refresh token', async () => {
    mocks.prisma.session.findUnique.mockImplementation(async () => ({ id: 'session', userId: 'limited-user', revokedAt: null, expiresAt: new Date(Date.now() + 60000) }));
    let claimed = false;
    mocks.prisma.session.updateMany.mockImplementation(async () => { if (claimed) return { count: 0 }; claimed = true; return { count: 1 }; });
    mocks.prisma.session.create.mockResolvedValue({ id: 'successor' });
    const results = await Promise.allSettled([refreshSession('synthetic-refresh', {}), refreshSession('synthetic-refresh', {})]);
    expect(results).toHaveLength(2);
    expect(mocks.prisma.session.create).toHaveBeenCalledTimes(1);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });

  it('revokes refresh successors when logging out with a rotated token', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    mocks.prisma.session.findUnique.mockResolvedValue({ id: 'rotated', userId: 'limited-user', familyId: 'synthetic-family', createdAt, revokedAt: new Date() });
    await logout('synthetic-old-refresh');
    expect(mocks.prisma.session.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'limited-user', familyId: 'synthetic-family', revokedAt: null } }));
  });

  it('preserves the original login boundary when rotating a refresh token', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    mocks.prisma.session.findUnique.mockResolvedValue({ id: 'session', userId: 'limited-user', familyId: 'synthetic-family', createdAt, revokedAt: null, expiresAt: new Date(Date.now() + 60000) });
    mocks.prisma.session.create.mockResolvedValue({ id: 'successor' });
    await refreshSession('synthetic-refresh', {});
    expect(mocks.prisma.session.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ createdAt, familyId: 'synthetic-family' }) }));
  });

  it('neutralizes spreadsheet formulas in CSV output', () => {
    const csv = buildCsv([{ key: 'name', header: 'Name', title: 'Name' } as any], [{ name: '=1+1' }]);
    expect(csv.split('\n')[1]).toBe("'=1+1");
  });

  it('rejects loopback and spoofed push provider addresses', async () => {
    await expect(subscribe('limited-user', { endpoint: 'https://127.0.0.1:8443/internal', keys: { p256dh: 'synthetic-key', auth: 'synthetic-auth' } }, 'app')).rejects.toThrow();
    expect(() => assertPushEndpoint('https://fcm.googleapis.com.attacker.test/send')).toThrow();
    expect(() => assertPushEndpoint('https://fcm.googleapis.com:8443/send')).toThrow();
    expect(mocks.prisma.pushSubscription.upsert).not.toHaveBeenCalled();
  });

  it('renders markup in employee names as text', () => {
    const payload = '<script>globalThis.auditMarker=1</script>';
    expect(createEmployeeSchema.parse({ fullNameAr: payload }).fullNameAr).toBe(payload);
    const html = employeeProfilePdf({ employeeNumber: 'synthetic', fullNameAr: payload, documents: [] } as any, { company: null, logoDataUrl: null });
    expect(html).not.toContain(payload);
    expect(html).toContain('&lt;script&gt;');
  });

  it('rejects CSV exports without reports.export', async () => {
    mocks.auth.permissions.add('reports.view');
    mocks.paymentsReport.mockResolvedValue([]);
    const res = await request(appFor(reportsRouter)).get('/payments?format=csv').set('Authorization', 'Bearer synthetic');
    expect(mocks.auth.permissions.has('reports.export')).toBe(false);
    expect(res.status).toBe(403);
    expect(mocks.paymentsReport).not.toHaveBeenCalled();
  });

  it('redacts bearer and refresh cookie values from logs', async () => {
    let output = '';
    const logger = pino({ level: 'info', redact: LOG_REDACTION }, { write: (chunk: string) => { output += chunk; } });
    const app = express();
    app.use(pinoHttp({ logger }));
    app.get('/', (_req, res) => res.json({ ok: true }));
    await request(app).get('/').set('Authorization', 'Bearer synthetic-sensitive-access').set('Cookie', 'refresh_token=synthetic-sensitive-refresh');
    expect(output).not.toContain('synthetic-sensitive-access');
    expect(output).not.toContain('synthetic-sensitive-refresh');
    expect(output).toContain('[REDACTED]');
  });
});
