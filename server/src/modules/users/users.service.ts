import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { ApiError } from "@/utils/apiError";
import { paginationMeta, skipTake } from "@/utils/pagination";
import { issueEmailVerification } from "@/modules/auth/auth.service";
import type { z } from "zod";
import type { createUserSchema, listUsersQuerySchema, updateUserSchema } from "@/modules/users/users.schemas";

type CreateInput = z.infer<typeof createUserSchema>;
type UpdateInput = z.infer<typeof updateUserSchema>;
type ListQuery = z.infer<typeof listUsersQuerySchema>;

const selectSafe = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  isActive: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  userRoles: { include: { role: { select: { id: true, name: true } } } },
} satisfies Prisma.UserSelect;

function serialize(user: Prisma.UserGetPayload<{ select: typeof selectSafe }>) {
  const { userRoles, ...rest } = user;
  return { ...rest, roles: userRoles.map((ur) => ur.role) };
}

export async function list(query: ListQuery) {
  const { page, pageSize, sortBy, sortDir, q, isActive, roleId } = query;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(isActive !== undefined ? { isActive } : {}),
    ...(roleId ? { userRoles: { some: { roleId } } } : {}),
    ...(q
      ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
      : {}),
  };

  const orderBy = sortBy ? { [sortBy]: sortDir } : { createdAt: "desc" as const };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy, ...skipTake(page, pageSize), select: selectSafe }),
    prisma.user.count({ where }),
  ]);

  return { data: rows.map(serialize), meta: paginationMeta(page, pageSize, total) };
}

export async function getById(id: string) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: selectSafe });
  if (!user) throw ApiError.notFound("User not found");
  return serialize(user);
}

export async function create(input: CreateInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.badRequest("An account with this email already exists.");

  const roles = await prisma.role.findMany({ where: { id: { in: input.roleIds } } });
  if (roles.length !== input.roleIds.length) throw ApiError.badRequest("One or more roles are invalid.");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      passwordHash,
      userRoles: { create: input.roleIds.map((roleId) => ({ roleId })) },
    },
    select: selectSafe,
  });

  await issueEmailVerification(user.id, user.email, user.fullName);
  return serialize(user);
}

export async function update(id: string, input: UpdateInput) {
  await getById(id);

  if (input.roleIds) {
    const roles = await prisma.role.findMany({ where: { id: { in: input.roleIds } } });
    if (roles.length !== input.roleIds.length) throw ApiError.badRequest("One or more roles are invalid.");
  }

  const user = await prisma.$transaction(async (tx) => {
    if (input.roleIds) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.createMany({ data: input.roleIds.map((roleId) => ({ userId: id, roleId })) });
    }
    return tx.user.update({
      where: { id },
      data: { fullName: input.fullName, phone: input.phone, isActive: input.isActive },
      select: selectSafe,
    });
  });

  return serialize(user);
}

export async function softDelete(id: string, requestingUserId: string) {
  if (id === requestingUserId) throw ApiError.badRequest("You cannot delete your own account.");
  await getById(id);
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } }),
    prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}
