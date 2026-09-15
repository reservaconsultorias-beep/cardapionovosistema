import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { Star, Award, ChevronDown, Users, ShoppingBag, Pizza, Beer, Truck, Package, Store, MapPin, Gift, HeartHandshake } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

// --- DADOS REAIS DO SUPABASE (Produção) ---
const revenueData = [
  { name: 'Sem. 3/8', total: 1052.06 },
  { name: 'Sem. 4/8', total: 921.66 },
  { name: 'Sem. 5/8', total: 504.63 },
  { name: 'Sem. 1/9', total: 1356.72 },
  { name: 'Sem. 2/9', total: 1439.91 },
];

const paymentData = [
  { name: 'MB Way', value: 118, color: '#3b82f6' },
  { name: 'Numerário', value: 59, color: '#22c55e' },
];

const topCategoriesData = [
  { name: 'Esfihas Trad.', value: 355 },
  { name: 'Pizzas Trad.', value: 138 },
  { name: 'Bebidas', value: 98 },
  { name: 'Esfihas Especiais', value: 83 },
  { name: 'Esfihas Doces', value: 72 },
];

const top5General = [
  { rank: 1, name: '5 - Carne', qty: 94, img: '/65-carne.png', cat: 'Esfihas' },
  { rank: 2, name: '9 - Frango com Catupiry', qty: 68, img: '/esfiha-frango-catupiry-nova.jpg', cat: 'Esfihas' },
  { rank: 3, name: 'Coca-Cola (Garrafa 1L)', qty: 34, img: 'https://tipnhvpivhaerumetona.supabase.co/storage/v1/object/public/Cardapio41menus/41menus/produtos/34sokuoe2ro.png', cat: 'Bebidas' },
  { rank: 4, name: '22 - Queijo', qty: 26, img: '/82-queijo.png', cat: 'Esfihas' },
  { rank: 5, name: '3 - Calapiry', qty: 25, img: 'https://tipnhvpivhaerumetona.supabase.co/storage/v1/object/public/Cardapio41menus/41menus/produtos/cnkcifdzgx7.png', cat: 'Esfihas' },
];

const top5Esfihas = [
  { rank: 1, name: '5 - Carne', qty: 94, img: '/65-carne.png' },
  { rank: 2, name: '9 - Frango com Catupiry', qty: 68, img: '/esfiha-frango-catupiry-nova.jpg' },
  { rank: 3, name: '22 - Queijo', qty: 26, img: '/82-queijo.png' },
  { rank: 4, name: '3 - Calapiry', qty: 25, img: 'https://tipnhvpivhaerumetona.supabase.co/storage/v1/object/public/Cardapio41menus/41menus/produtos/cnkcifdzgx7.png' },
  { rank: 5, name: '2 - Calabresa', qty: 22, img: '/62-calabresa.png' },
];

const top5Bebidas = [
  { rank: 1, name: 'Coca-Cola 1L', qty: 34, img: '/cocacolagarrafa1litronormalezero.png' },
  { rank: 2, name: 'Ice Tea Pêssego', qty: 14, img: '/iceteapessegolata.png' },
  { rank: 3, name: 'Água', qty: 9, img: '/agua.png' },
  { rank: 4, name: 'Cerveja Heineken', qty: 8, img: '/cervejaheineken.png' },
  { rank: 5, name: 'Coca-Cola Zero', qty: 8, img: '/cocacolagarrafa1litronormalezero.png' },
];

const top5Pizzas = [
  { rank: 1, name: '19 - Frango c/ Catupiry (G)', qty: 18, img: '/frango-catupiry-real.jpg', cat: 'Tradicionais' },
  { rank: 2, name: '19 - Frango c/ Catupiry (M)', qty: 12, img: '/frango-catupiry-real.jpg', cat: 'Tradicionais' },
  { rank: 3, name: '19 - Frango c/ Catupiry (P)', qty: 9, img: '/frango-catupiry-real.jpg', cat: 'Tradicionais' },
  { rank: 4, name: 'Meio Frango / Meio Calabresa', qty: 6, img: '/meio-frango-meio-calabresa.jpg', cat: 'Tradicionais' },
  { rank: 5, name: 'Meio Frango / Meio Portuguesa', qty: 6, img: '/meio-frango-meio-portuguesa.jpg', cat: 'Tradicionais' },
];

