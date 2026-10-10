// The sellable modules. HR is not listed: every company always has it.
export enum AppModuleName {
  WMS = 'wms',
  STORE = 'store',
  RESTAURANT = 'restaurant',
}

export const ALL_APP_MODULES = Object.values(AppModuleName);
