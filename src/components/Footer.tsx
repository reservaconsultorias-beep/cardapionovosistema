
import React from 'react';
import { Instagram, ShieldCheck } from "lucide-react";


export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] text-gray-300 py-12 px-4 mt-8 lg:mt-12 border-t-[6px] border-[#8b0000]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <div className="font-extrabold text-white text-2xl flex items-center gap-2 justify-center md:justify-start">
            <div className="w-8 h-8 bg-black rounded-full border-2 border-white flex items-center justify-center flex-shrink-0 relative overflow-hidden">
              <img
                src="/logo.png"
                alt=""
                className="w-full h-full object-cover absolute inset-0 z-20"
              />
              <span className="font-bold text-[10px] leading-none text-white mt-0.5 relative z-0">
                41
              </span>
            </div>
            41Menu's
          </div>
          <p className="text-sm text-gray-400 mt-2">
            © 2026 41Menu's · Entregas e Take-away · Portugal
          </p>
          <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-500 mt-2 justify-center md:justify-start">
            <ShieldCheck className="w-4 h-4" />
            <span>Site Seguro</span>
          </div>
          <a
            href="https://www.instagram.com/41menus/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#8b0000] mt-2 hover:text-white transition-colors"
          >
            <Instagram className="w-5 h-5" />
            @41menu's
          </a>
        </div>
        <div className="text-center">
          <p className="text-xl md:text-2xl font-black text-[#d4af37] animate-pulse uppercase italic tracking-wider">
            CHAMAAAA NA REDONDA!
          </p>
        </div>
        <div className="text-center md:text-right space-y-1.5">
          <p className="font-bold text-white text-lg flex items-center gap-2 justify-center md:justify-end">
            WhatsApp: +351 938 360 931
          </p>
          <p className="text-sm font-medium">Ganhe a entrega em pedidos acima de €35</p>
          <p className="text-sm font-medium text-gray-300">
            Rua Gil Vicente 47M Cotovia, Sesimbra
          </p>
          <p className="text-xs text-gray-500 pt-1">
            Horário: Seg a Sáb, 18:00 às 22:30 (Fechado aos Domingos)
          </p>
        </div>
      </div>
    </footer>
  );
}
