import { createClient } from '@supabase/supabase-js';

// Supabase LocalStorage Mock to allow the app to run completely frontend-only
// without requiring environment variables or a real Supabase backend.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let realSupabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  realSupabase = createClient(supabaseUrl, supabaseAnonKey);
}

const getTable = (tableName) => {
  const data = localStorage.getItem(`mock_db_${tableName}`);
  return data ? JSON.parse(data) : [];
};

const setTable = (tableName, data) => {
  localStorage.setItem(`mock_db_${tableName}`, JSON.stringify(data));
};

const createMockQuery = (table) => {
  let operations = [];
  let action = null; // 'select', 'update', 'delete', 'insert', 'upsert'
  let payload = null;
  
  const execute = async () => {
    let allData = getTable(table);
    let result = [...allData];
    
    // Apply filters
    for (const op of operations) {
      if (op.type === 'eq') {
        result = result.filter(item => item[op.col] === op.val);
      } else if (op.type === 'in') {
        result = result.filter(item => op.vals.includes(item[op.col]));
      } else if (op.type === 'order') {
        result.sort((a, b) => {
          if (a[op.col] < b[op.col]) return op.ascending ? -1 : 1;
          if (a[op.col] > b[op.col]) return op.ascending ? 1 : -1;
          return 0;
        });
      }
    }

    if (action === 'select') {
      if (payload && payload.single) {
        return { data: result[0] || null, error: null };
      }
      return { data: result, error: null };
    }
    
    if (action === 'delete') {
      const toDeleteIds = new Set(result.map(r => r.id));
      const remaining = allData.filter(item => !toDeleteIds.has(item.id));
      setTable(table, remaining);
      return { data: null, error: null };
    }
    
    if (action === 'update') {
      const toUpdateIds = new Set(result.map(r => r.id));
      const newData = allData.map(item => toUpdateIds.has(item.id) ? { ...item, ...payload } : item);
      setTable(table, newData);
      return { data: null, error: null };
    }
    
    if (action === 'insert') {
      const items = Array.isArray(payload) ? payload : [payload];
      const withIds = items.map(item => ({ ...item, id: item.id || crypto.randomUUID(), created_at: item.created_at || new Date().toISOString() }));
      setTable(table, [...allData, ...withIds]);
      return { data: withIds, error: null };
    }
    
    if (action === 'upsert') {
      const items = Array.isArray(payload) ? payload : [payload];
      let newData = [...allData];
      items.forEach(item => {
        if (!item.id) item.id = crypto.randomUUID();
        const existingIdx = newData.findIndex(d => d.id === item.id);
        if (existingIdx >= 0) {
          newData[existingIdx] = { ...newData[existingIdx], ...item };
        } else {
          newData.push({ ...item, created_at: item.created_at || new Date().toISOString() });
        }
      });
      setTable(table, newData);
      return { data: items, error: null };
    }
    
    return { data: result, error: null };
  };

  const query = {
    select: (cols = '*') => {
      action = 'select';
      return query;
    },
    order: (col, { ascending } = { ascending: true }) => {
      operations.push({ type: 'order', col, ascending });
      return query;
    },
    eq: (col, val) => {
      operations.push({ type: 'eq', col, val });
      return query;
    },
    in: (col, vals) => {
      operations.push({ type: 'in', col, vals });
      return query;
    },
    single: () => {
      payload = { single: true };
      return query;
    },
    delete: () => {
      action = 'delete';
      return query;
    },
    insert: (items) => {
      action = 'insert';
      payload = items;
      return query;
    },
    update: (updates) => {
      action = 'update';
      payload = updates;
      return query;
    },
    upsert: (items, options) => {
      action = 'upsert';
      payload = items;
      return query;
    },
    then: (resolve, reject) => {
      execute().then(resolve).catch(reject);
    }
  };
  
  return query;
};

export const supabase = realSupabase ? realSupabase : {
  from: (table: string) => createMockQuery(table),
  auth: {
    signInWithPassword: async () => ({ data: { user: { id: 'admin-dummy' } }, error: null }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (cb: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    updateUser: async () => ({ data: {}, error: null })
  },
  storage: {
    from: (bucket: string) => {
      return {
        upload: async () => ({ data: { path: 'dummy' }, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: 'https://placeholder.com/dummy.png' } })
      };
    }
  },
  channel: (name: string) => ({
    on: () => supabase.channel(name),
    subscribe: () => {}
  }),
  removeChannel: () => {}
} as any;

(window as any).supabase = supabase;
