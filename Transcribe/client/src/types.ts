export type UserRole = "ADVISOR" | "REVIEWER";

/** Returned by GET /api/me. Identity and roles come from the session, never from the client. */
export interface UserProfile {
  id: string;
  name: string;
  roles: UserRole[];
  /** Display-only, e.g. "CRD #482910" or "FINRA Series 24". */
  credential?: string;
}
