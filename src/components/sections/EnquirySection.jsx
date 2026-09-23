import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, ArrowRight, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import MagneticButton from '../common/MagneticButton';
import { FadeIn } from '../common/TextReveal';
import { publicAPI } from '../../api/client';
import { useSiteData } from '../../context/SiteDataContext';
import { useToast } from '../../context/ToastContext';

export default function EnquirySection() {
  const { settings } = useSiteData();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in your name, email, and message.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await publicAPI.submitEnquiry(formData);
      if (res.data?.success) {
        setIsSubmitted(true);
        toast.success(res.data.message || 'Enquiry submitted successfully!');
        
        // Trigger subtle confetti
        try {
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.7 }
          });
        } catch (e) {}

        setFormData({ name: '', email: '', phone: '', company: '', message: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit enquiry. Please try WhatsApp directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 sm:py-32 relative bg-white overflow-hidden border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Column: Context & Direct Contact */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            <div>
              <span className="inline-block text-xs sm:text-sm font-bold tracking-widest text-ariso-600 uppercase mb-3 px-3.5 py-1 rounded-full bg-ariso-50 border border-ariso-200">
                GET IN TOUCH
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight mb-4">
                Let's build something useful.
              </h2>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                Have a restaurant requirement, retail billing challenge, event management pass need, or custom software inquiry? We're ready to collaborate.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {/* WhatsApp Card */}
              {settings.whatsapp_number && (
                <a
                  href={`https://wa.me/91${settings.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(settings.whatsapp_default_message || 'Hello Ariso')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-300 flex items-center justify-between group"
                  data-cursor="WHATSAPP"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Chat on WhatsApp</h4>
                      <p className="text-xs text-slate-600">+91 {settings.whatsapp_number}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-700 group-hover:translate-x-1 transition-transform" />
                </a>
              )}

              {/* Enquiry Email Card */}
              {settings.enquiry_email && (
                <a
                  href={`mailto:${settings.enquiry_email}`}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-ariso-300 transition-all duration-300 flex items-center justify-between group"
                  data-cursor="EMAIL"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-ariso-600 text-white flex items-center justify-center shadow-md shadow-ariso-500/20">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Direct Enquiry Email</h4>
                      <p className="text-xs text-slate-600">{settings.enquiry_email}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ariso-700 group-hover:translate-x-1 transition-transform" />
                </a>
              )}

              {/* Address Card */}
              {settings.office_address && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-0.5">Office Address</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{settings.office_address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Enquiry Form */}
          <div className="lg:col-span-7">
            <div className="p-8 sm:p-10 rounded-3xl bg-slate-50/70 border border-slate-200/80 shadow-xl shadow-slate-200/40 relative">
              <AnimatePresence mode="wait">
                {isSubmitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-12 flex flex-col items-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                      Thank you. Your enquiry has been received.
                    </h3>
                    <p className="text-slate-600 text-base max-w-md mb-8">
                      Our product team will review your specifications and get in touch with you shortly.
                    </p>
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-ariso-600 text-white font-semibold text-sm transition-colors"
                    >
                      Send Another Enquiry
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Your Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-ariso-500 focus:ring-2 focus:ring-ariso-500/20 text-slate-900 text-sm outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="e.g. rahul@company.com"
                          className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-ariso-500 focus:ring-2 focus:ring-ariso-500/20 text-slate-900 text-sm outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Phone / WhatsApp Number
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="e.g. 9876543210"
                          className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-ariso-500 focus:ring-2 focus:ring-ariso-500/20 text-slate-900 text-sm outline-none transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Business / Organization Name
                        </label>
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="e.g. Spice Garden Restaurant"
                          className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-ariso-500 focus:ring-2 focus:ring-ariso-500/20 text-slate-900 text-sm outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        How Can We Help? *
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us about your product needs, estimated timeline, or business requirements..."
                        className="w-full px-4 py-3.5 rounded-xl bg-white border border-slate-200 focus:border-ariso-500 focus:ring-2 focus:ring-ariso-500/20 text-slate-900 text-sm outline-none transition-all resize-none"
                      />
                    </div>

                    <MagneticButton strength={0.2} className="w-full">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 rounded-xl bg-ariso-600 hover:bg-ariso-700 text-white font-bold text-base shadow-lg shadow-ariso-600/25 hover:shadow-ariso-600/40 transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-70"
                        data-cursor="SUBMIT"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Processing Enquiry...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Send Enquiry</span>
                          </>
                        )}
                      </button>
                    </MagneticButton>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
