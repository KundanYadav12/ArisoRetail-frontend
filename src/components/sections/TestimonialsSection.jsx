import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquareQuote, ChevronLeft, ChevronRight, Quote, ShieldCheck } from 'lucide-react';
import { FadeIn } from '../common/TextReveal';
import { useSiteData } from '../../context/SiteDataContext';

export default function TestimonialsSection() {
  const { testimonials } = useSiteData();
  const [currentIndex, setCurrentIndex] = useState(0);

  const hasTestimonials = testimonials && testimonials.length > 0;

  const next = () => {
    if (!hasTestimonials) return;
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    if (!hasTestimonials) return;
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section id="testimonials" className="py-24 sm:py-32 relative bg-[#fafcff] overflow-hidden border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block text-xs sm:text-sm font-bold tracking-widest text-ariso-600 uppercase mb-3 px-3.5 py-1 rounded-full bg-ariso-50 border border-ariso-200">
            TESTIMONIALS
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight mb-4">
            What partners and clients say.
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            Real feedback from business owners and event organizers using Ariso software every day.
          </p>
        </div>

        {hasTestimonials ? (
          <div className="max-w-4xl mx-auto relative">
            <FadeIn>
              <div className="p-8 sm:p-14 rounded-3xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/40 relative">
                <Quote className="w-12 h-12 text-ariso-200 absolute top-8 right-8 pointer-events-none" />

                {/* Rating stars */}
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(testimonials[currentIndex].rating || 5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Content */}
                <p className="text-lg sm:text-2xl text-slate-800 font-medium leading-relaxed mb-8">
                  "{testimonials[currentIndex].content}"
                </p>

                {/* Author Info */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    {testimonials[currentIndex].avatar ? (
                      <img
                        src={testimonials[currentIndex].avatar}
                        alt={testimonials[currentIndex].name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-ariso-100 text-ariso-700 font-bold flex items-center justify-center text-base">
                        {testimonials[currentIndex].name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-950 text-base">
                        {testimonials[currentIndex].name}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500">
                        {testimonials[currentIndex].designation}
                        {testimonials[currentIndex].company ? ` • ${testimonials[currentIndex].company}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Carousel Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prev}
                      className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      aria-label="Previous Testimonial"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={next}
                      className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      aria-label="Next Testimonial"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        ) : (
          /* Graceful, professional empty state */
          <FadeIn>
            <div className="max-w-2xl mx-auto p-8 sm:p-10 rounded-3xl bg-white border border-slate-200/80 shadow-md text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-ariso-50 text-ariso-600 flex items-center justify-center mb-4">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                Verified Business Deployments
              </h3>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg mb-4">
                We are actively collecting and verifying partner case studies and reviews across our restaurant, retail, and event management deployments.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ariso-600">
                <span>Direct client feedback can be managed via Superadmin</span>
              </span>
            </div>
          </FadeIn>
        )}

      </div>
    </section>
  );
}
