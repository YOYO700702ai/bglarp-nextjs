import ScriptEditor from '@/components/admin/ScriptEditor';

export const metadata = {
  title: '新增劇本 | BGLARP 員工後台',
  robots: { index: false, follow: false },
};

export default function NewAdminScriptPage() {
  return <ScriptEditor mode="new" />;
}
