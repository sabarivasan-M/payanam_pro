import { create } from 'zustand';
import { secureStorage } from '@/lib/kvStorage';
import { authService } from '@/services/authService';
import type { Profile, Role } from '@/types/models';

const ROLE_KEY = 'payanam.selectedRole.v1';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
  status: Status;
  profile: Profile | null;
  /** Role picked on "Who are you?" — used to guard login/sign-up into the right flow */
  selectedRole: Role | null;
  bootstrap: () => Promise<void>;
  setSelectedRole: (role: Role) => Promise<void>;
  setProfile: (profile: Profile) => void;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  status: 'loading',
  profile: null,
  selectedRole: null,

  async bootstrap() {
    try {
      const [profile, role] = await Promise.all([authService.restore(), secureStorage.get(ROLE_KEY)]);
      set({
        profile,
        status: profile ? 'signedIn' : 'signedOut',
        selectedRole: (profile?.role ?? (role as Role | null)) || null,
      });
    } catch {
      set({ profile: null, status: 'signedOut' });
    }
  },

  async setSelectedRole(role) {
    await secureStorage.set(ROLE_KEY, role);
    set({ selectedRole: role });
  },

  setProfile(profile) {
    set({ profile, status: 'signedIn', selectedRole: profile.role });
    void secureStorage.set(ROLE_KEY, profile.role);
  },

  async signOut() {
    await authService.signOut();
    set({ profile: null, status: 'signedOut' });
  },
}));

/** Convenience: the signed-in profile (screens inside protected groups only) */
export function useProfile(): Profile {
  const profile = useSession((s) => s.profile);
  if (!profile) throw new Error('useProfile must be used inside an authenticated route.');
  return profile;
}

export const useActor = () => {
  const p = useProfile();
  return { id: p.id, role: p.role };
};
