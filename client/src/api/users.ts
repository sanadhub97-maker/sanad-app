import { createResourceApi } from "@/api/createResourceApi";
import type { AppUser } from "@/types/models";

export interface UserInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  roleIds: string[];
}

export interface UserUpdateInput {
  fullName?: string;
  phone?: string;
  isActive?: boolean;
  roleIds?: string[];
}

export const usersApi = createResourceApi<AppUser, UserInput, UserUpdateInput>("/users");
