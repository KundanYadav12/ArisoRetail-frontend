import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UtensilsCrossed, Store, Ticket, ArrowRight, ArrowUpRight, 
  Play, CheckCircle2, QrCode, Scale, Receipt, Sparkles, Plus 
} from 'lucide-react';
import MagneticButton from '../common/MagneticButton';
import VideoModal from '../common/VideoModal';
import { FadeIn } from '../common/TextReveal';
import { useSiteData } from '../../context/SiteDataContext';

export default function ProductShowcase() {
  const { products } = useSiteData();
  const [activeTab, setActiveTab] = useState(0);
  const [videoModal, setVideoModal] = useState({ isOpen: false, url: '', title: '' });

  // Map product tabs from database products
  const productTabs = [
    {
      index: 0,
      slug: 'ariso-pos',
      label: '01 / RESTAURANT TECHNOLOGY',
      title: 'ARISO POS',
      tagline: 'Modern restaurant POS technology designed to simplify daily operations, billing, ordering and restaurant management.',
      defaultUrl: 'https://restrocaptain.online/',
      theme: {
        accent: 'text-amber-600',
        bgPill: 'bg-amber-50 text-amber-700 border-amber-200',
        glow: 'rgba(245, 158, 11, 0.12)',
        btnBg: 'hover:bg-amber-600',
        borderActive: 'border-amber-400 ring-4 ring-amber-100',
      },
      highlights: [
        'Lightning-fast Table & KOT Ordering',
        'Split-Billing & Multi-payment Gateway',
        'Kitchen Display System (KDS)',
        'Live Dine-in & Takeaway Analytics'
      ],
      mockup: (
        <div className="w-full h-full p-6 sm:p-8 bg-gradient-to-br from-amber-500/5 via-white to-orange-500/5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-900">Ariso POS Kitchen Flow</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live Service
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Table 04</span>
              <span className="text-xs font-bold text-slate-800">4 Items • In Prep</span>
              <div className="w-full bg-amber-100 h-1 rounded-full mt-2 overflow-hidden">
                <div className="bg-amber-500 h-full w-2/3 animate-pulse" />
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Table 12</span>
              <span className="text-xs font-bold text-slate-800">Bill Printed</span>
              <div className="w-full bg-emerald-100 h-1 rounded-full mt-2">
                <div className="bg-emerald-500 h-full w-full" />
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hidden sm:block">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Takeaway #108</span>
              <span className="text-xs font-bold text-slate-800">Ready for Pickup</span>
              <div className="w-full bg-blue-100 h-1 rounded-full mt-2">
                <div className="bg-blue-500 h-full w-full" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-amber-100">
            <span>Synchronized KOT Terminal</span>
            <span className="font-mono text-amber-700 font-bold">restrocaptain.online</span>
          </div>
        </div>
      )
    },
    {
      index: 1,
      slug: 'ariso-retail',
      label: '02 / RETAIL TECHNOLOGY',
      title: 'ARISO RETAIL',
      tagline: 'Retail technology designed to simplify billing, products, inventory and everyday store operations.',
      defaultUrl: 'https://arisoretail.duckdns.org/',
      theme: {
        accent: 'text-blue-600',
        bgPill: 'bg-blue-50 text-blue-700 border-blue-200',
        glow: 'rgba(2, 132, 199, 0.12)',
        btnBg: 'hover:bg-blue-600',
        borderActive: 'border-blue-400 ring-4 ring-blue-100',
      },
      highlights: [
        'Weighing Scale & Barcode Scanner Sync',
        'Dynamic GST Billing & Split Tax Engine',
        'Batch & Expiry Multi-Store Inventory',
        'Customer Ledger & Instant WhatsApp Invoicing'
      ],
      mockup: (
        <div className="w-full h-full p-6 sm:p-8 bg-gradient-to-br from-blue-500/5 via-white to-cyan-500/5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-blue-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Store className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-900">Ariso Retail Counter</span>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Scale Connected
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
              <Scale className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Weight Scale</span>
                <span className="text-xs font-bold text-slate-800">1.450 KG</span>
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
              <Receipt className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">GST Invoice</span>
                <span className="text-xs font-bold text-slate-800">₹ 1,280.00</span>
              </div>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hidden sm:flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Inventory Sync</span>
                <span className="text-xs font-bold text-slate-800">Auto Deducted</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-blue-100">
            <span>High-Volume Retail POS</span>
            <span className="font-mono text-blue-700 font-bold">arisoretail.duckdns.org</span>
          </div>
        </div>
      )
    },
    {
      index: 2,
      slug: 'eventpass',
      label: '03 / EVENT TECHNOLOGY',
      title: 'EVENTPASS',
      tagline: 'Digital event passes and event management technology built for everything from Garba and Navratri to concerts, cultural events, corporate events and more.',
      defaultUrl: 'https://eventgen.duckdns.org/login',
      theme: {
        accent: 'text-indigo-600',
        bgPill: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        glow: 'rgba(99, 102, 241, 0.12)',
        btnBg: 'hover:bg-indigo-600',
        borderActive: 'border-indigo-400 ring-4 ring-indigo-100',
      },
      highlights: [
        'Counterfeit-Proof Dynamic QR Verification',
        'Sub-Second Volunteer Turnstile Scanner',
        'Navratri Garba, Concerts, Summits & Sports',
        'Live Gate Flow & Crowd Capacity Insights'
      ],
      mockup: (
        <div className="w-full h-full p-6 sm:p-8 bg-gradient-to-br from-indigo-500/5 via-white to-purple-500/5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Ticket className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-900">EventPass Digital Pass</span>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Verified Authenticated
            </span>
          </div>

          <div className="flex items-center justify-around my-4 gap-4">
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-md flex items-center gap-3">
              <QrCode className="w-14 h-14 text-slate-900" />
              <div className="text-left">
                <span className="text-[10px] font-bold text-indigo-600 uppercase">Season Pass #4092</span>
                <h5 className="font-bold text-xs text-slate-900">Garba Mahotsav 2026</h5>
                <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">● Check-in Approved</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-indigo-100">
            <span>Fast Volunteer Gate Scanner</span>
            <span className="font-mono text-indigo-700 font-bold">eventgen.duckdns.org</span>
          </div>
        </div>
      )
    }
  ];

  // Match live DB product data with tab structure
  const getProductData = (tab) => {
    const matched = products.find((p) => p.slug === tab.slug);
    return {
      name: matched?.name || tab.title,
      description: matched?.long_description || matched?.short_description || tab.tagline,
      externalUrl: matched?.external_url || tab.defaultUrl,
      ctaText: matched?.cta_text || `Explore ${tab.title}`,
      heroImage: matched?.hero_image || '',
      demoVideo: matched?.demo_video || ''
    };
  };

  const activeProduct = productTabs[activeTab];
  const activeData = getProductData(activeProduct);

  return (
    <section id="products" className="py-24 sm:py-36 relative bg-[#fafcff] overflow-hidden">
      {/* Subtle radial glow matching current product */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-3xl pointer-events-none transition-colors duration-700"
        style={{ background: activeProduct.theme.glow }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <span className="inline-block text-xs sm:text-sm font-bold tracking-[0.2em] text-ariso-600 uppercase mb-3 px-4 py-1 rounded-full bg-ariso-50 border border-ariso-200">
            OUR PRODUCTS
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.05] mb-4">
            Three products. One vision.
          </h2>
          <p className="text-slate-600 text-base sm:text-xl">
            Simplifying the real world with purpose-built digital technology for restaurants, retail, and events.
          </p>
        </div>

        {/* Product Navigation Pill Selector */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {productTabs.map((tab) => {
            const isActive = activeTab === tab.index;
            return (
              <button
                key={tab.index}
                onClick={() => setActiveTab(tab.index)}
                className={`relative px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-300 flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-xl border border-slate-200/90'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent'
                }`}
                data-cursor="SWITCH"
              >
                {isActive && (
                  <motion.div
                    layoutId="productActivePill"
                    className="absolute inset-0 bg-white rounded-2xl border-2 border-slate-900 shadow-md pointer-events-none"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{tab.title}</span>
              </button>
            );
          })}
        </div>

        {/* Main Cinematic Product Stage */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeProduct.index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="p-8 sm:p-14 rounded-3xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-200/60 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center"
          >
            {/* Left Column: Product Narrative & Highlights */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-3">
                <span className={`px-3.5 py-1 rounded-full text-xs font-bold border ${activeProduct.theme.bgPill}`}>
                  {activeProduct.label}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  STAGE 0{activeProduct.index + 1}
                </span>
              </div>

              <h3 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
                {activeData.name}
              </h3>

              <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                {activeData.description}
              </p>

              {/* Highlights Checkmarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {activeProduct.highlights.map((h, hIdx) => (
                  <div key={hIdx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-slate-800 leading-snug">
                      {h}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100">
                <MagneticButton strength={0.25}>
                  <a
                    href={activeData.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-slate-950 hover:bg-ariso-600 text-white font-bold text-sm shadow-lg shadow-slate-900/10 hover:shadow-ariso-600/30 transition-all duration-300 group"
                    data-cursor="LAUNCH"
                  >
                    <span>{activeData.ctaText}</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </MagneticButton>

                <button
                  onClick={() => setVideoModal({
                    isOpen: true,
                    url: activeData.demoVideo,
                    title: activeData.name
                  })}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors"
                  data-cursor="PLAY"
                >
                  <Play className="w-4 h-4 text-ariso-600 fill-ariso-600" />
                  <span>Watch Demo</span>
                </button>
              </div>
            </div>

            {/* Right Column: Dynamic Morphing Product Visual Frame */}
            <div className="lg:col-span-6">
              <div className="relative aspect-[4/3] rounded-3xl bg-slate-50 border border-slate-200 p-2 shadow-inner overflow-hidden">
                {activeData.heroImage ? (
                  <img
                    src={activeData.heroImage}
                    alt={activeData.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  activeProduct.mockup
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Future Chapter: AND WE'RE BUILDING MORE */}
        <FadeIn delay={0.2} className="mt-16 text-center">
          <div className="max-w-2xl mx-auto p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-md flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-ariso-600" />
              <span>FUTURE PORTFOLIO</span>
            </div>
            <h4 className="text-xl font-bold text-slate-950 mb-2">And we’re building more.</h4>
            <p className="text-slate-600 text-sm max-w-lg mb-6">
              Ariso is continuously exploring new ideas, workflows, and products to eliminate everyday business friction.
            </p>
            <div className="flex items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Product 04 (In R&D)
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-slate-400 text-xs font-semibold flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Product 05 (In R&D)
              </span>
            </div>
          </div>
        </FadeIn>

      </div>

      {/* Demo Video Modal */}
      <VideoModal
        isOpen={videoModal.isOpen}
        onClose={() => setVideoModal({ isOpen: false, url: '', title: '' })}
        videoUrl={videoModal.url}
        title={videoModal.title}
      />
    </section>
  );
}
