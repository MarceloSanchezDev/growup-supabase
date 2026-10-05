export const roles = {
  OWNER: "owner",
  SELLER: "seller",
  VIEWER: "viewer",
};

export const permissions = {
  [roles.OWNER]: ["events:read", "events:write", "payments:write", "catalog:write", "reports:read", "team:write"],
  [roles.SELLER]: ["events:read", "events:write", "payments:write"],
  [roles.VIEWER]: ["events:read", "reports:read"],
};

export function can(role, permission) {
  return permissions[role]?.includes(permission) ?? false;
}
