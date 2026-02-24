import { useMemo } from 'react';
import { useLang } from '../contexts/LangContext';
import type { RequestStatus, UserRole, RequestChain, RequestType, UrgencyLevel } from '../types';

/**
 * Returns localized label maps for statuses, roles, chains, types, urgency.
 * Use this in React components instead of the static RU-only exports from utils.ts.
 */
export function useLabels() {
  const { t } = useLang();

  const STATUS_LABELS = useMemo((): Record<RequestStatus, string> => ({
    novaya:             t.status_novaya,
    sklad_review:       t.status_sklad_review,
    sklad_partial:      t.status_sklad_partial,
    nachalnik_review:   t.status_nachalnik_review,
    nachalnik_approved: t.status_nachalnik_approved,
    finansist_review:   t.status_finansist_review,
    finansist_approved: t.status_finansist_approved,
    snab_process:       t.status_snab_process,
    zakupleno:          t.status_zakupleno,
    v_puti:             t.status_v_puti,
    vydano:             t.status_vydano,
    polucheno:          t.status_polucheno,
    otkloneno:          t.status_otkloneno,
  }), [t]);

  const ROLE_LABELS = useMemo((): Record<UserRole, string> => ({
    'prоrab':    t.role_prorab,
    sklad:       t.role_sklad,
    nachalnik:   t.role_nachalnik,
    finansist:   t.role_finansist,
    snab:        t.role_snab,
    admin:       t.role_admin,
  }), [t]);

  const CHAIN_LABELS = useMemo((): Record<RequestChain, string> => ({
    full:            t.chain_full,
    warehouse_only:  t.chain_warehouse_only,
    purchase_only:   t.chain_purchase_only,
    full_finance:    t.chain_full_finance,
    finance_only:    t.chain_finance_only,
  }), [t]);

  const TYPE_LABELS = useMemo((): Record<RequestType, string> => ({
    materials: t.type_materials,
    tools:     t.type_tools,
    equipment: t.type_equipment,
    services:  t.type_services,
    other:     t.type_other,
  }), [t]);

  const URGENCY_LABELS = useMemo((): Record<UrgencyLevel, string> => ({
    low:      t.urgency_low,
    normal:   t.urgency_normal,
    high:     t.urgency_high,
    critical: t.urgency_critical,
  }), [t]);

  return { STATUS_LABELS, ROLE_LABELS, CHAIN_LABELS, TYPE_LABELS, URGENCY_LABELS };
}
