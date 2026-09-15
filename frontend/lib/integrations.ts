import api from "./api";

export type IntegrationCatalogItem = {
  provider: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  auth_type: string;
  connected: boolean;
};

export type IntegrationCatalog = {
  items: IntegrationCatalogItem[];
};

export type UserIntegration = {
  id: string;
  provider: string;
  status: string;
  account_email: string | null;
  account_name: string | null;
  scopes: string | null;
  created_at: string;
  updated_at: string;
};

export const getCatalog = async (): Promise<IntegrationCatalog> => {
  const res = await api.get("/api/integrations/catalog");
  return res.data;
};

export const getUserIntegrations = async (): Promise<UserIntegration[]> => {
  const res = await api.get("/api/integrations");
  return res.data;
};

export const getConnectUrl = async (provider: string): Promise<string> => {
  const res = await api.get(`/api/integrations/${provider}/connect`);
  return res.data.url;
};

export const disconnectIntegration = async (provider: string): Promise<void> => {
  await api.delete(`/api/integrations/${provider}`, {
    transformResponse: [(data) => data],
  });
};