import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { checkPermission, type RbacAction } from '../rbac';

/**
 * React hook that exposes `can(action)` based on the current logged-in user's role.
 *
 * @example
 *   const { can } = usePermission();
 *   {can('view:financial') && <span>{req.estimatedCost}</span>}
 */
export function usePermission() {
  const { currentUser } = useAuth();

  const can = useMemo(
    () => (action: RbacAction) => checkPermission(currentUser?.role, action),
    [currentUser?.role],
  );

  /** True when the user can see financial columns / blocks */
  const canViewFinancial = useMemo(
    () => checkPermission(currentUser?.role, 'view:financial'),
    [currentUser?.role],
  );

  /** True when the user should only see their OWN requests */
  const ownRequestsOnly = useMemo(
    () => !checkPermission(currentUser?.role, 'view:all_requests'),
    [currentUser?.role],
  );

  return { can, canViewFinancial, ownRequestsOnly, role: currentUser?.role };
}
