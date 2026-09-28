// frontend/src/app/(auth)/login/page.tsx
import LoginForm from '@/components/auth/LoginForm';
import AuthBranding from '@/components/auth/AuthBranding';

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-6rem)] grid grid-cols-1 lg:grid-cols-2">
      <AuthBranding />
      <div className="flex items-center justify-center px-6 py-16">
        <LoginForm />
      </div>
    </div>
  );
}