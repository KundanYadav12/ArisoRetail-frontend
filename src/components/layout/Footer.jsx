import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Instagram, ArrowUpRight, ShieldCheck, Heart } from 'lucide-react';
import { useSiteData } from '../../context/SiteDataContext';

export default function Footer() {
  const { settings, products } = useSiteData();
  const currentYear = new Date().getFullYear();

  const handleScrollTo = (e, href) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative bg-slate-950 text-white overflow-hidden pt-20 pb-12 border-t border-slate-900">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-gradient-to-b from-ariso-600/10 to-transparent pointer-events-none rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12 pb-16 border-b border-slate-800/80">
          
          {/* Col 1: Brand & Tagline */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-ariso-500 flex items-center justify-center text-white shadow-lg shadow-ariso-500/20">
                <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
                  <path d="M8 22L16 8L24 22H19.5L16 15.5L12.5 22H8Z" fill="currentColor" />
                </svg>
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-white">
                {settings.company_name || 'ARISO'}
              </span>
            </div>
            
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-sm">
              {settings.company_description || 'Ariso builds practical digital products that simplify everyday business operations for restaurants, retail, and events.'}
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              {settings.instagram_url && (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-900 hover:bg-gradient-to-tr hover:from-amber-500 hover:via-pink-500 hover:to-purple-600 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-300 border border-slate-800 hover:border-transparent"
                  aria-label="Instagram"
                  data-cursor="INSTA"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {settings.whatsapp_number && (
                <a
                  href={`https://wa.me/91${settings.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(settings.whatsapp_default_message || 'Hello Ariso')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-slate-900 hover:bg-emerald-600 text-slate-300 hover:text-white flex items-center justify-center transition-all duration-300 border border-slate-800 hover:border-transparent"
                  aria-label="WhatsApp"
                  data-cursor="CHAT"
                >
                  <Phone className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Navigation
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm text-slate-400">
              <li>
                <a href="#home" onClick={(e) => handleScrollTo(e, '#home')} className="hover:text-ariso-400 transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#about" onClick={(e) => handleScrollTo(e, '#about')} className="hover:text-ariso-400 transition-colors">
                  About Ariso
                </a>
              </li>
              <li>
                <a href="#products" onClick={(e) => handleScrollTo(e, '#products')} className="hover:text-ariso-400 transition-colors">
                  Our Products
                </a>
              </li>
              <li>
                <a href="#why-ariso" onClick={(e) => handleScrollTo(e, '#why-ariso')} className="hover:text-ariso-400 transition-colors">
                  Why Ariso
                </a>
              </li>
              <li>
                <a href="#vision" onClick={(e) => handleScrollTo(e, '#vision')} className="hover:text-ariso-400 transition-colors">
                  Vision
                </a>
              </li>
              <li>
                <a href="#contact" onClick={(e) => handleScrollTo(e, '#contact')} className="hover:text-ariso-400 transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Products */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Products
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm text-slate-400">
              {products.map((p) => (
                <li key={p.id}>
                  <a
                    href={p.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5 hover:text-ariso-400 transition-colors"
                  >
                    <span>{p.name}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact info */}
          <div className="flex flex-col gap-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Direct Contact
            </h4>
            <div className="flex flex-col gap-3 text-sm text-slate-400">
              {settings.general_email && (
                <a href={`mailto:${settings.general_email}`} className="flex items-start gap-2.5 hover:text-ariso-400 transition-colors">
                  <Mail className="w-4 h-4 text-ariso-400 mt-0.5 flex-shrink-0" />
                  <span>{settings.general_email}</span>
                </a>
              )}
              {settings.enquiry_email && settings.enquiry_email !== settings.general_email && (
                <a href={`mailto:${settings.enquiry_email}`} className="flex items-start gap-2.5 hover:text-ariso-400 transition-colors">
                  <Mail className="w-4 h-4 text-ariso-400 mt-0.5 flex-shrink-0" />
                  <span>{settings.enquiry_email}</span>
                </a>
              )}
              {settings.whatsapp_number && (
                <a
                  href={`https://wa.me/91${settings.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(settings.whatsapp_default_message || 'Hello Ariso')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 hover:text-emerald-400 transition-colors"
                >
                  <Phone className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>+91 {settings.whatsapp_number}</span>
                </a>
              )}
              {settings.office_address && (
                <div className="flex items-start gap-2.5 pt-1 text-slate-400 leading-relaxed text-xs">
                  <MapPin className="w-4 h-4 text-ariso-400 mt-0.5 flex-shrink-0" />
                  <span>{settings.office_address}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Big subtle watermark */}
        <div className="py-8 select-none pointer-events-none opacity-5 text-center font-black text-6xl sm:text-8xl md:text-9xl tracking-tighter text-white">
          ARISO
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 border-t border-slate-900">
          <div className="flex items-center gap-2">
            <span>© {currentYear} {settings.company_name || 'Ariso'}. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400 font-medium">
              {settings.footer_developed_by || 'Developed by Ariso'}
            </span>
            <span className="text-slate-700">|</span>
            <a href="/superadmin/login" className="text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Superadmin</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
