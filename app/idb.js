// idb.js — salva le foto caricate sul telefono (IndexedDB), così non vanno ricaricate ogni volta.
const NOME = 'dicetidice-studio';
let dbp;

function db() {
  if (!dbp) {
    dbp = new Promise((ok, ko) => {
      const r = indexedDB.open(NOME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('foto');
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ko(r.error);
    });
  }
  return dbp;
}

async function tx(mode, fn) {
  try {
    const d = await db();
    return await new Promise((ok, ko) => {
      const t = d.transaction('foto', mode);
      const req = fn(t.objectStore('foto'));
      t.oncomplete = () => ok(req?.result);
      t.onerror = () => ko(t.error);
    });
  } catch { return undefined; } // IndexedDB non disponibile (es. navigazione privata): l'app funziona comunque
}

export const fotoSalva = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
export const fotoLeggi = (id) => tx('readonly', (s) => s.get(id));
export const fotoElimina = (id) => tx('readwrite', (s) => s.delete(id));
export const fotoSvuota = () => tx('readwrite', (s) => s.clear());
