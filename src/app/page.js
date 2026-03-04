import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import ScriptGrid from '@/components/ScriptGrid';
import BookingSection from '@/components/BookingSection';
import Footer from '@/components/Footer';
import FloatingBookBtn from '@/components/FloatingBookBtn';

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <ScriptGrid />
      <BookingSection />
      <Footer />
      <FloatingBookBtn />
    </>
  );
}
