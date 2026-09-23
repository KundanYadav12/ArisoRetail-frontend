import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useSiteData } from '../../context/SiteDataContext';

export default function WhatsAppButton() {
  const { settings } = useSiteData();
  const phone = settings.whatsapp_number || '7506200067';
  const cleanPhone = phone.replace(/\D/g, '');
  const message = encodeURIComponent(settings.whatsapp_default_message || 'Hello Ariso, I have an enquiry regarding your products.');
  const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${message}`;

  return (
    <div
      className="fixed z-40"
      style={{
        bottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
        right: '24px',
      }}
    >
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-[#25D366]/30 group focus:outline-none"
        aria-label="Chat on WhatsApp"
        data-cursor="WHATSAPP"
      >
        {/* Subtle Pulse ring */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366] opacity-30 animate-ping pointer-events-none group-hover:opacity-50" />

        {/* Solid WhatsApp SVG Icon */}
        <svg
          className="w-7 h-7 fill-current relative z-10"
          viewBox="0 0 24 24"
        >
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.586 1.83.913 2.796.913 3.179 0 5.767-2.587 5.767-5.766.001-3.18-2.585-5.767-5.767-5.767zm0 10.375c-.868 0-1.71-.24-2.441-.692l-.175-.108-1.815.476.485-1.77-.115-.184c-.495-.788-.756-1.7-.756-2.529 0-2.54 2.066-4.606 4.606-4.606 2.54 0 4.606 2.066 4.606 4.606 0 2.54-2.066 4.607-4.606 4.607zm3.172-3.454c-.174-.087-1.028-.507-1.188-.565-.16-.058-.276-.087-.393.087-.116.174-.45.565-.552.681-.101.116-.203.13-.377.043-.174-.087-.736-.271-1.402-.865-.518-.462-.868-1.033-.97-1.207-.101-.174-.011-.268.076-.354.078-.078.174-.203.261-.305.087-.101.116-.174.174-.29.058-.116.029-.217-.015-.305-.043-.087-.393-.946-.538-1.296-.142-.34-.286-.293-.393-.299l-.335-.006c-.116 0-.305.043-.464.217-.16.174-.609.595-.609 1.45 0 .855.623 1.681.71 1.797.087.116 1.226 1.872 2.97 2.624.415.179.739.286.992.366.417.133.796.114 1.096.069.335-.05 1.028-.42 1.173-.826.145-.406.145-.754.101-.826-.043-.072-.16-.116-.334-.203z"/>
        </svg>

        {/* Tooltip on hover (desktop only) */}
        <span className="hidden md:group-hover:flex items-center absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold whitespace-nowrap shadow-lg">
          Chat with us on WhatsApp
        </span>
      </motion.a>
    </div>
  );
}
