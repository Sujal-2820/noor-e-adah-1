import { Sparkles, Heart, Users, ShieldCheck, ShoppingBag } from 'lucide-react';
import { cn } from '../../../../../lib/cn';
import { Trans } from '../../../../../components/Trans';

export function OurStoryView() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Hero Section with Parallax-like effect */}
      <div className="relative h-[40vh] overflow-hidden rounded-b-[3rem] shadow-2xl">
        <img 
          src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=1000" 
          alt="Traditional Indian Fabric" 
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[10s] hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent" />
        <div className="absolute bottom-12 left-0 right-0 px-6 text-center">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 drop-shadow-md">
            Noor E Adah
          </h1>
          <p className="text-slate-200 font-medium tracking-widest uppercase text-xs opacity-90">
            Heritage • Elegance • Inclusion
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 -mt-8 relative z-10">
        <div className="rounded-[2.5rem] bg-white/80 backdrop-blur-xl border border-white p-8 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
          
          {/* Welcome Text */}
          <div className="space-y-6 text-slate-700 leading-relaxed">
            <p className="text-xl font-semibold text-slate-900 leading-snug">
              <Trans>Welcome to Noor e Adah—a premium Indian clothing brand where tradition meets modern elegance.</Trans>
            </p>
            
            <div className="h-px w-12 bg-indigo-500 rounded-full" />

            <p>
              <Trans>Born from a family’s passion for fashion, Noor e Adah brings India’s rich cultural heritage to life through thoughtfully crafted designs. We work with traditional textiles and time-honored techniques, reimagining them into silhouettes that feel fresh, contemporary, and globally relevant.</Trans>
            </p>

            {/* Values Grid */}
            <div className="grid grid-cols-2 gap-4 py-6">
              <div className="rounded-3xl bg-indigo-50 p-6 flex flex-col items-center text-center space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Heart className="h-5 w-5 fill-current" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Passion</h3>
                <p className="text-[10px] text-slate-500 leading-tight">Crafted with love and deep respect for tradition.</p>
              </div>
              <div className="rounded-3xl bg-amber-50 p-6 flex flex-col items-center text-center space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Elegance</h3>
                <p className="text-[10px] text-slate-500 leading-tight">Contemporary designs that celebrate your roots.</p>
              </div>
            </div>

            <p>
              <Trans>Our philosophy is simple: fashion should be for everyone. We are committed to creating pieces that are inclusive, accessible, and made to celebrate every individual—regardless of age, size, or background.</Trans>
            </p>

            {/* Philosophy Image */}
            <div className="rounded-[2rem] overflow-hidden my-6 h-48 shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1549439602-43ebca2327af?auto=format&fit=crop&q=80&w=800" 
                alt="Inclusive Fashion" 
                className="h-full w-full object-cover"
              />
            </div>

            <p>
              <Trans>Each piece is designed not just to be worn, but to be experienced—offering comfort, confidence, and a deep connection to your roots.</Trans>
            </p>

            <div className="relative p-8 rounded-[2rem] bg-indigo-900 text-white overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform">
                <ShoppingBag className="h-24 w-24" />
              </div>
              <p className="relative z-10 text-lg font-medium italic">
                <Trans>"At Noor e Adah, style is more than what you wear—it's how you carry your heritage."</Trans>
              </p>
            </div>
          </div>

          {/* Features Footer */}
          <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center space-y-2">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Community</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Authentic</span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Quality</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
