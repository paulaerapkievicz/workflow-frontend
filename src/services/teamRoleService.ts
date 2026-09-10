import api from "@/src/services/api";

/** Cargo configurável da equipe (tag tipo "Administrador", "Gerente", "RH"…). */
export interface TeamRole {
  id: string;
  name: string;
  position: number;
}

/**
 * A lista é do próprio perfil logado (supermercado → sua rede; agência → seus líderes).
 * A agência passa `supermarketId` de um cliente para gerenciar a lista daquele supermercado.
 */
type Scope = { supermarketId?: string };

const params = (s?: Scope) => (s?.supermarketId ? { params: { supermarketId: s.supermarketId } } : undefined);

export const getTeamRoles = async (scope?: Scope): Promise<TeamRole[]> =>
  (await api.get("/team-roles", params(scope))).data;

export const createTeamRole = async (name: string, scope?: Scope): Promise<TeamRole> =>
  (await api.post("/team-roles", { name, ...(scope?.supermarketId ? { supermarketId: scope.supermarketId } : {}) })).data;

export const updateTeamRole = async (
  id: string,
  patch: { name?: string; position?: number },
  scope?: Scope
): Promise<TeamRole> =>
  (await api.put(`/team-roles/${id}`, { ...patch, ...(scope?.supermarketId ? { supermarketId: scope.supermarketId } : {}) })).data;

export const deleteTeamRole = async (id: string, scope?: Scope): Promise<void> => {
  await api.delete(`/team-roles/${id}`, params(scope));
};
