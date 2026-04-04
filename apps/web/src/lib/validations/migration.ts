import { z } from "zod";

export const createMigrationSchema = z.object({
  name: z.string().min(1, "Migration name is required"),
  description: z.string().optional(),
  sourceTenantId: z.string().min(1, "Source tenant is required"),
  destTenantId: z.string().min(1, "Destination tenant is required"),
  workloads: z.array(z.string()).min(1, "Select at least one workload"),
  options: z
    .object({
      concurrentTasks: z.number().min(1).max(50).optional(),
      batchSize: z.number().min(1).max(1000).optional(),
      skipExisting: z.boolean().optional(),
      includePermissions: z.boolean().optional(),
      includeVersionHistory: z.boolean().optional(),
      deltaSync: z.boolean().optional(),
    })
    .optional(),
});

export type CreateMigrationFormData = z.infer<typeof createMigrationSchema>;
