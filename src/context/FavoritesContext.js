import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";

// Keeps the set of favourited item ids so every item card can show a filled
// or empty heart without each one calling the server.
const FavoritesContext = createContext({ ids: new Set(), isFavorite: () => false, toggle: async () => {}, refresh: async () => {} });

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(new Set());

  const refresh = useCallback(async () => {
    if (!user) { setIds(new Set()); return; }
    try {
      const d = await api.myFavoriteIds();
      setIds(new Set(d.ids));
    } catch (e) { /* offline: keep what we have */ }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  async function toggle(menuItemId) {
    const had = ids.has(menuItemId);
    // optimistic: flip the heart now, undo if the server says no
    setIds((prev) => { const n = new Set(prev); if (had) n.delete(menuItemId); else n.add(menuItemId); return n; });
    try {
      if (had) await api.removeFavorite(menuItemId); else await api.addFavorite(menuItemId);
    } catch (e) {
      setIds((prev) => { const n = new Set(prev); if (had) n.add(menuItemId); else n.delete(menuItemId); return n; });
    }
  }

  return (
    <FavoritesContext.Provider value={{ ids, isFavorite: (id) => ids.has(id), toggle, refresh }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
