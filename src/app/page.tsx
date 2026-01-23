'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, 
  Car, 
  MapPin, 
  Gauge, 
  Loader2, 
  CheckCircle2, 
  ChevronLeft,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

// --- UTILS ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// --- TIPOS ---
interface QuoteResponse {
  sucesso: boolean;
  modelo: string;
  ano: number | string;
  valorFipe: number;
  valorProposta: number;
  mock?: boolean;
}

// --- COMPONENTES UI ---
const Input = ({ label, ...props }: { label: string; [key: string]: any }) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider ml-1">
      {label}
    </label>
    <input
      className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3 text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all duration-300"
      {...props}
    />
  </div>
);

const Button = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'outline' | 'success' | 'danger'; 
  className?: string;
  [key: string]: any;
}) => {
  const base = "px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 shadow-lg",
    outline: "border border-neutral-800 text-neutral-400 hover:text-white hover:border-amber-600/50 bg-transparent",
    success: "bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]",
    danger: "bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40"
  };
  
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
};

// --- TIPOS AGENDAMENTO ---
interface AvailableSlot {
  start: string;
  end: string;
  display: string;
}

interface DayData {
  day: number;
  date: Date;
  isPast: boolean;
  slots: AvailableSlot[];
  hasSlots: boolean;
}

// --- COMPONENTE DE AGENDAMENTO ---
const Scheduling = ({ customerData, quoteData, onSuccess }: { 
  customerData: { name: string; plate: string; km: string };
  quoteData?: { valorFipe: number; valorProposta: number };
  onSuccess: () => void;
}) => {
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [formData, setFormData] = useState({ email: '', phone: '' });
  const [formErrors, setFormErrors] = useState({ email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: string; text: string } | null>(null);

  // Busca slots disponíveis
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const response = await fetch('/api/availability');
        const data = await response.json();
        
        if (data.ok && data.slots) {
          setAvailableSlots(data.slots);
        }
      } catch (error) {
        console.error('Erro ao buscar disponibilidade:', error);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchAvailability();
  }, []);

  // Processa calendário
  const calendar = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Agrupar slots por dia
    const slotsByDay: Record<string, AvailableSlot[]> = {};
    availableSlots.forEach(slot => {
      const date = new Date(slot.start);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!slotsByDay[dayKey]) {
        slotsByDay[dayKey] = [];
      }
      slotsByDay[dayKey].push(slot);
    });
    
    const days: (DayData | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const daySlots = slotsByDay[dayKey] || [];
      
      days.push({
        day,
        date,
        isPast,
        slots: daySlots,
        hasSlots: daySlots.length > 0
      });
    }
    
    return {
      days,
      monthName: today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    };
  }, [availableSlots]);

  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const validateForm = () => {
    const errors = { email: '', phone: '' };
    
    if (!formData.email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Telefone é obrigatório';
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      errors.phone = 'Telefone inválido';
    }
    
    setFormErrors(errors);
    return !errors.email && !errors.phone;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !selectedSlot) return;

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startIso: selectedSlot.start,
          endIso: selectedSlot.end,
          name: customerData.name,
          email: formData.email,
          phone: formData.phone,
          readableSlot: `${selectedDay?.date.toLocaleDateString('pt-BR')} ${selectedSlot.display}`,
          description: `Vistoria de veículo\nPlaca: ${customerData.plate}\nKM: ${customerData.km}`,
          valorFipe: quoteData?.valorFipe,
          valorProposta: quoteData?.valorProposta
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Erro ao criar agendamento');
      }

      setSubmitMessage({
        type: 'success',
        text: '✅ Vistoria agendada com sucesso! Verifique seu email.'
      });

      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error: any) {
      console.error('Erro ao agendar:', error);
      setSubmitMessage({
        type: 'error',
        text: error.message || 'Erro ao agendar. Tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h3 className="text-xl font-light text-white mb-6">Agende sua Vistoria</h3>
      
      {isLoadingSlots ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
        </div>
      ) : !selectedDay ? (
        <div>
          <div className="mb-4 text-neutral-400 text-sm font-medium uppercase tracking-widest">{calendar.monthName}</div>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs text-neutral-600 font-medium">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendar.days.map((dayData, index) => (
              <button
                key={index}
                disabled={!dayData || dayData.isPast || !dayData.hasSlots}
                onClick={() => dayData && dayData.hasSlots && setSelectedDay(dayData)}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-lg border text-sm font-medium transition-all",
                  !dayData && "invisible",
                  (dayData?.isPast || !dayData?.hasSlots) && "opacity-30 cursor-not-allowed border-neutral-800 text-neutral-700",
                  (!dayData?.isPast && dayData?.hasSlots) && "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white hover:bg-neutral-900/50 cursor-pointer"
                )}
              >
                {dayData?.day}
              </button>
            ))}
          </div>
        </div>
      ) : !selectedSlot ? (
        <div>
          <button
            onClick={() => setSelectedDay(null)}
            className="text-sm text-neutral-500 hover:text-white mb-4 transition-colors"
          >
            ← Voltar ao calendário
          </button>
          <div className="mb-4 text-lg font-light text-white">
            {selectedDay.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {selectedDay.slots.map((slot) => (
              <button
                key={slot.start}
                onClick={() => setSelectedSlot(slot)}
                className="py-4 px-4 rounded-lg border border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white hover:bg-neutral-900/50 transition-all text-sm font-medium"
              >
                {slot.display}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedSlot(null)}
            className="text-sm text-neutral-500 hover:text-white mb-4 transition-colors"
          >
            ← Escolher outro horário
          </button>
          
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-900/50 rounded-lg">
            <div className="text-xs text-amber-500 uppercase tracking-widest mb-1">Horário Selecionado</div>
            <div className="text-lg font-medium text-white">
              {selectedDay.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })} • {selectedSlot.display}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider ml-1 block mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setFormErrors({ ...formErrors, email: '' });
                }}
                className={cn(
                  "w-full bg-neutral-900/50 border rounded-lg px-4 py-3 text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all",
                  formErrors.email && "border-red-500"
                )}
                placeholder="seu@email.com"
              />
              {formErrors.email && <span className="text-xs text-red-400 mt-1">{formErrors.email}</span>}
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider ml-1 block mb-2">
                Telefone *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  setFormErrors({ ...formErrors, phone: '' });
                }}
                className={cn(
                  "w-full bg-neutral-900/50 border rounded-lg px-4 py-3 text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all",
                  formErrors.phone && "border-red-500"
                )}
                placeholder="(11) 99999-9999"
              />
              {formErrors.phone && <span className="text-xs text-red-400 mt-1">{formErrors.phone}</span>}
            </div>

            <Button
              variant="success"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full mt-6"
            >
              {isSubmitting ? (
                <>Agendando... <Loader2 className="w-4 h-4 animate-spin" /></>
              ) : (
                <>Confirmar Vistoria <CheckCircle2 className="w-4 h-4" /></>
              )}
            </Button>

            {submitMessage && (
              <div className={cn(
                "p-3 rounded-lg text-sm font-medium",
                submitMessage.type === 'success' && "bg-amber-900/20 border border-amber-900/50 text-amber-400",
                submitMessage.type === 'error' && "bg-red-900/20 border border-red-900/50 text-red-400"
              )}>
                {submitMessage.text}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function Home() {
  const [step, setStep] = useState(1);
  const [loadingText, setLoadingText] = useState("");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState("");
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [counterOfferData, setCounterOfferData] = useState({ value: "", whatsapp: "" });
  
  const [formData, setFormData] = useState({
    name: "",
    plate: "",
    km: "",
    city: ""
  });

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Mask Plate
  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase();
    if (value.length <= 7) {
      handleChange('plate', value);
    }
  };

  const processQuote = async () => {
    setStep(4); // Loading Screen
    setError("");
    
    const steps = ["Conectando aos parceiros...", "Consultando Tabela FIPE...", "Analisando histórico...", "Calculando depreciação..."];
    
    for (const text of steps) {
      setLoadingText(text);
      await new Promise(r => setTimeout(r, 800));
    }

    try {
      // Chama a API real do Next.js
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placa: formData.plate,
          km: parseInt(formData.km),
          nome: formData.name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Erro da API:', data);
        throw new Error(data.error || 'Erro ao processar cotação');
      }

      // Log para desenvolvimento
      if (data.mock) {
        console.log('⚠️ Usando dados mockados. Configure FIPE_API_KEY para dados reais.');
      }

      setQuote(data);
      setStep(5); // Result Screen
    } catch (err: any) {
      console.error('Erro ao processar cotação:', err);
      setError(err.message || 'Erro ao gerar cotação. Tente novamente.');
      setStep(3); // Volta para o step 3
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-800 selection:text-white">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-neutral-900">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/10 to-transparent pointer-events-none"></div>
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="flex justify-center mb-8">
            <img src="/logo-repasse.png" alt="Repasse Auto RS" className="h-16 md:h-20 w-auto" />
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Copy */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/20 border border-amber-900/30">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-[10px] uppercase tracking-widest text-amber-400/80 font-semibold">⚡ Venda em até 50 minutos</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white tracking-tight leading-tight">
                Venda seu carro em até <span className="text-amber-500">50 minutos</span> com segurança total
              </h1>
              
              <p className="text-lg text-neutral-400 leading-relaxed">
                Esqueça a exposição de dados, os curiosos e o medo de golpes. Na Repasse Auto RS, conectamos você à melhor negociação em tempo recorde.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="#cotacao" className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg hover:shadow-amber-500/50 text-center">
                  Quero Vender Meu Carro Agora
                </a>
                <a href="#seguranca" className="px-8 py-4 border border-neutral-800 text-neutral-300 rounded-lg font-medium hover:border-amber-600/50 hover:text-white transition-all text-center">
                  Como Funciona
                </a>
              </div>
            </div>
            
            {/* Vídeo */}
            <div className="relative">
              <div className="aspect-video bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shadow-2xl">
                <iframe 
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/ItsJy6_CMNM"
                  title="Venda em 50 minutos"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="absolute -bottom-4 -right-4 bg-amber-500 text-neutral-950 px-6 py-3 rounded-lg font-bold text-sm shadow-xl">
                ⏱️ 50 Min de Venda!
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="seguranca" className="py-20 border-b border-neutral-900">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
              Por que escolher a Repasse Auto RS?
            </h2>
            <p className="text-neutral-500 text-lg max-w-2xl mx-auto">
              O "faroeste" das plataformas abertas ficou para trás. Vender um veículo não deveria ser motivo de estresse.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Segurança */}
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-8 hover:border-amber-900/50 transition-all">
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">🛡️ Sua Segurança em Primeiro Lugar</h3>
              <ul className="space-y-2 text-neutral-400">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✓</span>
                  <span>Privacidade total - seus dados nunca ficam expostos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✓</span>
                  <span>Filtro anti-golpe - intermediamos 100% da conversa</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✓</span>
                  <span>Pagamento garantido - sem surpresas</span>
                </li>
              </ul>
            </div>
            
            {/* Velocidade */}
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-8 hover:border-amber-900/50 transition-all">
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">⚡ Velocidade Imbatível</h3>
              <ul className="space-y-2 text-neutral-400">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✓</span>
                  <span>Venda concluída em até 50 minutos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✓</span>
                  <span>Conexão direta com melhor negócio</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✓</span>
                  <span>O relógio corre a seu favor</span>
                </li>
              </ul>
            </div>
            
            {/* Zero Burocracia */}
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-8 hover:border-amber-900/50 transition-all">
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">📝 Zero Burocracia</h3>
              <ul className="space-y-2 text-neutral-400">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✓</span>
                  <span>Nós fazemos o trabalho sujo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✓</span>
                  <span>Papelada e trâmites legais gerenciados</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 mt-1">✓</span>
                  <span>Você só assina e recebe</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Comparação */}
      <section className="py-20 border-b border-neutral-900">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
              Por que não somos um classificado comum?
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="text-left py-4 px-6 text-neutral-400 font-medium">Classificados de Internet</th>
                  <th className="text-left py-4 px-6 text-amber-500 font-medium">Repasse Auto RS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                <tr className="hover:bg-neutral-900/30">
                  <td className="py-4 px-6 text-neutral-500">Exposição total dos seus dados e telefone</td>
                  <td className="py-4 px-6 text-white font-medium">✓ Seus dados protegidos e ocultos</td>
                </tr>
                <tr className="hover:bg-neutral-900/30">
                  <td className="py-4 px-6 text-neutral-500">Dias (ou semanas) perdidos com curiosos</td>
                  <td className="py-4 px-6 text-white font-medium">✓ Venda realizada em até 50 minutos</td>
                </tr>
                <tr className="hover:bg-neutral-900/30">
                  <td className="py-4 px-6 text-neutral-500">Risco constante de fraudes e golpes</td>
                  <td className="py-4 px-6 text-white font-medium">✓ Ambiente 100% controlado e seguro</td>
                </tr>
                <tr className="hover:bg-neutral-900/30">
                  <td className="py-4 px-6 text-neutral-500">Você cuida de toda a papelada chata</td>
                  <td className="py-4 px-6 text-white font-medium">✓ Nós resolvemos toda a burocracia</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Wizard de Cotação */}
      <section id="cotacao" className="py-20">
        <div className="container mx-auto px-4">
          <div className="w-full max-w-2xl mx-auto"
        {/* Header Minimalista */}
        <header className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-light text-white tracking-tight mb-4">
            Receba sua proposta <span className="text-amber-500">agora</span>
          </h2>
          <p className="text-neutral-500">Preencha os dados e veja quanto seu carro vale em tempo real</p>
        </header>

        {/* Wizard Container */}
        <div className="relative bg-neutral-900/20 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 md:p-10 shadow-2xl overflow-hidden min-h-[400px] flex flex-col justify-center">
          
          {/* Progress Bar Sutil */}
          {step < 6 && (
            <div className="absolute top-0 left-0 h-1 bg-neutral-800 w-full">
              <div 
                className="h-full bg-white transition-all duration-700 ease-out"
                style={{ width: `${(step / 5) * 100}%` }}
              />
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* STEP 1: IDENTIFICATION */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
              <h2 className="text-xl font-light text-white">Como podemos te chamar?</h2>
              <Input 
                label="Nome Completo" 
                placeholder="Ex: João da Silva" 
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
                autoFocus
              />
              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} disabled={!formData.name.trim() || formData.name.trim().length < 3}>
                  Continuar <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: VEHICLE */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
              <h2 className="text-xl font-light text-white">Qual carro vamos avaliar?</h2>
              <div className="relative">
                <Input 
                  label="Placa do Veículo" 
                  placeholder="ABC1D23" 
                  value={formData.plate}
                  onChange={handlePlateChange}
                  maxLength={7}
                  autoFocus
                />
                {formData.plate.length === 7 && (
                  <div className="absolute right-4 top-9 text-amber-500 animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </div>
              
              {formData.plate.length === 7 && (
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <Car className="w-5 h-5 text-neutral-500" />
                  <span className="text-sm text-neutral-300">Placa registrada. Consultaremos os dados FIPE.</span>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}><ChevronLeft className="w-4 h-4"/></Button>
                <Button onClick={handleNext} disabled={formData.plate.length < 7}>
                  Continuar <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: DETAILS */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-6">
              <h2 className="text-xl font-light text-white">Quase lá. Detalhes finais.</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Input 
                    label="Quilometragem" 
                    type="number" 
                    placeholder="Ex: 55000" 
                    value={formData.km}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('km', e.target.value)}
                  />
                  <Gauge className="absolute right-4 top-9 w-4 h-4 text-neutral-600" />
                </div>
                
                <div className="relative">
                  <Input 
                    label="Cidade / Estado" 
                    placeholder="Ex: São Paulo, SP" 
                    value={formData.city}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('city', e.target.value)}
                  />
                  <MapPin className="absolute right-4 top-9 w-4 h-4 text-neutral-600" />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={handleBack}><ChevronLeft className="w-4 h-4"/></Button>
                <Button onClick={processQuote} disabled={!formData.km || !formData.city}>
                  Calcular Oferta <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: LOADING */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-700">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500 blur-xl opacity-20 rounded-full"></div>
                <Loader2 className="w-12 h-12 text-white animate-spin relative z-10" />
              </div>
              <p className="mt-6 text-neutral-400 font-mono text-sm animate-pulse">
                {loadingText}
              </p>
            </div>
          )}

          {/* STEP 5: PROPOSAL */}
          {step === 5 && quote && (
            <div className="animate-in fade-in zoom-in duration-500">
              {quote.mock && (
                <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-900/50 rounded-lg text-yellow-400 text-xs">
                  ⚠️ Modo Desenvolvimento: Dados simulados. Configure FIPE_API_KEY para dados reais.
                </div>
              )}
              <div className="text-center mb-8">
                <p className="text-neutral-500 text-sm uppercase tracking-widest mb-2">Pre Proposta</p>
                <h2 className="text-2xl font-light text-white mb-1">{quote.modelo}</h2>
                <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm">
                  <span>{formData.plate}</span> • <span>{formData.km} km</span> • <span>Ano {quote.ano}</span>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ShieldCheck className="w-24 h-24" />
                </div>
                
                <div className="flex flex-col md:flex-row items-end justify-between gap-4 relative z-10">
                  <div>
                    <p className="text-neutral-500 text-xs mb-1">Tabela FIPE (Referência)</p>
                    <p className="text-neutral-400 line-through text-lg">{formatCurrency(quote.valorFipe)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-500 text-xs font-bold uppercase tracking-wider mb-1">Oferta à vista</p>
                    <p className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
                      {formatCurrency(quote.valorProposta)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="danger" onClick={() => setShowCounterOffer(!showCounterOffer)}>
                  {showCounterOffer ? "Cancelar" : "Recusar Oferta"}
                </Button>
                <Button variant="success" onClick={() => setStep(6)}>
                  Aceitar e Agendar
                </Button>
              </div>

              {showCounterOffer && (
                <div className="mt-6 p-6 bg-neutral-900/50 border border-neutral-800 rounded-xl animate-in fade-in slide-in-from-top-4 duration-300">
                  <h3 className="text-lg font-light text-white mb-4">Faça sua Proposta</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider ml-1 block mb-2">
                        Qual valor você aceita?
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: R$ 70.000"
                        value={counterOfferData.value}
                        onChange={(e) => setCounterOfferData({ ...counterOfferData, value: e.target.value })}
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3 text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider ml-1 block mb-2">
                        WhatsApp para contato
                      </label>
                      <input
                        type="tel"
                        placeholder="(51) 99999-9999"
                        value={counterOfferData.whatsapp}
                        onChange={(e) => setCounterOfferData({ ...counterOfferData, whatsapp: e.target.value })}
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3 text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all"
                      />
                    </div>
                    <Button 
                      variant="success" 
                      className="w-full"
                      disabled={!counterOfferData.value || !counterOfferData.whatsapp}
                      onClick={() => {
                        alert(`✅ Contraproposta enviada!\n\nValor: ${counterOfferData.value}\nWhatsApp: ${counterOfferData.whatsapp}\n\nNosso vendedor entrará em contato em breve.`);
                        setShowCounterOffer(false);
                        setCounterOfferData({ value: "", whatsapp: "" });
                      }}
                    >
                      Enviar Contraproposta
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-center text-[10px] text-neutral-600 mt-4 max-w-xs mx-auto">
                *Oferta válida por 48 horas. Sujeita a vistoria física. O valor pode sofrer alterações caso o veículo apresente avarias.
              </p>
            </div>
          )}

          {/* STEP 6: SCHEDULING */}
          {step === 6 && (
            <Scheduling 
              customerData={{
                name: formData.name,
                plate: formData.plate,
                km: formData.km
              }}
              quoteData={quote ? {
                valorFipe: quote.valorFipe,
                valorProposta: quote.valorProposta
              } : undefined}
              onSuccess={() => {
                alert(`✅ Vistoria agendada com sucesso!\n\nVerifique seu email para detalhes do agendamento.`);
                setStep(1);
                setFormData({ name: "", plate: "", km: "", city: "" });
                setQuote(null);
              }}
            />
          )}

        </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6">
            <img src="/logo-repasse.png" alt="Repasse Auto RS" className="h-12 w-auto mx-auto opacity-50" />
          </div>
          <p className="text-neutral-600 text-sm">© 2026 Repasse Auto RS. Todos os direitos reservados.</p>
          <p className="mt-2 text-neutral-700 text-xs">Atendimento especializado no Rio Grande do Sul</p>
        </div>
      </footer>
    </div>
  );
}
