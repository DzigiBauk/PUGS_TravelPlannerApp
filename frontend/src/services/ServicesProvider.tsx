import type { PropsWithChildren } from 'react';
import type { AppServices } from './appServices';
import { ServicesContext } from './ServicesContext';

interface ServicesProviderProps extends PropsWithChildren {
  services: AppServices;
}

export function ServicesProvider({ services, children }: ServicesProviderProps) {
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
