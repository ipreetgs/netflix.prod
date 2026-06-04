import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      localStorage.setItem('signup_email_draft', email);
      navigate('/register');
    }
  };

  const faqs = [
    { q: "What is Netflix?", a: "Netflix is a streaming service that offers a wide variety of award-winning TV shows, movies, anime, documentaries, and more on thousands of internet-connected devices." },
    { q: "How much does Netflix cost?", a: "Watch Netflix on your smartphone, tablet, Smart TV, laptop, or streaming device, all for one fixed monthly fee. Plans range from $2.99 to $17.99 a month. No extra costs, no contracts." },
    { q: "Where can I watch?", a: "Watch anywhere, anytime. Sign in with your Netflix account to watch instantly on the web at netflix.com from your personal computer or on any internet-connected device." },
    { q: "How do I cancel?", a: "Netflix is flexible. There are no pesky contracts and no commitments. You can easily cancel your account online in two clicks. There are no cancellation fees." }
  ];

  return (
    <div className="relative min-h-screen text-white bg-black font-primary overflow-x-hidden">
      {/* Background Graphic Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center filter opacity-40"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1574375927938-d5a98e8fed85?q=80&w=2069&auto=format&fit=crop')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-brand tracking-tighter cursor-pointer" onClick={() => navigate('/')}>
          NETFLIX
        </h1>
        <button 
          onClick={() => navigate('/login')} 
          className="bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2 rounded transition duration-200"
        >
          Sign In
        </button>
      </header>

      {/* Main Content Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-24 max-w-4xl mx-auto">
        <h2 className="text-5xl md:text-6xl font-black mb-4 leading-tight">
          Unlimited movies, TV shows, and more
        </h2>
        <p className="text-xl md:text-2xl font-medium mb-6">
          Watch anywhere. Cancel anytime.
        </p>
        <p className="text-lg md:text-xl font-normal mb-8">
          Ready to watch? Enter your email to create or restart your membership.
        </p>

        {/* CTA Form */}
        <form onSubmit={handleGetStarted} className="flex flex-col md:flex-row items-center w-full max-w-2xl gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full bg-black/60 border border-neutral-600 focus:border-white text-white text-base px-5 py-4 rounded focus:outline-none transition duration-200"
          />
          <button 
            type="submit" 
            className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-hover text-white text-xl font-semibold px-8 py-4 rounded whitespace-nowrap transition duration-200 w-full md:w-auto"
          >
            Get Started <ChevronRight size={24} />
          </button>
        </form>
      </main>

      {/* FAQ Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 py-16 border-t border-neutral-800">
        <h3 className="text-3xl md:text-4xl font-extrabold text-center mb-10">Frequently Asked Questions</h3>
        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-neutral-800 rounded overflow-hidden">
              <button 
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="flex items-center justify-between w-full p-6 text-left text-lg md:text-xl font-medium border-b border-black/20 hover:bg-neutral-700 transition"
              >
                <span>{faq.q}</span>
                <span className="text-3xl">{openFaq === idx ? '×' : '+'}</span>
              </button>
              {openFaq === idx && (
                <div className="p-6 text-base md:text-lg text-neutral-300 leading-relaxed bg-neutral-800">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto px-8 py-12 border-t border-neutral-900 text-neutral-500 text-sm">
        <p className="mb-6">Questions? Call 1-800-892-0000</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <ul className="flex flex-col gap-3">
            <li className="hover:underline cursor-pointer">FAQ</li>
            <li className="hover:underline cursor-pointer">Investor Relations</li>
            <li className="hover:underline cursor-pointer">Ways to Watch</li>
            <li className="hover:underline cursor-pointer">Corporate Information</li>
          </ul>
          <ul className="flex flex-col gap-3">
            <li className="hover:underline cursor-pointer">Help Center</li>
            <li className="hover:underline cursor-pointer">Jobs</li>
            <li className="hover:underline cursor-pointer">Terms of Use</li>
            <li className="hover:underline cursor-pointer">Contact Us</li>
          </ul>
          <ul className="flex flex-col gap-3">
            <li className="hover:underline cursor-pointer">Account</li>
            <li className="hover:underline cursor-pointer">Redeem Gift Cards</li>
            <li className="hover:underline cursor-pointer">Privacy</li>
            <li className="hover:underline cursor-pointer">Speed Test</li>
          </ul>
          <ul className="flex flex-col gap-3">
            <li className="hover:underline cursor-pointer">Media Center</li>
            <li className="hover:underline cursor-pointer">Buy Gift Cards</li>
            <li className="hover:underline cursor-pointer">Cookie Preferences</li>
            <li className="hover:underline cursor-pointer">Legal Notices</li>
          </ul>
        </div>
        <p className="mt-8 text-xs">© 2026 Netflix Clone, Inc.</p>
      </footer>
    </div>
  );
};
