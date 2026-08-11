import ScriptEditor from '@/components/admin/ScriptEditor';

export const metadata = {
  title: '編輯劇本 | BGLARP 員工後台',
  robots: { index: false, follow: false },
};

export default async function EditAdminScriptPage({ params }) {
  const { id } = await params;
  return <ScriptEditor scriptId={id} mode="edit" />;
}
