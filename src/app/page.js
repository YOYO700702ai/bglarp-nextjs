import Navbar from '@/components/Navbar';
import HeroVideo from '@/components/HeroVideo';
import ScriptGrid from '@/components/ScriptGrid';
import BookingSection from '@/components/BookingSection';
import Footer from '@/components/Footer';
import FloatingBookBtn from '@/components/FloatingBookBtn';

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroVideo />
      <ScriptGrid />
      <BookingSection />
      <Footer />
      <FloatingBookBtn />
    </>
  );
}
