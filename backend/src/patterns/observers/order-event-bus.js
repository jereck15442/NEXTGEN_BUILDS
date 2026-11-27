const listeners = new Map();

export const orderEvents = {
  on(event, listener) {
    const registered = listeners.get(event) ?? [];
    registered.push(listener);
    listeners.set(event, registered);
    return () => {
      listeners.set(event, (listeners.get(event) ?? []).filter((entry) => entry !== listener));
    };
  },
  async emit(event, payload) {
    const registered = listeners.get(event) ?? [];
    await Promise.all(registered.map((listener) => listener(payload)));
  }
};
