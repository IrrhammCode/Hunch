import { Redirect } from "expo-router";
import { useAuth } from "@/src/auth/AuthContext";
import { BootScreen } from "@/src/components/BootScreen";

export default function Index() {
  const { user, ready } = useAuth();

  if (!ready) return <BootScreen label="Starting" />;

  return <Redirect href={user ? "/(app)" : "/(auth)/login"} />;
}
