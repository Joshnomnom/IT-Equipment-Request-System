import { RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminRequestsService } from './admin-requests.service';
import { ListRequestsQueryDto } from './dto/list-requests-query.dto';

describe('AdminRequestsService', () => {
  const count = jest.fn();
  const findMany = jest.fn();
  const prisma = {
    requisition: { count, findMany },
    // Run the batched queries as-is; we only care about their arguments.
    $transaction: jest.fn((queries: Promise<unknown>[]) =>
      Promise.all(queries),
    ),
  } as unknown as PrismaService;
  const service = new AdminRequestsService(prisma);

  const query = (q: Partial<ListRequestsQueryDto>) =>
    Object.assign(new ListRequestsQueryDto(), q);

  beforeEach(() => {
    jest.clearAllMocks();
    count.mockResolvedValue(23);
    findMany.mockResolvedValue([]);
  });

  it('pages with skip/take and reports totalPages', async () => {
    const result = await service.findAll(query({ page: 3, limit: 10 }));

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
    expect(result.meta).toEqual({
      page: 3,
      limit: 10,
      total: 23,
      totalPages: 3,
    });
  });

  it('filters by status and searches equipment or requester name', async () => {
    await service.findAll(
      query({ status: RequestStatus.PENDING, search: 'dell' }),
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: RequestStatus.PENDING,
          OR: [
            { equipment: { name: { contains: 'dell', mode: 'insensitive' } } },
            { user: { name: { contains: 'dell', mode: 'insensitive' } } },
          ],
        },
      }),
    );
  });

  it('counts per status ignore the status filter but keep the search', async () => {
    await service.findAll(
      query({ status: RequestStatus.APPROVED, search: 'nida' }),
    );

    const countWheres = count.mock.calls.map(
      ([arg]: [{ where: { status?: RequestStatus } }]) => arg.where,
    );
    for (const s of Object.values(RequestStatus)) {
      expect(countWheres).toContainEqual(
        expect.objectContaining({
          status: s,
          OR: expect.any(Array) as unknown[],
        }),
      );
    }
  });
});
