import AuthLayout from "@/components/auth/AuthLayout";
import AuthTabs from "@/components/auth/AuthTabs";

export default function RegisterPage() {
  return (
    <AuthLayout>
      <AuthTabs defaultTab="register" />
    </AuthLayout>
  );
}
