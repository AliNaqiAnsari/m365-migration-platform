import { z } from "zod";

export const connectTenantSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  connectionType: z.enum(["SOURCE", "DESTINATION"]),
  provider: z.enum(["MICROSOFT_365", "GOOGLE_WORKSPACE"]),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  tenantId: z.string().min(1, "Tenant ID is required"),
});

export type ConnectTenantFormData = z.infer<typeof connectTenantSchema>;
