import { Redirect } from "expo-router";
import { useAuth } from "@/src/auth/AuthContext";

/** Signup removed — Mera passkey is the only account. */
export default function SignupScreen() {
  const { user } = useAuth();
  if (user) return <Redirect href="/(app)" />;
  return <Redirect href="/(auth)/login" />;
}
