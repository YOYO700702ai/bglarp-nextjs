import AdminScriptsDashboard from '@/components/admin/AdminScriptsDashboard';

export const metadata = {
  title: '劇本管理 | BGLARP 員工後台',
  robots: { index: false, follow: false },
};

export default function AdminScriptsPage() {
  return <AdminScriptsDashboard />;
}
