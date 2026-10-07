import React from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Phone, Mail, MapPin, Clock, ArrowUp, ShieldCheck,
  MessageCircle, ExternalLink, Heart, Smartphone, Download,
} from 'lucide-react';
import { SCHOOL } from '../data/school';
import { NAV_PRIMARY, NAV_MORE } from './Header';

export default function Footer() {
  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="relative mt-24 no-print">
      {/* Wave divider so the footer doesn't start on a hard line */}
      <svg className="w-full h-12 text-ink-950" viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 48h1440V16c-180 20-360 24-540 10S180-6 0 12v36z" fill="currentColor" />
      </svg>

      <div className="bg-ink-950 text-ink-200">
        <div className="max-w-7xl mx-auto px-4 pt-12 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

            {/* ---- Identity block ---- */}
            <div className="md:col-span-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brass-400 to-brass-600 flex items-center justify-center shadow-brass">
                  <GraduationCap className="w-6 h-6 text-ink-950" strokeWidth={2.3} />
                </span>
                <div>
                  <p className="font-display text-base font-extrabold text-white leading-tight">{SCHOOL.name}</p>
                  <p className="text-[11px] text-brass-300 font-semibold tracking-wide">KARHANS · PANIPAT · HARYANA</p>
                </div>
              </div>

              <p className="font-serif italic text-sm text-ink-300">"{SCHOOL.tagline}"</p>
              <p className="text-[13px] text-ink-400 leading-relaxed">
                A recognized high school serving Karhans and the surrounding villages since {SCHOOL.established}.
                We teach Pre-Primary through Class 10 on the NCERT pattern, with four working laboratories,
                a 5,000-book library and sections capped at 28 students.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <span className="chip bg-garden-500/15 text-garden-300 border border-garden-500/30">
                  <ShieldCheck className="w-3 h-3" /> HBSE Recognized
                </span>
                <span className="chip bg-brass-500/15 text-brass-300 border border-brass-500/30">
                  Code {SCHOOL.schoolCode}
                </span>
              </div>
            </div>

            {/* ---- Quick links ---- */}
            <div className="md:col-span-2">
              <h4 className="text-[11px] font-extrabold uppercase tracking-[.16em] text-brass-400 mb-4">Quick Links</h4>
              <ul className="space-y-2.5">
                {NAV_PRIMARY.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-[13px] text-ink-300 hover:text-brass-300 transition-colors inline-flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-brass-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ---- Explore ---- */}
            <div className="md:col-span-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-[.16em] text-brass-400 mb-4">Explore</h4>
              <ul className="space-y-2.5">
                {NAV_MORE.map(l => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-[13px] text-ink-300 hover:text-brass-300 transition-colors inline-flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-brass-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* ---- Reach us ---- */}
            <div className="md:col-span-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-[.16em] text-brass-400 mb-4">Reach Us</h4>
              <ul className="space-y-3.5 text-[13px]">
                <li className="flex gap-3">
                  <MapPin className="w-4 h-4 text-brass-400 shrink-0 mt-0.5" />
                  <span className="text-ink-300 leading-snug">{SCHOOL.address}</span>
                </li>
                <li className="flex gap-3">
                  <Phone className="w-4 h-4 text-garden-400 shrink-0 mt-0.5" />
                  <a href={`tel:${SCHOOL.phoneRaw}`} className="text-ink-300 hover:text-brass-300 transition-colors font-semibold">
                    {SCHOOL.phone}
                  </a>
                </li>
                <li className="flex gap-3">
                  <Mail className="w-4 h-4 text-brass-400 shrink-0 mt-0.5" />
                  <a href={`mailto:${SCHOOL.email}`} className="text-ink-300 hover:text-brass-300 transition-colors break-all">
                    {SCHOOL.email}
                  </a>
                </li>
                <li className="flex gap-3">
                  <Clock className="w-4 h-4 text-garden-400 shrink-0 mt-0.5" />
                  <span className="text-ink-300 leading-snug">
                    <span className="block">Classes: {SCHOOL.schoolHours}</span>
                    <span className="block text-ink-500">Office: {SCHOOL.officeHours}</span>
                  </span>
                </li>
              </ul>

              <div className="flex flex-wrap gap-2 mt-5">
                <a href={`https://wa.me/${SCHOOL.whatsapp}`} target="_blank" rel="noopener noreferrer"
                   className="px-3 py-2 rounded-xl bg-garden-500/15 text-garden-300 border border-garden-500/30 text-[11px] font-bold inline-flex items-center gap-1.5 hover:bg-garden-500/25 transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SCHOOL.mapQuery)}`}
                   target="_blank" rel="noopener noreferrer"
                   className="px-3 py-2 rounded-xl bg-white/8 text-ink-200 border border-white/12 text-[11px] font-bold inline-flex items-center gap-1.5 hover:bg-white/14 transition-colors">
                  <MapPin className="w-3.5 h-3.5" /> Directions <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>
            </div>
          </div>

          {/* ---- Staff app ---- */}
          <div className="mt-10 rounded-3xl bg-white/[.06] border border-white/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <span className="w-11 h-11 shrink-0 rounded-2xl bg-plum-500/20 text-plum-300 border border-plum-400/30 flex items-center justify-center">
                <Smartphone className="w-5 h-5" strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-[13.5px] font-extrabold text-white">Teachers — get the Android app</p>
                <p className="text-[11.5px] text-ink-400 mt-0.5">
                  Marks, enrolment and the register from your phone. Works offline.
                </p>
              </div>
            </div>
            <Link to="/app"
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-brass-400 text-ink-950 text-xs font-extrabold
                             inline-flex items-center gap-1.5 hover:bg-brass-300 transition-colors">
              <Download className="w-3.5 h-3.5" /> Download
            </Link>
          </div>

          {/* ---- Bottom bar ---- */}
          <div className="mt-11 pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-[12px] text-ink-400">
                © {new Date().getFullYear()} {SCHOOL.name}, {SCHOOL.village} ({SCHOOL.district}). All rights reserved.
              </p>
              <p className="text-[11px] text-ink-600 mt-1">
                {SCHOOL.affiliation} · Affiliation No. {SCHOOL.affiliationNo} · Session {SCHOOL.session}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-[11px] text-ink-600 inline-flex items-center gap-1.5">
                Built with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for our students
              </p>
              <button onClick={toTop} aria-label="Back to top"
                      className="w-9 h-9 rounded-xl bg-brass-400 text-ink-950 flex items-center justify-center shadow-brass hover:-translate-y-0.5 transition-transform">
                <ArrowUp className="w-4 h-4" strokeWidth={2.6} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
