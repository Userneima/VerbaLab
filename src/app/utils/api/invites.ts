import { z } from 'zod';
import {
  BASE_URL,
  authHeaders,
  getValidAccessToken,
  mapFetchFailureToMessage,
  maybeRefreshAndRetry,
  parseErrorResponse,
} from './client';

const inviteItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  note: z.string().nullable().optional(),
  batch_note: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  assigned_at: z.string().nullable().optional(),
  used_by: z.string().nullable().optional(),
  used_by_email: z.string().nullable().optional(),
  created_at: z.string(),
  used_at: z.string().nullable().optional(),
});

const inviteListSchema = z.object({
  invites: z.array(inviteItemSchema).default([]),
  totalAvailable: z.number().int().nonnegative().default(0),
  totalAssigned: z.number().int().nonnegative().default(0),
  totalUnused: z.number().int().nonnegative().default(0),
  totalUsed: z.number().int().nonnegative().default(0),
});

const inviteGenerateSchema = z.object({
  invites: z.array(inviteItemSchema).default([]),
  generatedCount: z.number().int().nonnegative().default(0),
});

export type InviteItem = z.infer<typeof inviteItemSchema>;
export type InviteListResult = z.infer<typeof inviteListSchema>;
export type InviteGenerateResult = z.infer<typeof inviteGenerateSchema>;
export type InviteAssignmentResult = {
  invite: InviteItem;
};
export type InviteBatchAssignmentResult = {
  invites: InviteItem[];
};

export function parseInviteListResult(raw: unknown): InviteListResult {
  return inviteListSchema.parse(raw);
}

export function parseInviteGenerateResult(raw: unknown): InviteGenerateResult {
  return inviteGenerateSchema.parse(raw);
}

export function parseInviteBatchAssignmentResult(raw: unknown): InviteBatchAssignmentResult {
  return {
    invites: z.array(inviteItemSchema).parse((raw as { invites?: unknown })?.invites ?? []),
  };
}

export async function getInviteInventory(limit = 40): Promise<InviteListResult> {
  const token = await getValidAccessToken();

  const doLoad = async (t: string): Promise<InviteListResult> => {
    let resp: Response;
    try {
      const url = new URL(`${BASE_URL}/invites`);
      url.searchParams.set('limit', String(limit));
      resp = await fetch(url.toString(), {
        headers: authHeaders(t),
      });
    } catch (e) {
      throw mapFetchFailureToMessage(e);
    }
    if (!resp.ok) {
      const detail = await parseErrorResponse(resp);
      if (resp.status === 401) {
        return maybeRefreshAndRetry(doLoad, detail, 1);
      }
      throw new Error(detail || 'Failed to load invites');
    }
    const json: unknown = await resp.json();
    return parseInviteListResult(json);
  };

  return doLoad(token);
}

export async function generateInvites(payload: {
  count: number;
  note?: string;
}): Promise<InviteGenerateResult> {
  const token = await getValidAccessToken();

  const doGenerate = async (t: string): Promise<InviteGenerateResult> => {
    let resp: Response;
    try {
      resp = await fetch(`${BASE_URL}/invites/generate`, {
        method: 'POST',
        headers: authHeaders(t),
        body: JSON.stringify(payload),
      });
    } catch (e) {
      throw mapFetchFailureToMessage(e);
    }
    if (!resp.ok) {
      const detail = await parseErrorResponse(resp);
      if (resp.status === 401) {
        return maybeRefreshAndRetry(doGenerate, detail, 1);
      }
      throw new Error(detail || 'Failed to generate invites');
    }
    const json: unknown = await resp.json();
    return parseInviteGenerateResult(json);
  };

  return doGenerate(token);
}

export async function updateInviteAssignment(payload: {
  inviteId: string;
  assignedTo?: string | null;
}): Promise<InviteAssignmentResult> {
  const token = await getValidAccessToken();

  const doUpdate = async (t: string): Promise<InviteAssignmentResult> => {
    let resp: Response;
    try {
      resp = await fetch(`${BASE_URL}/invites/${payload.inviteId}/assignment`, {
        method: 'POST',
        headers: authHeaders(t),
        body: JSON.stringify({
          assignedTo: payload.assignedTo ?? null,
        }),
      });
    } catch (e) {
      throw mapFetchFailureToMessage(e);
    }
    if (!resp.ok) {
      const detail = await parseErrorResponse(resp);
      if (resp.status === 401) {
        return maybeRefreshAndRetry(doUpdate, detail, 1);
      }
      throw new Error(detail || 'Failed to update invite assignment');
    }
    const json: unknown = await resp.json();
    return {
      invite: inviteItemSchema.parse((json as { invite?: unknown })?.invite),
    };
  };

  return doUpdate(token);
}

export async function updateInviteAssignmentsBatch(payload: {
  inviteIds: string[];
  assignedTo: string;
}): Promise<InviteBatchAssignmentResult> {
  const token = await getValidAccessToken();

  const doUpdate = async (t: string): Promise<InviteBatchAssignmentResult> => {
    let resp: Response;
    try {
      resp = await fetch(`${BASE_URL}/invites/assignments`, {
        method: 'POST',
        headers: authHeaders(t),
        body: JSON.stringify({
          inviteIds: payload.inviteIds,
          assignedTo: payload.assignedTo,
        }),
      });
    } catch (e) {
      throw mapFetchFailureToMessage(e);
    }
    if (!resp.ok) {
      const detail = await parseErrorResponse(resp);
      if (resp.status === 401) {
        return maybeRefreshAndRetry(doUpdate, detail, 1);
      }
      throw new Error(detail || 'Failed to update invite assignments');
    }
    const json: unknown = await resp.json();
    return parseInviteBatchAssignmentResult(json);
  };

  return doUpdate(token);
}
