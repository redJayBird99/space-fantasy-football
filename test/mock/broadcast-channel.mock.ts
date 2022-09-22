Object.defineProperty(window, "BroadcastChannel", {
  writable: true,
  value: jest.fn().mockImplementation((name) => ({
    name,
    onmessage: () => {},
    postMessage(msg: any) {
      this.onmessage(msg);
    },
  })),
});
