import AdminAnalyticsDashboard from '@/components/admin/AdminAnalyticsDashboard';

export const metadata = {
  title: '網站數據 | BGLARP 員工後台',
  robots: { index: false, follow: false },
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsDashboard />;
}
