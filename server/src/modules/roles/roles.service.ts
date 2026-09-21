import { prisma } from "@/lib/prisma";
import { ApiError } from "@/utils/apiError";
import { ALL_PERMISSION_KEYS, PERMISSIONS } from "@/constants/permissions";
import type { z } from "zod";
import type { createRoleSchema, updateRoleSchema } from "@/modules/roles/roles.schemas";

type CreateInput = z.infer<typeof createRoleSchema>;
type UpdateInput = z.infer<typeof updateRoleSchema>;

const includePermissions = {
  rolePermissions: { include: { permission: true } },
  _count: { select: { userRoles: true } },
} as const;

function serialize(role: {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  rolePermissions: { permission: { key: string } }[];
  _count: { userRoles: number };
}) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    userCount: role._count.userRoles,
    permissionKeys: role.rolePermissions.map((rp) => rp.permission.key),
  };
}

function validatePermissionKeys(keys: string[]) {
  const valid = new Set(ALL_PERMISSION_KEYS);
  const invalid = keys.filter((k) => k !== "*" && !valid.has(k));
  if (invalid.length > 0) throw ApiError.badRequest(`Unknown permission keys: ${invalid.join(", ")}`);
}

export async function list() {
  const roles = await prisma.role.findMany({ include: includePermissions, orderBy: { createdAt: "asc" } });
  return roles.map(serialize);
}

export async function getById(id: string) {
  const role = await prisma.role.findUnique({ where: { id }, include: includePermissions });
  if (!role) throw ApiError.notFound("Role not found");
  return serialize(role);
}

export async function create(input: CreateInput) {
  const existing = await prisma.role.findUnique({ where: { name: input.name } });
  if (existing) throw ApiError.badRequest("A role with this name already exists.");
  validatePermissionKeys(input.permissionKeys);

  const permissions = await prisma.permission.findMany({ where: { key: { in: input.permissionKeys } } });
  const role = await prisma.role.create({
    data: {
      name: input.name,
      description: input.description,
      rolePermissions: { create: permissions.map((p) => ({ permissionId: p.id })) },
    },
    include: includePermissions,
  });
  return serialize(role);
}

export async function update(id: string, input: UpdateInput) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound("Role not found");
  if (role.isSystem && (input.name || input.permissionKeys?.length === 0)) {
    // System roles may have their permission set fine-tuned by a Super Admin,
    // but cannot be renamed or stripped of every permission.
    if (input.name) throw ApiError.forbidden("Built-in roles cannot be renamed.");
  }

  if (input.permissionKeys) validatePermissionKeys(input.permissionKeys);

  const updated = await prisma.$transaction(async (tx) => {
    if (input.permissionKeys) {
      const permissions = await tx.permission.findMany({ where: { key: { in: input.permissionKeys } } });
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      await tx.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: id, permissionId: p.id })) });
    }
    return tx.role.update({
      where: { id },
      data: { name: input.name, description: input.description },
      include: includePermissions,
    });
  });

  return serialize(updated);
}

export async function remove(id: string) {
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { userRoles: true } } } });
  if (!role) throw ApiError.notFound("Role not found");
  if (role.isSystem) throw ApiError.forbidden("Built-in roles cannot be deleted.");
  if (role._count.userRoles > 0) throw ApiError.badRequest("Cannot delete a role that is still assigned to users.");
  await prisma.role.delete({ where: { id } });
}

export function listPermissionCatalogue() {
  return Object.entries(PERMISSIONS).map(([module, actions]) => ({
    module,
    permissions: actions.map((action) => ({ key: `${module}.${action}`, action })),
  }));
}