const topZones = [
  { name: 'Cotovia', value: 16 },
  { name: 'Almoinha', value: 15 },
  { name: 'Vila de Sesimbra', value: 11 },
  { name: 'Azeitão', value: 7 },
  { name: 'Santana', value: 7 },
];

const retentionChartData = [
  { name: 'Novos', value: 71, color: '#facc15' }, // ambar
  { name: 'Retidos (2+)', value: 25, color: '#22c55e' } // green
];

export default function InteractiveReport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // Preloader Logic
  useEffect(() => {
    console.log('Preloader useEffect started');
    const timer = setTimeout(() => {
      console.log('Preloader timer finished, setting loading false');
      setLoading(false);
    }, 1000);
    return () => {
      console.log('Preloader cleanup');
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!loading) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const xPos = (clientX / window.innerWidth - 0.5) * 60; 
      const yPos = (clientY / window.innerHeight - 0.5) * 60;

      gsap.to('.preloader-logo', {
        rotateX: -yPos,
        rotateY: xPos,
        x: xPos * 0.5,
        y: yPos * 0.5,
        duration: 1,
        ease: 'power3.out',
        transformPerspective: 1000
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    gsap.fromTo('.preloader-logo', 
      { scale: 0.5, opacity: 0 }, 
      { scale: 1, opacity: 1, duration: 1.5, ease: 'elastic.out(1, 0.5)' }
    );

    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    let ctx = gsap.context(() => {
      // 1. Hero Animation
      gsap.from('.hero-logo', { scale: 0.5, opacity: 0, duration: 1.5, ease: 'elastic.out(1, 0.5)' });
      gsap.from('.hero-title', { y: 50, opacity: 0, duration: 1, ease: 'power4.out', stagger: 0.2, delay: 0.3 });
      
      // Animated Mouse Scroll Indicator GSAP
      gsap.to('.mouse-wheel', { y: 12, opacity: 0, repeat: -1, duration: 1.5, ease: 'power2.out' });

      // Parallax ScrollTrigger
      gsap.to('.hero-content', {
        y: -150,
        opacity: 0,
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: 1
        }
      });
      
      gsap.to('.hero-glow', {
        y: 300,
        scale: 1.5,
        opacity: 0,
        scrollTrigger: {
          trigger: '.hero-section',
          start: 'top top',
          end: 'bottom top',
          scrub: true
        }
      });

      // 2. Animate sections on scroll
      const sections = gsap.utils.toArray('.fade-up-section');
      sections.forEach((section: any) => {
        gsap.from(section, {
          y: 50, opacity: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: section, start: 'top 80%', toggleActions: 'play none none reverse' }
        });
      });

      // 3. Animate Products Arrays (Staggered)
      const containers = gsap.utils.toArray('.stagger-container');
      containers.forEach((container: any) => {
        const cards = container.querySelectorAll('.stagger-item');
        gsap.from(cards, {
          scale: 0.9, opacity: 0, duration: 0.8, stagger: 0.15, ease: 'back.out(1.5)',
          scrollTrigger: { trigger: container, start: 'top 80%' }
        });
      });
      
    }, containerRef);
    return () => ctx.revert();
  }, [loading]);

  const PodiumSection = ({ title, icon: Icon, data }: { title: string, icon: any, data: any[] }) => (
    <section className="fade-up-section py-24 px-6 max-w-6xl mx-auto border-t border-stone-800 relative z-20">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-12 h-12 rounded-full bg-[#fdde58] text-[#1C1917] flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white">{title}</h2>
      </div>

      <div className="stagger-container grid grid-cols-1 md:grid-cols-5 gap-6">
        {data.map((product) => (
          <div key={product.rank} className="stagger-item group relative bg-[#292524] rounded-2xl overflow-hidden border border-stone-700 hover:border-[#fdde58] transition-colors duration-300">
            <div className="aspect-[4/5] overflow-hidden bg-[#1c1917] flex items-center justify-center">
              <img src={product.img} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917] via-transparent to-transparent opacity-90"></div>
            </div>
            
            <div className="absolute bottom-0 left-0 w-full p-4">
              <span className="inline-block px-2 py-1 bg-[#1C1917]/80 text-[#fdde58] text-[9px] font-black tracking-wider uppercase rounded mb-1.5 backdrop-blur-sm border border-stone-700">
                # {product.rank} {product.cat ? `• ${product.cat}` : ''}
              </span>
              <h3 className="text-sm font-bold text-white leading-tight mb-1">{product.name}</h3>
              <p className="text-stone-400 text-xs font-medium">{product.qty} unidades vendidas</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  if (loading) {
    return (
      <div className="preloader-wrapper fixed inset-0 z-50 bg-[#1C1917] flex items-center justify-center overflow-hidden" style={{ perspective: '1000px' }}>
        <div className="preloader-logo" style={{ transformStyle: 'preserve-3d' }}>
          <img src="/logo-pizza-white.png" alt="Loading" className="w-64 h-64 md:w-96 md:h-96 object-contain drop-shadow-[0_0_30px_rgba(253,222,88,0.3)]" />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="bg-[#1C1917] text-[#FAFAF9] min-h-screen font-sans">
      
      {/* Hero Section */}
      <section className="hero-section relative h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[#1C1917]">
          <div className="hero-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#fdde58] rounded-full opacity-10 blur-[150px]"></div>
        </div>

        <div className="hero-content relative z-10 max-w-4xl flex flex-col items-center">
          <div className="hero-logo w-32 h-32 md:w-48 md:h-48 mb-8 bg-black rounded-full border-4 border-stone-800 flex items-center justify-center shadow-2xl overflow-hidden relative">
            <img src="/logo.png" alt="41 Menus Logo" className="w-full h-full object-cover absolute inset-0 z-20" />
          </div>

          <h1 className="hero-title text-5xl md:text-6xl lg:text-7xl font-black mb-6 tracking-tight leading-none text-white">
            DADOS ESTRATÉGICOS <span className="text-[#fdde58]">41 MENUS</span>
          </h1>
          <p className="hero-title text-xl text-stone-400 font-light max-w-2xl mx-auto">
            Da concentração de categorias à fidelização de clientes e pódios de lucro.
          </p>
        </div>
        
        <div className="scroll-indicator absolute bottom-12 z-10 flex flex-col items-center text-stone-500 cursor-pointer" onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}>
          <div className="w-[28px] h-[44px] border-2 border-[#fdde58] rounded-full flex justify-center p-1 mb-2 opacity-80">
            <div className="w-1.5 h-2.5 bg-[#fdde58] rounded-full mouse-wheel"></div>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-[#fdde58] opacity-80">Rolar</span>
        </div>
      </section>

      <main className="relative z-20 bg-[#1C1917]">
        
        {/* KPI Section */}
        <section className="fade-up-section py-20 px-6 max-w-6xl mx-auto border-t border-stone-800">
          <div className="kpi-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="data-card bg-[#292524] p-8 rounded-3xl border border-stone-700 shadow-xl flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-stone-500 transition-all duration-300">
              <ShoppingBag className="w-8 h-8 text-[#fdde58] mb-4 opacity-90" />
              <p className="text-stone-400 font-bold mb-1 uppercase tracking-widest text-[10px]">Total de Pedidos</p>
              <p className="text-5xl font-black text-white tabular-nums tracking-tighter">177</p>
            </div>
            <div className="data-card bg-[#292524] p-8 rounded-3xl border border-stone-700 shadow-xl flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-stone-500 transition-all duration-300">
              <Star className="w-8 h-8 text-[#fdde58] mb-4 opacity-90" />
              <p className="text-stone-400 font-bold mb-1 uppercase tracking-widest text-[10px]">Itens Vendidos</p>
              <p className="text-5xl font-black text-white tabular-nums tracking-tighter">813</p>
            </div>
            <div className="data-card bg-[#292524] p-8 rounded-3xl border border-stone-700 shadow-xl flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-stone-500 transition-all duration-300">
              <Users className="w-8 h-8 text-[#fdde58] mb-4 opacity-90" />
              <p className="text-stone-400 font-bold mb-1 uppercase tracking-widest text-[10px]">Clientes Únicos</p>
              <p className="text-5xl font-black text-white tabular-nums tracking-tighter">96</p>
            </div>
            <div className="data-card bg-[#292524] p-8 rounded-3xl border border-[#fdde58] shadow-[0_0_30px_rgba(253,222,88,0.15)] flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(253,222,88,0.3)] transition-all duration-300">
              <span className="bg-[#fdde58] text-[#1C1917] px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mb-3">Recorde</span>
              <p className="text-stone-400 font-bold mb-1 uppercase tracking-widest text-[10px]">Faturamento Total</p>
              <p className="text-4xl font-black text-[#fdde58] tabular-nums tracking-tighter">€ 5.274,98</p>
              <p className="text-stone-500 font-medium text-[11px] mt-2 tracking-wide">Ticket Médio: € 29.80</p>
            </div>
          </div>

          {/* Logistics KPIs */}
          <div className="kpi-grid grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="data-card bg-[#292524] p-6 rounded-3xl border border-stone-700 shadow-xl flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-stone-500 transition-all duration-300">
              <Truck className="w-8 h-8 text-[#3b82f6] mb-3 opacity-90" />
              <p className="text-stone-400 font-bold mb-1 uppercase tracking-widest text-[10px]">Entregas (Delivery)</p>
              <p className="text-4xl font-black text-white tabular-nums tracking-tighter">86</p>
            </div>
            <div className="data-card bg-[#292524] p-6 rounded-3xl border border-stone-700 shadow-xl flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-stone-500 transition-all duration-300">
              <Package className="w-8 h-8 text-[#22c55e] mb-3 opacity-90" />
              <p className="text-stone-400 font-bold mb-1 uppercase tracking-widest text-[10px]">Retiradas (Takeaway)</p>
              <p className="text-4xl font-black text-white tabular-nums tracking-tighter">88</p>
            </div>
            <div className="data-card bg-[#292524] p-6 rounded-3xl border border-stone-700 shadow-xl flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-stone-500 transition-all duration-300">
              <Store className="w-8 h-8 text-[#a8a29e] mb-3 opacity-90" />
              <p className="text-stone-400 font-bold mb-1 uppercase tracking-widest text-[10px]">Balcão / Salão (PDV)</p>
              <p className="text-4xl font-black text-white tabular-nums tracking-tighter">3</p>
            </div>
          </div>

          {/* Dados Estratégicos Adicionais */}
          <div className="kpi-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
            <div className="data-card bg-[#292524] p-6 rounded-3xl border border-[#fdde58]/30 shadow-xl flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-[#fdde58] transition-all duration-300">
              <span className="text-[#fdde58] font-bold text-[10px] uppercase tracking-widest mb-3">Maior Pedido</span>
              <p className="text-3xl font-black text-white tabular-nums tracking-tighter">€ 104,50</p>
              <p className="text-stone-500 font-medium text-[11px] mt-2 tracking-wide">Registrado em 18/08</p>
            </div>
            
            <div className="data-card bg-[#292524] p-6 rounded-3xl border border-stone-700 shadow-xl flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-stone-400 transition-all duration-300">
              <span className="text-stone-400 font-bold text-[10px] uppercase tracking-widest mb-3">Horário de Pico</span>
              <p className="text-3xl font-black text-white tabular-nums tracking-tighter">20:00 h</p>
              <p className="text-stone-500 font-medium text-[11px] mt-2 tracking-wide">Maior fluxo de clientes</p>
            </div>

            <div className="data-card bg-[#292524] p-6 rounded-3xl border border-[#3b82f6]/30 shadow-xl flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-[#3b82f6] transition-all duration-300">
              <span className="text-[#3b82f6] font-bold text-[10px] uppercase tracking-widest mb-3">Melhor Dia</span>
              <p className="text-3xl font-black text-white tabular-nums tracking-tighter">Sábado</p>
              <p className="text-stone-500 font-medium text-[11px] mt-2 tracking-wide">Média de vendas mais alta</p>
            </div>

            <div className="data-card bg-[#292524] p-6 rounded-3xl border border-[#22c55e]/30 shadow-xl flex flex-col items-center justify-center text-center hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:border-[#22c55e] transition-all duration-300">
              <span className="text-[#22c55e] font-bold text-[10px] uppercase tracking-widest mb-3">Maior Faturamento Diário</span>
              <p className="text-3xl font-black text-white tabular-nums tracking-tighter">€ 358,36</p>
              <p className="text-stone-500 font-medium text-[11px] mt-2 tracking-wide">Recorde batido em 31/08</p>
            </div>
          </div>
        </section>

        {/* CRM & Fidelização */}
        <section className="fade-up-section py-24 px-6 max-w-7xl mx-auto border-t border-stone-800">
          <div className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 rounded-full bg-[#fdde58] text-[#1C1917] flex items-center justify-center">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white">CRM & Logística</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Retenção de Clientes */}
            <div className="bg-[#292524] p-8 rounded-3xl border border-stone-700 flex flex-col">
              <h3 className="text-xl font-bold text-white mb-2">Fidelização de Clientes</h3>
              <p className="text-stone-400 text-sm mb-6">Proporção de clientes que voltaram a comprar.</p>
              
              <div className="flex-1 min-h-[250px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={retentionChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                      {retentionChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1C1917', borderColor: '#444', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center bg-[#1c1917] p-3 rounded-lg">
                  <span className="text-stone-300 font-bold text-sm">Novos (1 pedido)</span>
                  <span className="text-[#facc15] font-mono font-black text-lg">71</span>
                </div>
                <div className="flex justify-between items-center bg-[#1c1917] p-3 rounded-lg">
                  <span className="text-stone-300 font-bold text-sm">Retidos (2+ pedidos)</span>
                  <span className="text-[#22c55e] font-mono font-black text-lg">25</span>
                </div>
                <div className="flex justify-between items-center border border-stone-700 p-3 rounded-lg">
                  <span className="text-stone-400 font-bold text-sm">Fãs (3+ pedidos)</span>
                  <span className="text-white font-mono font-black text-lg">11</span>
                </div>
              </div>
            </div>

            {/* Zonas de Entrega */}
            <div className="bg-[#292524] p-8 rounded-3xl border border-stone-700">
              <div className="flex items-center gap-3 mb-2">
                <MapPin className="text-[#fdde58] w-6 h-6" />
                <h3 className="text-xl font-bold text-white">Top Zonas de Entrega</h3>
              </div>
              <p className="text-stone-400 text-sm mb-6">Regiões com maior volume de pedidos expedidos.</p>

              <div className="space-y-4">
                {topZones.map((zone, idx) => (
                  <div key={zone.name} className="flex items-center gap-4 relative">
                    <div className="w-8 h-8 rounded-full bg-[#1c1917] border border-stone-700 flex items-center justify-center text-stone-400 font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-white font-bold text-sm">{zone.name}</span>
                        <span className="text-[#fdde58] font-mono font-bold text-sm">{zone.value} ped.</span>
                      </div>
                      <div className="w-full bg-[#1c1917] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#fdde58] h-full" style={{ width: `${(zone.value / topZones[0].value) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Frete Grátis */}
            <div className="bg-[#292524] p-8 rounded-3xl border border-[#22c55e] shadow-[0_0_30px_rgba(34,197,94,0.1)] flex flex-col items-center justify-center text-center">
              <Gift className="w-16 h-16 text-[#22c55e] mb-6" />
              <h3 className="text-2xl font-bold text-white mb-2">Pedidos com Frete Grátis</h3>
              <p className="text-stone-400 text-sm mb-6">Entregas acima de € 35,00 que dispararam o gatilho de frete por conta da casa.</p>
              
              <div className="bg-[#1c1917] rounded-2xl p-6 border border-stone-700 w-full">
                <p className="text-6xl font-black text-[#22c55e] tabular-nums">37</p>
                <p className="text-stone-500 font-bold uppercase tracking-widest text-xs mt-2">Pedidos Atingidos</p>
              </div>
            </div>

          </div>
        </section>

        {/* Faturamento e Categorias (Side by Side) */}
        <section className="fade-up-section py-24 px-6 max-w-7xl mx-auto border-t border-stone-800">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Crescimento Semanal</h2>
              <p className="text-stone-400 mb-8">Evolução do Faturamento</p>
              <div className="bg-[#292524] p-6 rounded-3xl border border-stone-700 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fdde58" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#fdde58" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                    <XAxis dataKey="name" stroke="#a8a29e" tick={{fill: '#a8a29e', fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis stroke="#a8a29e" tick={{fill: '#a8a29e', fontSize: 12}} tickFormatter={(value) => `€${value}`} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1C1917', borderColor: '#444', borderRadius: '12px' }} itemStyle={{ color: '#fdde58' }} />
                    <Area type="monotone" dataKey="total" stroke="#fdde58" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Categorias Mais Vendidas</h2>
              <p className="text-stone-400 mb-8">Volume de Produtos por Grupo</p>
              <div className="bg-[#292524] p-6 rounded-3xl border border-stone-700 h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCategoriesData} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                    <XAxis type="number" stroke="#a8a29e" axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#a8a29e" axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#333'}} contentStyle={{ backgroundColor: '#1C1917', borderColor: '#444', borderRadius: '12px' }} />
                    <Bar dataKey="value" fill="#fdde58" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* Podiums */}
        <PodiumSection title="Top 5: Mais Vendidos (Geral)" icon={Award} data={top5General} />
        <PodiumSection title="Top 5: O Coração (Esfihas)" icon={Pizza} data={top5Esfihas} />
        <PodiumSection title="Top 5: As Grandes (Pizzas)" icon={Pizza} data={top5Pizzas} />
        <PodiumSection title="Top 5: Margem Alta (Bebidas)" icon={Beer} data={top5Bebidas} />
        
        {/* Payment Methods */}
        <section className="fade-up-section py-24 px-6 max-w-6xl mx-auto border-t border-stone-800 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Domínio do MB Way</h2>
            <p className="text-stone-400 text-lg leading-relaxed mb-8">
              A adoção de pagamentos móveis é esmagadora. O <strong>MB Way</strong> registrou 118 pagamentos, provando a digitalização do cliente da 41 Menus.
            </p>
            
            <div className="space-y-4">
              {paymentData.map((method) => (
                <div key={method.name} className="flex items-center gap-4 bg-[#292524] p-4 rounded-2xl border border-stone-700">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: method.color }}></div>
                  <p className="text-white font-bold flex-1">{method.name}</p>
                  <p className="text-[#fdde58] font-mono font-bold text-xl">{method.value}</p>
                  <p className="text-stone-500 text-sm">pedidos</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 h-[400px] w-full relative">
            <div className="absolute inset-0 flex items-center justify-center flex-col z-10 pointer-events-none">
               <span className="text-white text-5xl font-black">66%</span>
               <span className="text-stone-400 text-sm font-bold uppercase tracking-widest mt-1">MB Way</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="50%" innerRadius={100} outerRadius={140} paddingAngle={5} dataKey="value" stroke="none">
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1C1917', borderColor: '#444', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Footer Cta */}
        <section className="fade-up-section py-32 px-6 text-center border-t border-stone-800">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8">E isso é só o começo.</h2>
          <a href="/admin" className="inline-block bg-[#fdde58] text-[#1C1917] px-8 py-4 rounded-xl font-black text-lg uppercase tracking-wide hover:bg-white hover:scale-105 transition-all shadow-xl shadow-[#fdde58]/20">
            CONTE COM NOSSA EQUIPE !
          </a>
        </section>
        
      </main>
    </div>
  );
}
