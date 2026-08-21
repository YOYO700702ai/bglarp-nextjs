import Navbar from '@/components/Navbar';
import HeroVideo from '@/components/HeroVideo';
import ScriptGrid from '@/components/ScriptGrid';
import PlayerGuide from '@/components/PlayerGuide';
import BookingSection from '@/components/BookingSection';
import Footer from '@/components/Footer';
import FloatingBookBtn from '@/components/FloatingBookBtn';

export const metadata = {
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroVideo />
      <ScriptGrid />
      <PlayerGuide />
      <BookingSection />
      <Footer />
      <FloatingBookBtn />
    </>
  );
}
