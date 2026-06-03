import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OpponentDTO } from '@shared/protocol';
import type { Spectrum } from '@shared/types';

/** Opponent plus client-only render state (KO animation trigger). */
export interface OpponentView extends OpponentDTO {
  koSeq: number;
}

export interface OpponentsState {
  byId: Record<string, OpponentView>;
  ids: string[];
  placementOrder: string[]; // elimination order: first eliminated first, survivors appended at game over
}

const initialState: OpponentsState = { byId: {}, ids: [], placementOrder: [] };

const opponentsSlice = createSlice({
  name: 'opponents',
  initialState,
  reducers: {
    // Replace the roster but PRESERVE spectrum + koSeq (room:state carries no spectrum).
    setOpponents(s, a: PayloadAction<OpponentDTO[]>) {
      const next: Record<string, OpponentView> = {};
      const ids: string[] = [];
      for (const o of a.payload) {
        const prev = s.byId[o.id];
        next[o.id] = {
          ...o,
          spectrum: prev ? prev.spectrum : o.spectrum,
          koSeq: prev ? prev.koSeq : 0,
        };
        ids.push(o.id);
      }
      s.byId = next;
      s.ids = ids;
    },
    // Upsert — creates the entry if missing (fixes the room:state/spectrum:update race).
    spectrumUpdate(s, a: PayloadAction<{ id: string; name: string; spectrum: Spectrum }>) {
      const { id, name, spectrum } = a.payload;
      const prev = s.byId[id];
      s.byId[id] = {
        id,
        name,
        alive: prev ? prev.alive : true,
        spectrum,
        koSeq: prev ? prev.koSeq : 0,
      };
      if (!s.ids.includes(id)) s.ids.push(id);
    },
    opponentGameOver(s, a: PayloadAction<{ id: string }>) {
      const o = s.byId[a.payload.id];
      if (o && o.alive) {
        o.alive = false;
        o.koSeq += 1; // triggers the KO crumble + stamp
        if (!s.placementOrder.includes(a.payload.id)) s.placementOrder.push(a.payload.id);
      }
    },
    opponentLeft(s, a: PayloadAction<{ id: string }>) {
      delete s.byId[a.payload.id];
      s.ids = s.ids.filter((i) => i !== a.payload.id);
    },
    clearOpponents() {
      return initialState;
    },
  },
});

export const opponentsActions = opponentsSlice.actions;
export default opponentsSlice.reducer;
