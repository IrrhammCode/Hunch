from pathlib import Path
p = Path(r"C:\Users\Irham\Documents\code\metropolis\mobile\src\auth\AuthContext.tsx")
t = p.read_text(encoding="utf-8")
old = '''function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user] = useState<SessionUser | null>({
    id: "mock:hunch",
    email: "design@hunch.mock",
    displayName: "Design Trader",
    address: MOCK_ADDRESS_CHECKSUM,
    mera: true,
  });
  const provider = useMemo(() => createMockProvider(), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready: true,
      privyMode: false,
      meraAvailable: false,
      missingAuthConfig: false,
      authMethod: "mock",
      mockMode: true,
      loginWithMera: async () => {},
      loginWithFaceId: async () => {},
      logout: async () => {},
      getEthereumProvider: async () => provider,
    }),
    [user, provider],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}'''
new = '''const MOCK_USER: SessionUser = {
  id: "mock:hunch",
  email: "design@hunch.mock",
  displayName: "Design Trader",
  address: MOCK_ADDRESS_CHECKSUM,
  mera: true,
};

function MockAuthProvider({ children }: { children: React.ReactNode }) {
  // Start signed-in for design flow; Sign Out must clear user so login stays visible.
  const [user, setUser] = useState<SessionUser | null>(MOCK_USER);
  const provider = useMemo(() => createMockProvider(), []);

  const login = useCallback(async () => {
    setUser(MOCK_USER);
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready: true,
      privyMode: false,
      meraAvailable: false,
      missingAuthConfig: false,
      authMethod: user ? "mock" : null,
      mockMode: true,
      loginWithMera: login,
      loginWithFaceId: login,
      logout,
      getEthereumProvider: async () => provider,
    }),
    [user, provider, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}'''
if old not in t:
    raise SystemExit("pattern not found")
p.write_text(t.replace(old, new), encoding="utf-8")
print("AuthContext mock logout fixed")
