export const OPERATIONAL_FIELD_WIDTH = {
  short: 180,
  normal: 220,
  long: 260,
  search: 280
} as const;

export const operationalFieldSx = {
  short: { minWidth: OPERATIONAL_FIELD_WIDTH.short },
  normal: { minWidth: OPERATIONAL_FIELD_WIDTH.normal },
  long: { minWidth: OPERATIONAL_FIELD_WIDTH.long },
  search: { minWidth: OPERATIONAL_FIELD_WIDTH.search, width: OPERATIONAL_FIELD_WIDTH.search, flex: '0 0 auto' }
} as const;
