/* Banco local: IndexedDB do navegador (sem servidor, sem instalação). Se o navegador bloquear (aba anônima, visualizador embutido),
   usa a memória da página: tudo funciona, mas some ao fechar. */
(function (P) {
  var STORES = ['patients', 'exams', 'customTasks', 'users'];
  var DATA = ['patients', 'exams', 'customTasks'];   // entram no backup (contas ficam de fora)
  var mem = { patients: {}, exams: {}, customTasks: {}, users: {} };
  var useMem = false;

  var ready = new Promise(function (resolve) {
    try {
      var req = indexedDB.open('psilog', 2);
      req.onupgradeneeded = function () {
        STORES.forEach(function (s) {
          if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath: 'id' });
        });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { useMem = true; resolve(null); };
      req.onblocked = function () { useMem = true; resolve(null); };
    } catch (e) { useMem = true; resolve(null); }
  });

  function run(store, mode, fn) {
    return ready.then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve, reject) {
        try {
          var tx = db.transaction(store, mode), req = fn(tx.objectStore(store));
          tx.oncomplete = function () { resolve(req ? req.result : undefined); };
          tx.onerror = tx.onabort = function () { reject(tx.error || new Error('Falha ao salvar neste aparelho.')); };
        } catch (e) { reject(e); }
      });
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  var DB = {
    uid: uid,
    all: function (store) {
      return run(store, 'readonly', function (o) { return o.getAll(); }).then(function (r) {
        return useMem ? Object.keys(mem[store]).map(function (k) { return mem[store][k]; }) : r;
      });
    },
    get: function (store, id) {
      return run(store, 'readonly', function (o) { return o.get(id); }).then(function (r) { return useMem ? mem[store][id] : r; });
    },
    put: function (store, item) {
      item.id = item.id || uid();
      item.createdAt = item.createdAt || new Date().toISOString();
      return run(store, 'readwrite', function (o) { return o.put(item); }).then(function () {
        if (useMem) mem[store][item.id] = item;
        return item;
      });
    },
    del: function (store, id) {
      return run(store, 'readwrite', function (o) { return o.delete(id); }).then(function () { if (useMem) delete mem[store][id]; });
    },
    /** Apaga pacientes e exames (e as contas de paciente). Contas de profissional e atividades ficam. */
    clear: async function () {
      for (var s of ['patients', 'exams']) for (var it of await DB.all(s)) await DB.del(s, it.id);
      for (var u of await DB.all('users')) if (u.role === 'paciente') await DB.del('users', u.id);
    },
    /** Exporta tudo (backup). */
    dump: async function () {
      return { app: 'psilog', v: 2, patients: await DB.all('patients'), exams: await DB.all('exams'), customTasks: await DB.all('customTasks') };
    },
    /** Importa um backup gerado por dump(). */
    load: async function (json) {
      for (var s of DATA) for (var item of json[s] || []) await DB.put(s, item);
    }
  };
  P.DB = DB;
})(window.Psilog);
