import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  Equipment,
  EquipmentStatus,
  PrismaClient,
  RequestStatus,
  Role,
  User,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Runs the real app against a real Postgres database, because the things
 * that matter here — transactions, rollback and row locks — can't be
 * proven with mocks.
 */
describe('Approve / reject (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let admin: User;
  let employees: User[];
  let adminCookie: string;
  let employeeCookie: string;

  const PASSWORD = 'password123';

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    return cookies[0].split(';')[0];
  }

  async function createEquipment(stockQuantity: number): Promise<Equipment> {
    return prisma.equipment.create({
      data: { name: 'Test Monitor', category: 'Monitor', stockQuantity },
    });
  }

  async function createRequest(
    user: User,
    equipment: Equipment,
    quantity: number,
  ) {
    return prisma.requisition.create({
      data: {
        userId: user.id,
        equipmentId: equipment.id,
        quantity,
        reason: 'e2e',
      },
    });
  }

  const approve = (id: number, cookie = adminCookie) =>
    request(app.getHttpServer())
      .patch(`/api/admin/requests/${id}/approve`)
      .set('Cookie', cookie);

  const reject = (id: number, body: object, cookie = adminCookie) =>
    request(app.getHttpServer())
      .patch(`/api/admin/requests/${id}/reject`)
      .set('Cookie', cookie)
      .send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE audit_logs, requisitions, equipment, users RESTART IDENTITY CASCADE',
    );
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@test.com',
        passwordHash,
        role: Role.ADMIN,
      },
    });
    employees = await Promise.all(
      [1, 2, 3].map((n) =>
        prisma.user.create({
          data: {
            name: `Employee ${n}`,
            email: `e${n}@test.com`,
            passwordHash,
          },
        }),
      ),
    );
    adminCookie = await login('admin@test.com');
    employeeCookie = await login('e1@test.com');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('approve', () => {
    it('sets APPROVED, deducts stock and writes an audit log', async () => {
      const equipment = await createEquipment(10);
      const req = await createRequest(employees[0], equipment, 3);

      const res = await approve(req.id).expect(200);

      expect(res.body).toMatchObject({
        status: 'APPROVED',
        reviewedBy: { id: admin.id },
      });
      const after = await prisma.requisition.findUniqueOrThrow({
        where: { id: req.id },
      });
      expect(after.approvedAt).not.toBeNull();
      expect(
        (
          await prisma.equipment.findUniqueOrThrow({
            where: { id: equipment.id },
          })
        ).stockQuantity,
      ).toBe(7);
      const logs = await prisma.auditLog.findMany({
        where: { requestId: req.id },
      });
      expect(logs).toEqual([
        expect.objectContaining({
          userId: admin.id,
          previousStatus: RequestStatus.PENDING,
          newStatus: RequestStatus.APPROVED,
        }),
      ]);
    });

    it('refuses to approve more than is in stock and changes nothing', async () => {
      const equipment = await createEquipment(2);
      const req = await createRequest(employees[0], equipment, 3);

      const res = await approve(req.id).expect(400);

      expect((res.body as { message: string }).message).toContain(
        'Not enough stock',
      );
      await expectUnchanged(req.id, equipment.id, 2);
    });

    it('refuses to approve INACTIVE equipment', async () => {
      const equipment = await createEquipment(5);
      const req = await createRequest(employees[0], equipment, 1);
      await prisma.equipment.update({
        where: { id: equipment.id },
        data: { status: EquipmentStatus.INACTIVE },
      });

      await approve(req.id).expect(400);
      await expectUnchanged(req.id, equipment.id, 5);
    });

    it('returns 409 when approving twice, and only deducts once', async () => {
      const equipment = await createEquipment(10);
      const req = await createRequest(employees[0], equipment, 4);

      await approve(req.id).expect(200);
      await approve(req.id).expect(409);

      expect(
        (
          await prisma.equipment.findUniqueOrThrow({
            where: { id: equipment.id },
          })
        ).stockQuantity,
      ).toBe(6);
      expect(
        await prisma.auditLog.count({ where: { requestId: req.id } }),
      ).toBe(1);
    });

    it('two simultaneous approvals of the same request: one wins', async () => {
      const equipment = await createEquipment(10);
      const req = await createRequest(employees[0], equipment, 4);

      const statuses = (await Promise.all([approve(req.id), approve(req.id)]))
        .map((r) => r.status)
        .sort();

      expect(statuses).toEqual([200, 409]);
      expect(
        (
          await prisma.equipment.findUniqueOrThrow({
            where: { id: equipment.id },
          })
        ).stockQuantity,
      ).toBe(6);
    });

    it('simultaneous approvals that together exceed stock never go negative', async () => {
      // 3 requests of 2 each, but only 5 in stock: exactly 2 can be approved.
      const equipment = await createEquipment(5);
      const reqs = await Promise.all(
        employees.map((e) => createRequest(e, equipment, 2)),
      );

      const results = await Promise.all(reqs.map((r) => approve(r.id)));

      expect(results.filter((r) => r.status === 200)).toHaveLength(2);
      expect(results.filter((r) => r.status === 400)).toHaveLength(1);
      expect(
        (
          await prisma.equipment.findUniqueOrThrow({
            where: { id: equipment.id },
          })
        ).stockQuantity,
      ).toBe(1);
      expect(await prisma.auditLog.count()).toBe(2);
    });

    it('rolls back status and stock if writing the audit log fails', async () => {
      const equipment = await createEquipment(10);
      const req = await createRequest(employees[0], equipment, 3);
      // Make the last step of the transaction fail at the database level.
      await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION fail_audit() RETURNS trigger AS $$
        BEGIN RAISE EXCEPTION 'simulated audit log failure'; END; $$ LANGUAGE plpgsql`);
      await prisma.$executeRawUnsafe(
        'CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_audit()',
      );

      try {
        await approve(req.id).expect(500);
        // Status update and stock deduction ran before the failure — both undone.
        await expectUnchanged(req.id, equipment.id, 10);
      } finally {
        await prisma.$executeRawUnsafe('DROP TRIGGER fail_audit ON audit_logs');
        await prisma.$executeRawUnsafe('DROP FUNCTION fail_audit()');
      }
    });

    it('an employee edit waits for a concurrent approval and then gets 409', async () => {
      const equipment = await createEquipment(10);
      const req = await createRequest(employees[0], equipment, 2);

      const [approveRes, editRes] = await Promise.all([
        approve(req.id),
        request(app.getHttpServer())
          .patch(`/api/requests/${req.id}`)
          .set('Cookie', employeeCookie)
          .send({ quantity: 5 }),
      ]);

      const after = await prisma.requisition.findUniqueOrThrow({
        where: { id: req.id },
      });
      const stock = (
        await prisma.equipment.findUniqueOrThrow({
          where: { id: equipment.id },
        })
      ).stockQuantity;
      // Whichever ran first, the stock deducted must match the approved quantity.
      expect(approveRes.status).toBe(200);
      expect(stock).toBe(10 - after.quantity);
      if (editRes.status !== 200) expect(editRes.status).toBe(409);
    });

    it('is forbidden for employees', async () => {
      const equipment = await createEquipment(10);
      const req = await createRequest(employees[0], equipment, 1);
      await approve(req.id, employeeCookie).expect(403);
    });

    it('returns 404 for an unknown request', async () => {
      await approve(9999).expect(404);
    });
  });

  describe('reject', () => {
    it('requires a reason', async () => {
      const equipment = await createEquipment(10);
      const req = await createRequest(employees[0], equipment, 1);

      await reject(req.id, {}).expect(400);
      await reject(req.id, { rejectReason: '   ' }).expect(400);
      await expectUnchanged(req.id, equipment.id, 10);
    });

    it('sets REJECTED with the reason, leaves stock alone, writes an audit log', async () => {
      const equipment = await createEquipment(10);
      const req = await createRequest(employees[0], equipment, 3);

      await reject(req.id, {
        rejectReason: 'Budget frozen this quarter',
      }).expect(200);

      const after = await prisma.requisition.findUniqueOrThrow({
        where: { id: req.id },
      });
      expect(after).toMatchObject({
        status: RequestStatus.REJECTED,
        rejectReason: 'Budget frozen this quarter',
        reviewedById: admin.id,
        approvedAt: null,
      });
      expect(
        (
          await prisma.equipment.findUniqueOrThrow({
            where: { id: equipment.id },
          })
        ).stockQuantity,
      ).toBe(10);
      expect(
        await prisma.auditLog.findFirst({ where: { requestId: req.id } }),
      ).toMatchObject({
        previousStatus: RequestStatus.PENDING,
        newStatus: RequestStatus.REJECTED,
      });
    });

    it('cannot reject an already approved request', async () => {
      const equipment = await createEquipment(10);
      const req = await createRequest(employees[0], equipment, 3);
      await approve(req.id).expect(200);

      await reject(req.id, { rejectReason: 'Too late' }).expect(409);
      expect(
        (
          await prisma.equipment.findUniqueOrThrow({
            where: { id: equipment.id },
          })
        ).stockQuantity,
      ).toBe(7);
    });
  });

  it('GET /audit-logs lists status changes with who made them', async () => {
    const equipment = await createEquipment(10);
    const req = await createRequest(employees[0], equipment, 1);
    await approve(req.id).expect(200);

    const res = await request(app.getHttpServer())
      .get(`/api/admin/requests/${req.id}/audit-logs`)
      .set('Cookie', adminCookie)
      .expect(200);

    expect(res.body).toEqual([
      expect.objectContaining({
        previousStatus: 'PENDING',
        newStatus: 'APPROVED',
        user: { id: admin.id, name: 'Admin', role: 'ADMIN' },
      }),
    ]);
  });

  /** The request is still PENDING, stock is as given, and no audit log exists. */
  async function expectUnchanged(
    requestId: number,
    equipmentId: number,
    stock: number,
  ) {
    const req = await prisma.requisition.findUniqueOrThrow({
      where: { id: requestId },
    });
    expect(req.status).toBe(RequestStatus.PENDING);
    expect(req.approvedAt).toBeNull();
    expect(
      (await prisma.equipment.findUniqueOrThrow({ where: { id: equipmentId } }))
        .stockQuantity,
    ).toBe(stock);
    expect(await prisma.auditLog.count({ where: { requestId } })).toBe(0);
  }
});
