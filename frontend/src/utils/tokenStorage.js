let inMemoryToken = null;

const getLocalStorage = () => {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
};

export const tokenStorage = {
  setToken: (token) => {
    inMemoryToken = token;
    const storage = getLocalStorage();
    if (storage) {
      try {
        storage.setItem('token', token);
      } catch {}
    }
  },

  getToken: () => {
    if (inMemoryToken) {
      return inMemoryToken;
    }

    const storage = getLocalStorage();
    if (storage) {
      try {
        const token = storage.getItem('token');
        if (token) {
          inMemoryToken = token;
          return token;
        }
      } catch {}
    }

    return null;
  },

  removeToken: () => {
    inMemoryToken = null;
    const storage = getLocalStorage();
    if (storage) {
      try {
        storage.removeItem('token');
      } catch {}
    }
  },
};
