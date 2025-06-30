const createLauncher = () => {
  const listing = () => {};
  return {
    dispose: () => {},
    execute: () => {},
  };
};
export type LauncherInstance = ReturnType<typeof createLauncher>;
export default createLauncher;
