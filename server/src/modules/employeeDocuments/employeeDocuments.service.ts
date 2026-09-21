import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { computeStatus } from "@/services/expiration";
import { getExpirationRules } from "@/services/settingsStore";
import type { z } from "zod";
import type { createEmployeeDocumentSchema, updateEmployeeDocumentSchema } from "@/modules/employeeDocuments/employeeDocuments.schemas";

type CreateInput = z.infer<typeof createEmployeeDocumentSchema>;
type UpdateInput = z.infer<typeof updateEmployeeDocumentSchema>;

async function assertEmployeeExists(employeeId: string) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null } });
  if (!employee) throw ApiError.notFound("Employee not found");
}

export async function list(employeeId: string) {
  await assertEmployeeExists(employeeId);
  const rules = await getExpirationRules();
  const docs = await prisma.employeeDocument.findMany({
    where: { employeeId, deletedAt: null },
    orderBy: { expiryDate: "asc" },
  });
  return docs.map((doc) => ({ ...doc, status: computeStatus(doc.expiryDate, rules) }));
}

export async function getById(employeeId: string, id: string) {
  const doc = await prisma.employeeDocument.findFirst({ where: { id, employeeId, deletedAt: null } });
  if (!doc) throw ApiError.notFound("Document not found");
  const rules = await getExpirationRules();
  return { ...doc, status: computeStatus(doc.expiryDate, rules) };
}

export async function create(employeeId: string, input: CreateInput) {
  await assertEmployeeExists(employeeId);
  const doc = await prisma.employeeDocument.create({ data: { ...input, employeeId } });
  const rules = await getExpirationRules();
  return { ...doc, status: computeStatus(doc.expiryDate, rules) };
}

export async function update(employeeId: string, id: string, input: UpdateInput) {
  await getById(employeeId, id);
  const doc = await prisma.employeeDocument.update({ where: { id }, data: input });
  const rules = await getExpirationRules();
  return { ...doc, status: computeStatus(doc.expiryDate, rules) };
}

export async function remove(employeeId: string, id: string) {
  await getById(employeeId, id);
  await prisma.employeeDocument.update({ where: { id }, data: { deletedAt: new Date() } });
}
