// frontend/src/app/(auth)/register/page.tsx
import RegisterForm from '@/components/auth/RegisterForm';
import AuthBranding from '@/components/auth/AuthBranding';

export default function RegisterPage() {
  return (
    <div className="min-h-[calc(100vh-6rem)] grid grid-cols-1 lg:grid-cols-2">
      <AuthBranding />
      <div className="flex items-center justify-center px-6 py-16">
        <RegisterForm />
      </div>
    </div>
  );
}