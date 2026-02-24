/**
 * RBAC — Role-Based Access Control
 * Centralised permission matrix for Nirvana Luxury Residence Supply System.
 *
 * Usage (plain function):
 *   import { checkPermission } from '../rbac';
 *   if (checkPermission('prorab', 'view:financial')) { ... }
 *
 * Usage (React hook):
 *   import { usePermission } from '../hooks/usePermission';
 *   const { can } = usePermission();
 *   if (can('view:financial')) { ... }
 */

import type { UserRole, RequestStatus } from './types';

// ─── Action catalogue ─────────────────────────────────────────────────────────
export type RbacAction =
  // ── Read ───────────────────────────────────────────────────────────────────
  | 'view:financial'        // estimatedCost, actualCost, budgetCode, invoice amounts
  | 'view:all_requests'     // see other people's requests (not just own)
  | 'view:warehouse'        // Склад section (stock balances)
  | 'view:analytics'        // Analytics / Dashboard with financial breakdown
  | 'view:object_budgets'   // Budget bars on objects cards
  | 'view:users'            // Users management page
  | 'view:telegram'         // Telegram bot settings page
  // ── Create ─────────────────────────────────────────────────────────────────
  | 'create:request'        // Submit a new request
  | 'create:movement'       // Manual stock correction
  | 'create:purchase_order' // Consolidated PO
  // ── Edit ───────────────────────────────────────────────────────────────────
  | 'edit:request_spec'     // Change item quantities/names before approval
  | 'edit:cost_fields'      // estimatedCost, budgetCode (finansist privilege)
  | 'edit:stock'            // Update /stock documents
  // ── Status transitions ─────────────────────────────────────────────────────
  | 'status:polucheno'      // Confirm receipt (exclusive to prorab for OWN requests)
  | 'status:cancel_own'     // Cancel own request if still novaya
  | 'status:sklad'          // sklad_review → sklad_partial | vydano
  | 'status:nachalnik'      // nachalnik_review → nachalnik_approved | otkloneno
  | 'status:finansist'      // finansist_review → finansist_approved | otkloneno
  | 'status:snab'           // snab_process → zakupleno → v_puti
  | 'status:admin_override' // Skip normal workflow (admin only)
  // ── Files ──────────────────────────────────────────────────────────────────
  | 'attach:files'          // Attach receipts / invoices to request
  | 'download:invoices'     // Download attached invoices
  // ── Admin ──────────────────────────────────────────────────────────────────
  | 'manage:users'          // Create / edit / deactivate users
  | 'manage:telegram'       // /settings/telegram
  | 'delete:request'        // Hard-delete an erroneous request
  | 'split:request'         // Split request into warehouse + purchase parts
  | 'select:for_po';        // Batch-select requests to form Purchase Order

// ─── Permission matrix ────────────────────────────────────────────────────────
const PERMISSIONS: Record<UserRole, ReadonlyArray<RbacAction>> = {
  // Прораб: только свои заявки, без финансов и склада
  'prоrab': [
    'create:request',
    'status:polucheno',
    'status:cancel_own',
  ],

  // Кладовщик: все заявки, склад, без финансов
  'sklad': [
    'view:all_requests',
    'view:warehouse',
    'create:movement',
    'edit:stock',
    'status:sklad',
    'split:request',
  ],

  // Начальник участка: полная аналитика, объекты с бюджетами, редактирование спецификации
  'nachalnik': [
    'view:financial',
    'view:all_requests',
    'view:analytics',
    'view:object_budgets',
    'edit:request_spec',
    'status:nachalnik',
  ],

  // Финансист: финансовые поля, бюджеты, скачивание счетов
  'finansist': [
    'view:financial',
    'view:all_requests',
    'view:analytics',
    'view:object_budgets',
    'edit:cost_fields',
    'status:finansist',
    'attach:files',
    'download:invoices',
  ],

  // Снабженец: закупки + PO, склад (только чтение), без общего бюджета
  'snab': [
    'view:all_requests',
    'view:warehouse',
    'status:snab',
    'attach:files',
    'create:purchase_order',
    'select:for_po',
  ],

  // Администратор: полный доступ
  'admin': [
    'view:financial',
    'view:all_requests',
    'view:warehouse',
    'view:analytics',
    'view:object_budgets',
    'view:users',
    'view:telegram',
    'create:request',
    'create:movement',
    'create:purchase_order',
    'edit:request_spec',
    'edit:cost_fields',
    'edit:stock',
    'status:polucheno',
    'status:cancel_own',
    'status:sklad',
    'status:nachalnik',
    'status:finansist',
    'status:snab',
    'status:admin_override',
    'attach:files',
    'download:invoices',
    'manage:users',
    'manage:telegram',
    'delete:request',
    'split:request',
    'select:for_po',
  ],
};

/**
 * Check if a role has permission to perform an action.
 *
 * @param role    — UserRole of the current user
 * @param action  — RbacAction to check
 * @returns boolean
 *
 * @example
 *   checkPermission('finansist', 'view:financial')  // true
 *   checkPermission('prоrab',    'view:financial')  // false
 */
export function checkPermission(role: UserRole | undefined | null, action: RbacAction): boolean {
  if (!role) return false;
  if (role === 'admin') return true; // admin can always do everything
  return (PERMISSIONS[role] as readonly string[]).includes(action);
}

/**
 * Returns a list of all status transitions available to a given role.
 * Useful for building quick action menus outside of the normal getNextStatuses chain.
 */
export function getAllowedStatusTransitions(role: UserRole): ReadonlyArray<RequestStatus> {
  const map: Partial<Record<RbacAction, RequestStatus[]>> = {
    'status:polucheno':     ['polucheno'],
    'status:cancel_own':    ['otkloneno'],
    'status:sklad':         ['sklad_review', 'sklad_partial', 'vydano'],
    'status:nachalnik':     ['nachalnik_approved', 'otkloneno'],
    'status:finansist':     ['finansist_approved', 'otkloneno'],
    'status:snab':          ['snab_process', 'zakupleno', 'v_puti'],
    'status:admin_override': ['novaya','sklad_review','sklad_partial','nachalnik_review','nachalnik_approved','finansist_review','finansist_approved','snab_process','zakupleno','v_puti','vydano','polucheno','otkloneno'],
  };

  const allowed: RequestStatus[] = [];
  const perms = PERMISSIONS[role] as readonly string[];
  for (const [action, statuses] of Object.entries(map)) {
    if (perms.includes(action)) allowed.push(...(statuses as RequestStatus[]));
  }
  return [...new Set(allowed)];
}

/**
 * Textual description of a role's key limitations — useful for tooltip / debug UI.
 */
export const ROLE_RESTRICTIONS: Partial<Record<UserRole, string[]>> = {
  'prоrab': [
    'Видит только свои заявки',
    'Нет доступа к финансовым полям',
    'Нет доступа к разделу «Склад»',
    'Может только подтверждать получение',
  ],
  'sklad': [
    'Нет доступа к финансовым полям',
    'Не видит аналитику по деньгам',
  ],
  'snab': [
    'Склад — только чтение',
    'Нет доступа к общему бюджету объектов',
  ],
};
