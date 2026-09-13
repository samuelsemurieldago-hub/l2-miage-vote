import { createContext, useContext, useState, type ReactNode } from 'react';

interface VoteSessionValue {
  // Held only in memory for the duration of the vote flow (never in the
  // URL, never persisted) — validated once on the code entry step, then
  // sent again to the submit_vote RPC at confirmation time.
  code: string | null;
  setCode: (code: string | null) => void;
  voteCompleted: boolean;
  setVoteCompleted: (v: boolean) => void;
}

const VoteSessionContext = createContext<VoteSessionValue | undefined>(undefined);

export function VoteSessionProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<string | null>(null);
  const [voteCompleted, setVoteCompleted] = useState(false);

  return (
    <VoteSessionContext.Provider value={{ code, setCode, voteCompleted, setVoteCompleted }}>
      {children}
    </VoteSessionContext.Provider>
  );
}

export function useVoteSession() {
  const ctx = useContext(VoteSessionContext);
  if (!ctx) throw new Error('useVoteSession must be used within VoteSessionProvider');
  return ctx;
}
