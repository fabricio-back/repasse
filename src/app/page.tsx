'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { SplitText, HighlightText } from '@/components/SplitText';

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
      className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3.5 text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all duration-300"
      style={{ fontSize: '16px' }}
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
  const base = "px-6 py-3.5 min-h-[44px] rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation";
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
  customerData: { name: string; plate: string; km: string; modelo?: string };
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
  const [submitMessage, setSubmitMessage] = useState<{ type: string; text: string; scheduledDate?: string; scheduledTime?: string } | null>(null);

  // Navegação de mês: 0 = mês atual, 1 = próximo mês
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const isLastWeek = today.getDate() >= lastDayOfMonth - 6;
  const [viewMonthOffset, setViewMonthOffset] = useState(isLastWeek ? 1 : 0);

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
    const now = new Date();
    const viewDate = new Date(today.getFullYear(), today.getMonth() + viewMonthOffset, 1);
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Agrupar slots por dia
    const slotsByDay: Record<string, AvailableSlot[]> = {};
    availableSlots.forEach(slot => {
      const date = new Date(slot.start);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!slotsByDay[dayKey]) slotsByDay[dayKey] = [];
      slotsByDay[dayKey].push(slot);
    });
    
    const days: (DayData | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const daySlots = slotsByDay[dayKey] || [];
      
      const isToday = date.toDateString() === now.toDateString();
      const availableSlotsForDay = isToday 
        ? daySlots.filter(slot => new Date(slot.start) > now)
        : daySlots;
      
      days.push({
        day,
        date,
        isPast,
        slots: availableSlotsForDay,
        hasSlots: availableSlotsForDay.length > 0
      });
    }
    
    return {
      days,
      monthName: viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      isCurrentMonth: viewMonthOffset === 0,
      isNextMonth: viewMonthOffset === 1,
    };
  }, [availableSlots, viewMonthOffset]);

  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  // Filtra slots do dia selecionado, removendo horários passados se for hoje
  const filteredSelectedDaySlots = useMemo(() => {
    if (!selectedDay) return [];
    
    const now = new Date();
    const isToday = selectedDay.date.toDateString() === now.toDateString();
    
    if (isToday) {
      // Se for hoje, filtra horários que já passaram
      return selectedDay.slots.filter(slot => {
        const slotTime = new Date(slot.start);
        return slotTime > now;
      });
    }
    
    // Se não for hoje, retorna todos os slots
    return selectedDay.slots;
  }, [selectedDay]);

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
        // Conflito de horário (409): recarrega slots, volta ao calendário e avisa sem loop
        if (response.status === 409) {
          setSelectedSlot(null);
          setSelectedDay(null);
          setSubmitMessage({ type: 'error', text: 'Este horário acabou de ser ocupado. Escolha outro horário.' });
          // Recarrega disponibilidade atualizada
          fetch('/api/availability')
            .then(r => r.json())
            .then(d => { if (d.ok && d.slots) setAvailableSlots(d.slots); });
          return; // sai sem lançar erro (evita loop)
        }
        throw new Error(data.error || 'Erro ao criar agendamento');
      }

      // Formata data e hora para exibição
      const scheduledDate = selectedDay?.date.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      });
      const scheduledTime = selectedSlot.display;

      setSubmitMessage({
        type: 'success',
        text: '',
        scheduledDate,
        scheduledTime
      });

      // Não redireciona mais automaticamente - usuário pode ver o aviso
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

      {/* Aviso de erro sempre visível (aparece mesmo ao voltar ao calendário) */}
      {submitMessage?.type === 'error' && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-900/50 text-red-400 text-sm font-medium">
          {submitMessage.text}
        </div>
      )}
      
      {isLoadingSlots ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
        </div>
      ) : !selectedDay ? (
        <div>
          {/* Navegação de mês */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setViewMonthOffset(0)}
              disabled={calendar.isCurrentMonth}
              className={`text-sm px-3 py-1 rounded transition-colors ${calendar.isCurrentMonth ? 'text-neutral-700 cursor-default' : 'text-amber-500 hover:text-amber-400'}`}
            >
              ← {new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('pt-BR', { month: 'long' })}
            </button>
            <span className="text-neutral-400 text-sm font-medium uppercase tracking-widest capitalize">
              {calendar.monthName}
            </span>
            <button
              onClick={() => setViewMonthOffset(1)}
              disabled={calendar.isNextMonth}
              className={`text-sm px-3 py-1 rounded transition-colors ${calendar.isNextMonth ? 'text-neutral-700 cursor-default' : 'text-amber-500 hover:text-amber-400'}`}
            >
              {new Date(today.getFullYear(), today.getMonth() + 1, 1).toLocaleDateString('pt-BR', { month: 'long' })} →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs text-neutral-600 font-medium">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendar.days.map((dayData, index) => (
              <button
                key={index}
                disabled={!dayData || dayData.isPast || !dayData.hasSlots}
                onClick={() => dayData && dayData.hasSlots && setSelectedDay(dayData)}
                aria-label={dayData ? `Dia ${dayData.day}${dayData.hasSlots ? ' - disponível' : ' - indisponível'}` : 'vazio'}
                className={cn(
                  "aspect-square min-h-[44px] flex items-center justify-center rounded-lg border text-sm font-medium transition-all touch-manipulation",
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
            className="text-sm text-neutral-500 hover:text-white mb-4 transition-colors py-2 px-3 -ml-3 rounded touch-manipulation"
            aria-label="Voltar ao calendário"
          >
            ← Voltar ao calendário
          </button>
          <div className="mb-4 text-lg font-light text-white">
            {selectedDay.date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
          </div>
          {filteredSelectedDaySlots.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredSelectedDaySlots.map((slot) => (
                <button
                  key={slot.start}
                  onClick={() => { setSelectedSlot(slot); setSubmitMessage(null); }}
                  aria-label={`Horário ${slot.display}`}
                  className="py-4 px-4 min-h-[56px] rounded-lg border border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white hover:bg-neutral-900/50 transition-all text-sm font-medium touch-manipulation active:scale-95"
                >
                  {slot.display}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              Não há mais horários disponíveis para hoje.
              <br />
              <button
                onClick={() => setSelectedDay(null)}
                className="mt-4 text-amber-500 hover:text-amber-400 transition-colors"
              >
                Escolher outro dia
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={() => setSelectedSlot(null)}
            className="text-sm text-neutral-500 hover:text-white mb-4 transition-colors py-2 px-3 -ml-3 rounded touch-manipulation"
            aria-label="Escolher outro horário"
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
                inputMode="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setFormErrors({ ...formErrors, email: '' });
                }}
                className={cn(
                  "w-full bg-neutral-900/50 border rounded-lg px-4 py-3.5 text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all",
                  formErrors.email && "border-red-500"
                )}
                style={{ fontSize: '16px' }}
                placeholder="seu@email.com"
                aria-label="Seu email"
                aria-invalid={!!formErrors.email}
              />
              {formErrors.email && <span className="text-xs text-red-400 mt-1">{formErrors.email}</span>}
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider ml-1 block mb-2">
                Telefone *
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  setFormErrors({ ...formErrors, phone: '' });
                }}
                className={cn(
                  "w-full bg-neutral-900/50 border rounded-lg px-4 py-3.5 text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all",
                  formErrors.phone && "border-red-500"
                )}
                style={{ fontSize: '16px' }}
                placeholder="(11) 99999-9999"
                aria-label="Seu telefone"
                aria-invalid={!!formErrors.phone}
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

            {/* Modal de confirmação fullscreen — renderizado via portal fora de qualquer container */}
            {submitMessage?.type === 'success' && typeof document !== 'undefined' && createPortal(
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.92)',
                  backdropFilter: 'blur(6px)',
                  padding: '16px',
                  overflowY: 'auto',
                }}
              >
                <div className="w-full max-w-sm flex flex-col items-center gap-4">
                  
                  {/* Cabeçalho */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle2 className="w-7 h-7 text-amber-500" />
                      <h4 className="text-xl font-semibold text-white">Vistoria Agendada!</h4>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-amber-400">📅 <strong>{submitMessage.scheduledDate}</strong></p>
                      <p className="text-sm text-amber-400">🕐 <strong>{submitMessage.scheduledTime}</strong></p>
                    </div>
                  </div>

                  {/* Vídeo Shorts */}
                  <div className="w-full rounded-xl overflow-hidden shadow-2xl" style={{ maxWidth: '280px' }}>
                    <div className="relative w-full" style={{ paddingBottom: '177.78%' }}>
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src="https://www.youtube.com/embed/Nzr3wlEdjkE?autoplay=1&mute=1&loop=1&playlist=Nzr3wlEdjkE&controls=1"
                        title="Como funciona a vistoria - Repasse Auto RS"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>

                  {/* Botão WhatsApp */}
                  <a
                    href={`https://api.whatsapp.com/send/?phone=555194221187&text=${encodeURIComponent(`Olá! Acabei de agendar uma vistoria no Repasse Auto RS.\n\n🚗 Veículo: ${customerData.modelo || 'Não informado'}\n🔢 Placa: ${customerData.plate}\n💰 Valor proposto: ${quoteData ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quoteData.valorProposta) : 'A consultar'}\n📅 Data: ${submitMessage?.scheduledDate}\n🕐 Horário: ${submitMessage?.scheduledTime}`)}&type=phone_number&app_absent=0`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-500 active:scale-95 text-white rounded-xl font-semibold text-base transition-all touch-manipulation shadow-lg"
                    aria-label="Falar no WhatsApp"
                  >
                    <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Falar no WhatsApp
                  </a>

                </div>
              </div>,
              document.body
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
  const [counterOfferData, setCounterOfferData] = useState({ value: "" });
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    plate: "",
    km: "",
    city: ""
  });

  // Verifica consentimento LGPD ao carregar
  useEffect(() => {
    const consent = localStorage.getItem('lgpd-consent');
    if (!consent) {
      // Mostra banner após 2 segundos
      setTimeout(() => setShowCookieBanner(true), 2000);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('lgpd-consent', 'accepted');
    setShowCookieBanner(false);
  };

  const handleRejectCookies = () => {
    localStorage.setItem('lgpd-consent', 'rejected');
    setShowCookieBanner(false);
  };

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
        <div className="container mx-auto px-6 sm:px-4 py-16 md:py-24 max-w-6xl">
          <div className="flex justify-center mb-8">
            <img src="/logo-repasse.png" alt="Repasse Auto RS - Compra e venda de veículos usados em Porto Alegre e região" className="h-16 md:h-20 w-auto" loading="eager" width="auto" height="80" />
          </div>
          
          <div className="text-center space-y-6 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/20 border border-amber-900/30">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-[10px] uppercase tracking-widest text-amber-400/80 font-semibold">⚡ Venda em até 50 minutos</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white tracking-tight leading-tight">
              <HighlightText 
                highlightWords={['50', 'minutos', 'segurança', 'total']}
                highlightClassName="text-amber-500"
              >
                Venda seu carro em até 50 minutos com segurança total
              </HighlightText>
            </h1>
            
            <p className="text-lg text-neutral-400 leading-relaxed">
              Esqueça a exposição de dados, os curiosos e o medo de golpes. Na Repasse Auto RS, conectamos você à melhor negociação em tempo recorde.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center">
              <a href="#cotacao" className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg hover:shadow-amber-500/50 text-center" aria-label="Solicitar cotação para vender meu carro">
                Quero Vender Meu Carro Agora
              </a>
              <a href="#seguranca" className="px-8 py-4 border border-neutral-800 text-neutral-300 rounded-lg font-medium hover:border-amber-600/50 hover:text-white transition-all text-center" aria-label="Saiba como funciona o processo de venda">
                Como Funciona
              </a>
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
            <article className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-8 hover:border-amber-900/50 transition-all">
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
            </article>
            
            {/* Velocidade */}
            <article className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-8 hover:border-amber-900/50 transition-all">
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
            </article>
            
            {/* Zero Burocracia */}
            <article className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-8 hover:border-amber-900/50 transition-all">
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
            </article>
          </div>
          
          <div className="text-center mt-12">
            <a href="#cotacao" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg hover:shadow-amber-500/50">
              Receber Minha Oferta Agora
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Comparação */}
      <section className="py-20 border-b border-neutral-900">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light text-white mb-4">
              Por que não somos um classificado comum?
            </h2>
          </div>
          
          {/* Tabela Desktop / Cards Mobile */}
          <div className="hidden md:block overflow-x-auto">
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
          
          {/* Cards para Mobile */}
          <div className="md:hidden space-y-4">
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-5">
              <div className="text-red-400 text-sm mb-2">✗ Classificados</div>
              <div className="text-neutral-500 text-sm mb-3">Exposição total dos seus dados e telefone</div>
              <div className="text-amber-500 text-sm font-semibold mb-1">✓ Repasse Auto RS</div>
              <div className="text-white text-sm">Seus dados protegidos e ocultos</div>
            </div>
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-5">
              <div className="text-red-400 text-sm mb-2">✗ Classificados</div>
              <div className="text-neutral-500 text-sm mb-3">Dias (ou semanas) perdidos com curiosos</div>
              <div className="text-amber-500 text-sm font-semibold mb-1">✓ Repasse Auto RS</div>
              <div className="text-white text-sm">Venda realizada em até 50 minutos</div>
            </div>
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-5">
              <div className="text-red-400 text-sm mb-2">✗ Classificados</div>
              <div className="text-neutral-500 text-sm mb-3">Risco constante de fraudes e golpes</div>
              <div className="text-amber-500 text-sm font-semibold mb-1">✓ Repasse Auto RS</div>
              <div className="text-white text-sm">Ambiente 100% controlado e seguro</div>
            </div>
            <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-5">
              <div className="text-red-400 text-sm mb-2">✗ Classificados</div>
              <div className="text-neutral-500 text-sm mb-3">Você cuida de toda a papelada chata</div>
              <div className="text-amber-500 text-sm font-semibold mb-1">✓ Repasse Auto RS</div>
              <div className="text-white text-sm">Nós resolvemos toda a burocracia</div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <a href="#cotacao" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg font-medium hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg hover:shadow-amber-500/50">
              Vender Meu Carro com Segurança
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Wizard de Cotação */}
      <section id="cotacao" className="py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <header className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-light text-white tracking-tight mb-4">
              Receba sua proposta <span className="text-amber-500">agora</span>
            </h2>
            <p className="text-neutral-500 text-lg">Preencha os dados e veja quanto seu carro vale em tempo real</p>
          </header>

          <div className="grid lg:grid-cols-[350px_1fr] gap-8 items-start">
            {/* Vídeo Vertical */}
            <aside className="relative mx-auto lg:mx-0" aria-label="Vídeo explicativo">
              <div className="relative w-full max-w-[350px] mx-auto" style={{ aspectRatio: '9/16' }}>
                <div className="absolute inset-0 bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shadow-2xl">
                  <iframe 
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/ItsJy6_CMNM"
                    title="Vídeo: Como vender seu carro em 50 minutos com segurança na Repasse Auto RS"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  ></iframe>
                </div>
              </div>
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <span className="text-amber-500 text-sm font-semibold">⏱️ Veja como funciona!</span>
                </div>
              </div>
            </aside>

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
                  inputMode="text"
                  autoCapitalize="characters"
                  aria-label="Placa do veículo"
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
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Ex: 55000" 
                    value={formData.km}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('km', e.target.value.replace(/\D/g, ''))}
                    aria-label="Quilometragem do veículo"
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
                  <p className="text-sm text-neutral-400 mb-4">Informe o valor que você aceita e enviaremos sua proposta via WhatsApp</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider ml-1 block mb-2">
                        Qual valor você aceita?
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: R$ 70.000"
                        value={counterOfferData.value}
                        onChange={(e) => setCounterOfferData({ value: e.target.value })}
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3 text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all"
                      />
                    </div>
                    <a
                      href={`https://api.whatsapp.com/send/?phone=555194221187&text=Olá!%20Recebi%20uma%20proposta%20para%20meu%20veículo%20mas%20gostaria%20de%20fazer%20uma%20contraproposta.%0A%0A👤%20Nome:%20${encodeURIComponent(formData.name)}%0A🚗%20Veículo:%20${encodeURIComponent(quote?.modelo || '')}%0A📅%20Ano:%20${quote?.ano || ''}%0A🔢%20Placa:%20${formData.plate}%0A%0A💰%20Valor%20proposto%20por%20vocês:%20${encodeURIComponent(formatCurrency(quote?.valorProposta || 0))}%0A💵%20Valor%20que%20eu%20aceito:%20${encodeURIComponent(counterOfferData.value)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
                        !counterOfferData.value 
                          ? "bg-neutral-800 text-neutral-500 cursor-not-allowed" 
                          : "bg-green-600 hover:bg-green-700 text-white"
                      )}
                      onClick={(e) => {
                        if (!counterOfferData.value) {
                          e.preventDefault();
                          return;
                        }
                        setShowCounterOffer(false);
                        setCounterOfferData({ value: "" });
                      }}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Enviar via WhatsApp
                    </a>
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
                km: formData.km,
                modelo: quote?.modelo
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-12 pb-safe">
        <div className="container mx-auto px-6 sm:px-4 max-w-6xl text-center">
          <div className="mb-6">
            <img src="/logo-repasse.png" alt="Repasse Auto RS - Sua parceira confiável na venda de veículos" className="h-12 w-auto mx-auto opacity-50" loading="lazy" width="auto" height="48" />
          </div>
          <p className="text-neutral-600 text-sm">© 2026 Repasse Auto RS. Todos os direitos reservados.</p>
          <p className="mt-2 text-neutral-700 text-xs">Atendimento especializado no Rio Grande do Sul</p>
        </div>
      </footer>

      {/* Banner LGPD */}
      {showCookieBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-500 pb-safe">
          <div className="bg-neutral-900 border-t border-neutral-800 shadow-2xl">
            <div className="container mx-auto px-6 sm:px-4 py-6 max-w-6xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Privacidade e Cookies
                  </h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    Utilizamos cookies e coletamos dados para melhorar sua experiência, personalizar conteúdo e anúncios (Google Ads e Meta), 
                    e analisar o tráfego do site. Os dados fornecidos nos formulários são utilizados exclusivamente para processamento de 
                    cotações e agendamentos, conforme nossa Política de Privacidade e a LGPD (Lei nº 13.709/2018).
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <button
                    onClick={handleRejectCookies}
                    className="px-6 py-2.5 border border-neutral-700 text-neutral-400 rounded-lg hover:border-neutral-600 hover:text-white transition-all text-sm font-medium"
                  >
                    Recusar
                  </button>
                  <button
                    onClick={handleAcceptCookies}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-lg hover:from-amber-500 hover:to-amber-400 transition-all text-sm font-medium shadow-lg"
                  >
                    Aceitar e Continuar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
