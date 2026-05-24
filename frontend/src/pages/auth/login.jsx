import AuthLayout from "@/components/auth/AuthLayout";
import AuthTabs from "@/components/auth/AuthTabs";

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthTabs defaultTab="login" />
    </AuthLayout>
  );
}
