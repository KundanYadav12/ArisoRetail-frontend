import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { publicAPI } from '../api/client';

const fallbackSettings = {
  company_name: 'Ariso',
  company_tagline: 'Technology Built for the Real World.',
  company_description: 'Ariso is a technology company focused on creating practical digital solutions for businesses, retail, restaurants, and events. We build products that simplify operations, improve experiences, and help businesses move faster.',
  general_email: 'ariso@gmail.com',
  enquiry_email: 'jignesh2515@gmail.com',
  whatsapp_number: '7506200067',
  whatsapp_default_message: 'Hello Ariso, I have an enquiry regarding your products.',
  instagram_url: 'https://www.instagram.com/arisotraders?igsi=MTRjcHVsbXJxOTR0cQ==',
  office_address: 'Shop No. 40, Ajanta Square, Market Lane, Borivali (W), Mumbai - 400092',
  footer_developed_by: 'Developed by Ariso',
  hero_eyebrow: 'BUILDING TECHNOLOGY THAT MOVES BUSINESS FORWARD',
  hero_title: 'Technology Built for the Real World.',
  hero_subtitle: 'From restaurants and retail to events, Ariso builds practical digital products that simplify everyday business operations.',
  hero_cta_primary_text: 'Explore Our Products',
  hero_cta_primary_url: '#products',
  hero_cta_secondary_text: "Let's Talk",
  hero_cta_secondary_url: '#contact'
};

const fallbackProducts = [
  {
    id: 1,
    name: 'Ariso POS',
    slug: 'ariso-pos',
    category: 'Restaurant Management & POS',
    short_description: 'Comprehensive restaurant POS, table management, KOT, and multi-outlet ordering platform built for fast-paced dining operations.',
    long_description: 'Powering modern restaurant operations. Ariso POS delivers blazing-fast order processing, seamless kitchen order ticket (KOT) workflows, split-billing, inventory control, and real-time sales reporting for dine-in, takeaway, and cloud kitchens.',
    icon: 'UtensilsCrossed',
    hero_image: '',
    demo_video: '',
    video_thumbnail: '',
    external_url: 'https://restrocaptain.online/',
    cta_text: 'Explore Ariso POS',
    display_order: 1,
    is_active: 1
  },
  {
    id: 2,
    name: 'Ariso Retail',
    slug: 'ariso-retail',
    category: 'Retail POS & Inventory Management',
    short_description: 'Intuitive retail billing and management software supporting advanced product catalogs, barcode integration, inventory, and weight-based items.',
    long_description: 'Simplifying modern retail operations. Ariso Retail is engineered specifically for retail supermarkets, boutiques, and specialty stores with direct weighing scale integration, dynamic GST invoicing, barcode management, and multi-store inventory sync.',
    icon: 'Store',
    hero_image: '',
    demo_video: '',
    video_thumbnail: '',
    external_url: 'https://arisoretail.duckdns.org/',
    cta_text: 'Explore Ariso Retail',
    display_order: 2,
    is_active: 1
  },
  {
    id: 3,
    name: 'EventPass',
    slug: 'eventpass',
    category: 'Digital Event Pass & Management Platform',
    short_description: 'All-in-one digital pass generation, QR verification, attendee check-in, and ticketing engine for Garba, concerts, cultural and corporate events.',
    long_description: 'Making every event easier to manage. EventPass is a powerful event infrastructure engine designed for Navratri Garba, college festivals, concerts, corporate summits, sports tournaments, and ticketed celebrations with counterfeit-proof QR codes, offline validation, and instant crowd management analytics.',
    icon: 'Ticket',
    hero_image: '',
    demo_video: '',
    video_thumbnail: '',
    external_url: 'https://eventgen.duckdns.org/login',
    cta_text: 'Explore EventPass',
    display_order: 3,
    is_active: 1
  }
];

const SiteDataContext = createContext(null);

export function SiteDataProvider({ children }) {
  const [settings, setSettings] = useState(fallbackSettings);
  const [products, setProducts] = useState(fallbackProducts);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSiteData = useCallback(async () => {
    try {
      const [settingsRes, productsRes, testimonialsRes] = await Promise.allSettled([
        publicAPI.getSettings(),
        publicAPI.getProducts(),
        publicAPI.getTestimonials(),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data?.success) {
        setSettings((prev) => ({ ...prev, ...settingsRes.value.data.data }));
      }
      if (productsRes.status === 'fulfilled' && productsRes.value?.data?.success) {
        if (productsRes.value.data.data?.length > 0) {
          setProducts(productsRes.value.data.data);
        }
      }
      if (testimonialsRes.status === 'fulfilled' && testimonialsRes.value?.data?.success) {
        setTestimonials(testimonialsRes.value.data.data || []);
      }
    } catch (err) {
      console.warn('Using local fallback state for initial render:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSiteData();
  }, [fetchSiteData]);

  return (
    <SiteDataContext.Provider value={{ settings, products, testimonials, loading, refreshData: fetchSiteData }}>
      {children}
    </SiteDataContext.Provider>
  );
}

export function useSiteData() {
  const context = useContext(SiteDataContext);
  if (!context) throw new Error('useSiteData must be used within SiteDataProvider');
  return context;
}
