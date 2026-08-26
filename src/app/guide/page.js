import Navbar from '@/components/Navbar';
import PlayerGuide from '@/components/PlayerGuide';
import Footer from '@/components/Footer';
import FloatingBookBtn from '@/components/FloatingBookBtn';

export const metadata = {
  title: '劇本殺新手指南 | BGLARP 實境推理館',
  description: '第一次玩劇本殺，從人數、喜好、時間與價格開始挑選，並查看 BGLARP 玩家、預約與到店常見問題。',
  alternates: { canonical: '/guide' },
  openGraph: {
    title: '劇本殺新手指南 | BGLARP 實境推理館',
    description: '第一次玩劇本殺，先確認人數、遊戲口味、時間與預算，再查看預約與到店注意事項。',
    url: '/guide',
    type: 'website',
  },
};

export default function GuidePage() {
  return (
    <>
      <Navbar />
      <main>
        <PlayerGuide />
      </main>
      <Footer />
      <FloatingBookBtn />
    </>
  );
}
