// src/modules/produce/produce.service.ts

import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/error.middleware.js';

export async function createProduce(data: {
  farmerId:     string;
  crop:         string;
  gradeCode:    string;
  weightKg:     number;
  harvestDate:  Date;
  county:       string;
  cooperativeId?: string;
  iotSensorId?:   string;
}) {
  return prisma.produce.create({ data });
}

export async function listProduce(params: {
  county?:  string;
  crop?:    string;
  status?:  string;
  farmerId?: string;
  page:     number;
  pageSize: number;
}) {
  const { county, crop, status, farmerId, page, pageSize } = params;
  const where: any = {};
  if (county)   where.county = county;
  if (crop)     where.crop = crop;
  if (status)   where.status = status;
  if (farmerId) where.farmerId = farmerId;

  const [data, total] = await Promise.all([
    prisma.produce.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { farmer: { select: { phone: true, cooperativeId: true } } },
    }),
    prisma.produce.count({ where }),
  ]);
  return { data, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } };
}

export async function getProduce(id: string) {
  const produce = await prisma.produce.findUnique({
    where: { id },
    include: { farmer: { select: { phone: true } }, transactions: true },
  });
  if (!produce) throw new AppError('not_found', 404, 'Produce listing not found');
  return produce;
}

export async function updateProducePrice(id: string, farmerId: string, pricePerKg: number) {
  const produce = await prisma.produce.findUniqueOrThrow({ where: { id } });
  if (produce.farmerId !== farmerId) throw new AppError('forbidden', 403, 'Not your listing');
  return prisma.produce.update({ where: { id }, data: { pricePerKg } });
}
