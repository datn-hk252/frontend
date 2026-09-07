export type Role = "ROLE_ADMIN" | "ROLE_USER" | "ROLE_MANAGER" | (string & {});
export type ModalMode = "add" | "edit" | "view";

export type UserLogin = {
  id: number | string;
  name: string;
  email: string;
  role: Role | string;
  roles?: string[];
  lmsRoles?: string[];
  profilePicture?: string;
};

export type User = {
  id: number | string;
  name: string;
  code: string;
  email: string;
  role: Role | string;
  roles?: string[];
  lmsRoles?: string[];
  dateAdded?: string;
  status?: boolean;
  active?: boolean;
  profilePicture?: string;
};
