import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'certachain_portal_state_v1';

const defaultState = {
  activeRole: 'institution',
  profiles: {
    institution: {
      institutionName: '',
      institutionType: '',
      country: '',
      contactEmail: '',
      issuingOfficer: '',
      walletAddress: ''
    },
    student: {
      fullName: '',
      email: '',
      school: '',
      courseTrack: '',
      graduationYear: '',
      walletAddress: ''
    },
    employer: {
      companyName: '',
      contactName: '',
      workEmail: '',
      industry: '',
      hiringGoal: '',
      walletAddress: ''
    }
  }
};

const PortalContext = createContext(null);

const readState = () => {
  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw);
    return {
      activeRole: parsed.activeRole || defaultState.activeRole,
      profiles: {
        institution: { ...defaultState.profiles.institution, ...(parsed.profiles?.institution || {}) },
        student: { ...defaultState.profiles.student, ...(parsed.profiles?.student || {}) },
        employer: { ...defaultState.profiles.employer, ...(parsed.profiles?.employer || {}) }
      }
    };
  } catch {
    return defaultState;
  }
};

const requiredFields = {
  institution: ['institutionName', 'contactEmail', 'walletAddress'],
  student: ['fullName', 'email'],
  employer: ['companyName', 'contactName', 'workEmail']
};

export function PortalProvider({ children }) {
  const [state, setState] = useState(readState);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const value = useMemo(() => ({
    state,
    activeRole: state.activeRole,
    profiles: state.profiles,
    setActiveRole: (role) => {
      setState((current) => ({ ...current, activeRole: role }));
    },
    updateProfile: (role, updates) => {
      setState((current) => ({
        ...current,
        activeRole: role,
        profiles: {
          ...current.profiles,
          [role]: {
            ...current.profiles[role],
            ...updates
          }
        }
      }));
    },
    getProfile: (role) => state.profiles[role] || defaultState.profiles[role],
    isComplete: (role) => requiredFields[role].every((field) => {
      const valueForField = state.profiles[role]?.[field];
      return typeof valueForField === 'string' ? valueForField.trim().length > 0 : Boolean(valueForField);
    })
  }), [state]);

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used inside PortalProvider');
  }
  return context;
}
