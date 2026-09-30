import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import AuthBranding from '@/components/auth/AuthBranding';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] grid grid-cols-1 lg:grid-cols-2 md:min-h-[calc(100vh-6rem)]">
      <AuthBranding />
      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}