
import React, { useState, useCallback, useMemo } from 'react';
import { Send, CheckCircle2, ArrowRight, ArrowLeft, Check, Mail, Phone, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import emailjs from '@emailjs/browser';

// --- Types ---
type StepId = 
  | 'main' 
  | 'live-type' | 'live-hire-role' | 'live-hire-details' 
  | 'live-event-type' | 'live-music-check' | 'speakers-only' 
  | 'performers' | 'instruments' | 'location-equipment' | 'location-name' | 'live-practical'
  | 'studio-type' | 'studio-details'
  | 'nabewerking-type' | 'nabewerking-details'
  | 'advies-who' | 'advies-goal' | 'advies-ruimte' | 'advies-doel' | 'advies-methode'
  | 'advies-gebruik' | 'advies-kopen-details' | 'advies-kopen-type'
  | 'anders-beschrijving'
  | 'contact' | 'success' | 'error';

interface FormData {
  [key: string]: any;
}

const OnboardingForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<StepId>('main');
  const [formData, setFormData] = useState<FormData>({
    'contact-pref': 'email'
  });
  const [stepHistory, setStepHistory] = useState<StepId[]>(['main']);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // --- EMAILJS CONFIGURATIE ---
  const EMAILJS_SERVICE_ID = 'service_k3tk1lw'; 
  const EMAILJS_TEMPLATE_ID = 'template_r6rg82d'; 
  const EMAILJS_PUBLIC_KEY = 'lDC9vj_pKNBf2ZzyG'; 
  const MIJN_EMAIL = 'audio@rikdewit.nl'; // Jouw e-mailadres voor de notificatie

  const progress = useMemo(() => {
    if (currentStep === 'success') return 100;
    if (currentStep === 'contact') return 95;
    const stepWeight = 6;
    const calculated = 10 + (stepHistory.length * stepWeight);
    return Math.min(calculated, 90);
  }, [stepHistory, currentStep]);

  const updateFormData = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/.test(phone);

  const isContactStepValid = useMemo(() => {
    const name = formData['contact-name'] || '';
    const email = formData['contact-email'] || '';
    const phone = formData['contact-phone'] || '';
    return name.trim().length > 1 && validateEmail(email) && validatePhone(phone);
  }, [formData]);

  const formatProjectDetails = (data: FormData): string => {
    const rows: string[] = [];
    const addRow = (label: string, value: any) => {
      if (value) rows.push(`<tr><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #888888; font-size: 11px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; width: 40%;">${label}</td><td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #000000; font-size: 14px; font-weight: 500;">${value}</td></tr>`);
    };

    const serviceMap: any = { 'live': 'Live Geluid', 'studio': 'Studio Opname', 'nabewerking': 'Nabewerking', 'advies': 'Advies', 'anders': 'Overig' };
    addRow('Dienst', serviceMap[data['main-service']] || data['main-service']);
    
    if (data['live-type']) addRow('Type', data['live-type'] === 'hire' ? 'Direct Inhuren' : 'Evenement Organisatie');
    if (data['event-type']) addRow('Event', data['event-type']);
    if (data['event-date']) addRow('Datum', data['event-date']);
    if (data['loc-name'])   addRow('Locatie', data['loc-name']);
    if (data['hire-role'])  addRow('Rol', data['hire-role']);
    if (data['performers']) addRow('Bezetting', data['performers']);
    
    const instruments = Object.keys(data).filter(k => k.startsWith('instrument-') && data[k]).map(k => k.replace('instrument-', ''));
    if (instruments.length > 0) addRow('Instrumenten', instruments.join(', '));

    const equip = Object.keys(data).filter(k => k.startsWith('equip-') && data[k]).map(k => k.replace('equip-', ''));
    if (equip.length > 0) addRow('Gear ter plaatse', equip.join(', '));

    return `<table width="100%" style="border-collapse: collapse;">${rows.join('')}</table>`;
  };

  const handleFinalSubmit = async () => {
    setIsSending(true);
    
    try {
      const serviceMap: any = { 'live': 'Live Geluid', 'studio': 'Studio Opname', 'nabewerking': 'Nabewerking', 'advies': 'Advies', 'anders': 'Overig' };
      const projectDetailsHtml = formatProjectDetails(formData);
      const customerEmail = formData['contact-email'];
      const customerName = formData['contact-name'];
      const projectType = serviceMap[formData['main-service']] || formData['main-service'];

      // Basis parameters die voor beide e-mails hetzelfde zijn
      const baseParams = {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: formData['contact-phone'],
        contact_preference: formData['contact-pref'],
        project_type: projectType,
        project_details_html: projectDetailsHtml,
        customer_message: formData['hire-details'] || formData['event-details'] || formData['studio-details'] || formData['nabewerking-details'] || formData['anders-details'] || 'Geen extra toelichting.'
      };

      // 1. Stuur e-mail naar Rik (Notificatie)
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          ...baseParams,
          recipient_email: MIJN_EMAIL,
          email_subject: `Nieuwe aanvraag: ${projectType} - ${customerName}`,
          reply_to: customerEmail
        },
        EMAILJS_PUBLIC_KEY
      );

      // 2. Stuur e-mail naar Klant (Kopie/Bevestiging)
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          ...baseParams,
          recipient_email: customerEmail,
          email_subject: `Bevestiging van je aanvraag: ${projectType}`,
          reply_to: MIJN_EMAIL
        },
        EMAILJS_PUBLIC_KEY
      );

      setIsSending(false);
      setCurrentStep('success');
    } catch (error) {
      console.error("EmailJS Error:", error);
      setIsSending(false);
      setCurrentStep('error');
    }
  };

  const determineNextStep = useCallback((step: StepId): StepId | null => {
    if (step === 'main') {
      const service = formData['main-service'];
      if (service === 'live') return 'live-type';
      if (service === 'studio') return 'studio-type';
      if (service === 'nabewerking') return 'nabewerking-type';
      if (service === 'advies') return 'advies-who';
      if (service === 'anders') return 'anders-beschrijving';
    }
    if (step === 'live-type') return formData['live-type'] === 'hire' ? 'live-hire-role' : 'live-event-type';
    if (step === 'live-hire-role') return 'live-hire-details';
    if (step === 'live-hire-details') return 'contact';
    if (step === 'live-event-type') return (formData['event-type'] === 'concert' || formData['event-type'] === 'Concert / Festival') ? 'performers' : 'live-music-check';
    if (step === 'live-music-check') return formData['has-live-music'] === 'ja' ? 'performers' : 'location-equipment';
    if (step === 'performers') return (formData['performers'] === 'Band (2-5 personen)' || formData['performers'] === 'Band (6+ personen)') ? 'instruments' : 'location-equipment';
    if (step === 'instruments') return 'location-equipment';
    if (step === 'location-equipment') return (formData['equip-Weet ik niet'] || formData['equip-Niks aanwezig']) ? 'location-name' : 'live-practical';
    if (step === 'location-name') return 'live-practical';
    if (step === 'live-practical') return 'contact';
    if (step === 'studio-type') return 'studio-details';
    if (step === 'studio-details') return 'contact';
    if (step === 'nabewerking-type') return 'nabewerking-details';
    if (step === 'nabewerking-details') return 'contact';
    if (step === 'advies-who') return 'advies-goal';
    if (step === 'advies-goal') {
      const g = formData['advies-goal'];
      if (g === 'event') return 'live-event-type';
      if (g === 'verbeteren') return 'advies-ruimte';
      if (g === 'aanschaffen') return 'advies-gebruik';
      return 'anders-beschrijving';
    }
    if (step === 'advies-ruimte') return 'advies-doel';
    if (step === 'advies-doel') return 'advies-methode';
    if (step === 'advies-methode') return 'contact';
    if (step === 'advies-gebruik') return 'advies-kopen-details';
    if (step === 'advies-kopen-details') return 'advies-kopen-type';
    if (step === 'advies-kopen-type') return 'contact';
    if (step === 'anders-beschrijving') return 'contact';
    return null;
  }, [formData]);

  const handleNext = () => {
    if (currentStep === 'contact') { handleFinalSubmit(); return; }
    const next = determineNextStep(currentStep);
    if (next) {
      setIsAnimating(true);
      setTimeout(() => {
        setStepHistory(prev => [...prev, next]);
        setCurrentStep(next);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleBack = () => {
    if (stepHistory.length > 1) {
      setIsAnimating(true);
      setTimeout(() => {
        const h = [...stepHistory]; h.pop();
        setStepHistory(h); setCurrentStep(h[h.length - 1]);
        setIsAnimating(false);
      }, 300);
    }
  };

  const OptionCard = ({ label, isSelected, onClick, icon: Icon }: any) => (
    <div onClick={onClick} className={`relative overflow-hidden p-6 border cursor-pointer transition-all duration-300 rounded-sm group ${isSelected ? 'border-black bg-white shadow-lg translate-x-2' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
      <div className={`absolute inset-0 bg-gradient-to-r from-[#87E8A0]/10 to-[#71E2E4]/10 transition-all duration-500 ease-out ${isSelected ? 'w-full' : 'w-0 group-hover:w-full'}`} />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'bg-black border-black text-white' : 'border-gray-200 text-gray-400 group-hover:border-black group-hover:text-black'}`}>
            {Icon ? <Icon size={14} /> : <Check size={14} className={isSelected ? 'opacity-100' : 'opacity-0'} />}
          </div>
          <span className={`mono text-sm uppercase tracking-widest font-bold ${isSelected ? 'text-black' : 'text-gray-500 group-hover:text-black'}`}>{label}</span>
        </div>
      </div>
    </div>
  );

  const CheckboxCard = ({ label, isSelected, onToggle }: any) => (
    <div onClick={onToggle} className={`relative overflow-hidden p-5 border cursor-pointer transition-all duration-300 rounded-sm group ${isSelected ? 'border-black bg-white shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
      <div className={`absolute inset-0 bg-gradient-to-r from-[#87E8A0]/5 to-[#71E2E4]/5 transition-all duration-500 ease-out ${isSelected ? 'w-full' : 'w-0 group-hover:w-full'}`} />
      <div className="relative z-10 flex items-center gap-5">
        <div className={`w-6 h-6 border flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-black border-black scale-110' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
          {isSelected && <Check size={12} className="text-white" />}
        </div>
        <span className={`mono text-xs uppercase tracking-widest font-bold transition-colors ${isSelected ? 'text-black' : 'text-gray-500 group-hover:text-black'}`}>{label}</span>
      </div>
    </div>
  );

  const NavButton = ({ onClick, disabled, variant = 'primary', children, isLoading = false }: any) => (
    <button onClick={onClick} disabled={disabled || isLoading} className={`px-10 py-5 text-xs font-bold uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 rounded-sm relative overflow-hidden ${variant === 'primary' ? 'bg-black text-white hover:bg-black/90 shadow-xl disabled:bg-gray-200 disabled:text-gray-400' : 'border border-gray-300 text-gray-500 hover:border-black hover:text-black bg-white'}`}>
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>{variant === 'secondary' && <ArrowLeft size={16} />}{children}{variant === 'primary' && <ArrowRight size={16} />}</>}
    </button>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'main':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black leading-tight">Wat kan ik voor je <span className="italic">betekenen</span>?</h2>
            <div className="grid gap-4">
              {[{ id: 'live', label: 'Live geluid voor een evenement' }, { id: 'studio', label: 'Studio opname' }, { id: 'nabewerking', label: 'Audio Nabewerking' }, { id: 'advies', label: 'Audio Advies' }, { id: 'anders', label: 'Anders' }].map(opt => (
                <OptionCard key={opt.id} label={opt.label} isSelected={formData['main-service'] === opt.id} onClick={() => updateFormData('main-service', opt.id)} />
              ))}
            </div>
            <NavButton onClick={handleNext} disabled={!formData['main-service']}>Ga Verder</NavButton>
          </div>
        );
      case 'live-type':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black">Hoe kan ik helpen?</h2>
            <div className="grid gap-4">
              <OptionCard label="Ik organiseer een evenement - help me met techniek" isSelected={formData['live-type'] === 'organize'} onClick={() => updateFormData('live-type', 'organize')} />
              <OptionCard label="Ik wilt je direct inhuren als technicus" isSelected={formData['live-type'] === 'hire'} onClick={() => updateFormData('live-type', 'hire')} />
            </div>
            <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack}>Terug</NavButton><NavButton onClick={handleNext} disabled={!formData['live-type']}>Volgende</NavButton></div>
          </div>
        );
      case 'live-hire-role':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black">In welke rol?</h2>
            <div className="grid gap-4">
              {['FOH Technicus', 'Monitor Technicus', 'Stagehand / Crew', 'Systeemontwerper', 'Anders'].map(role => (
                <OptionCard key={role} label={role} isSelected={formData['hire-role'] === role} onClick={() => updateFormData('hire-role', role)} />
              ))}
            </div>
            <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack}>Terug</NavButton><NavButton onClick={handleNext} disabled={!formData['hire-role']}>Volgende</NavButton></div>
          </div>
        );
      case 'live-hire-details':
      case 'studio-details':
      case 'nabewerking-details':
      case 'advies-kopen-details':
      case 'anders-beschrijving':
        const fieldName = currentStep === 'live-hire-details' ? 'hire-details' : currentStep === 'studio-details' ? 'studio-details' : currentStep === 'nabewerking-details' ? 'nabewerking-details' : currentStep === 'advies-kopen-details' ? 'advies-kopen-details' : 'anders-details';
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black">Vertel meer over de aanvraag</h2>
            <textarea className="w-full border-b border-gray-300 py-6 text-xl focus:border-black outline-none font-light min-h-[250px] resize-none bg-transparent text-black" placeholder="Wat is belangrijk om te weten?" value={formData[fieldName] || ''} onChange={e => updateFormData(fieldName, e.target.value)} />
            <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack}>Terug</NavButton><NavButton onClick={handleNext} disabled={!formData[fieldName]}>Volgende</NavButton></div>
          </div>
        );
      case 'live-event-type':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black">Type event?</h2>
            <div className="grid gap-4">{['Concert / Festival', 'Bedrijfsevent', 'Privéfeest / Bruiloft', 'Presentatie / Congres'].map(t => (
                <OptionCard key={t} label={t} isSelected={formData['event-type'] === t} onClick={() => updateFormData('event-type', t)} />
            ))}</div>
            <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack}>Terug</NavButton><NavButton onClick={handleNext} disabled={!formData['event-type']}>Volgende</NavButton></div>
          </div>
        );
      case 'live-music-check':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black">Is er live muziek?</h2>
            <div className="grid gap-4">
              <OptionCard label="Ja, live muziek" isSelected={formData['has-live-music'] === 'ja'} onClick={() => updateFormData('has-live-music', 'ja')} />
              <OptionCard label="Nee, alleen spraak" isSelected={formData['has-live-music'] === 'nee'} onClick={() => updateFormData('has-live-music', 'nee')} />
            </div>
            <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack}>Terug</NavButton><NavButton onClick={handleNext} disabled={!formData['has-live-music']}>Volgende</NavButton></div>
          </div>
        );
      case 'performers':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black">Wie treedt er op?</h2>
            <div className="grid gap-4">{['Solo artiest / DJ', 'Duo / Trio', 'Band (2-5 personen)', 'Band (6+ personen)', 'Meerdere acts'].map(p => (
                <OptionCard key={p} label={p} isSelected={formData['performers'] === p} onClick={() => updateFormData('performers', p)} />
            ))}</div>
            <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack}>Terug</NavButton><NavButton onClick={handleNext} disabled={!formData['performers']}>Volgende</NavButton></div>
          </div>
        );
      case 'instruments':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black">Welke instrumenten?</h2>
            <div className="grid grid-cols-2 gap-4">{['Drums', 'Basgitaar', 'Gitaar', 'Keys / Piano', 'Zang', 'Blazers', 'Percussie', 'Elektronisch'].map(i => (
                <CheckboxCard key={i} label={i} isSelected={formData[`instrument-${i}`]} onToggle={() => updateFormData(`instrument-${i}`, !formData[`instrument-${i}`])} />
            ))}</div>
            <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack}>Terug</NavButton><NavButton onClick={handleNext}>Volgende</NavButton></div>
          </div>
        );
      case 'location-equipment':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black">Aanwezig op locatie?</h2>
            <div className="grid grid-cols-2 gap-4">{['Speakers (PA)', 'Mengtafel', 'Microfoons', 'Monitoren', 'Weet ik niet', 'Niks aanwezig'].map(e => (
                <CheckboxCard key={e} label={e} isSelected={formData[`equip-${e}`]} onToggle={() => updateFormData(`equip-${e}`, !formData[`equip-${e}`])} />
            ))}</div>
            <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack}>Terug</NavButton><NavButton onClick={handleNext}>Volgende</NavButton></div>
          </div>
        );
      case 'location-name':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black">Welke locatie?</h2>
            <input type="text" className="border-b border-gray-300 py-6 text-2xl focus:border-black outline-none font-light bg-transparent text-black" placeholder="Naam van de locatie of evenement" value={formData['loc-name'] || ''} onChange={e => updateFormData('loc-name', e.target.value)} />
            <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack}>Terug</NavButton><NavButton onClick={handleNext} disabled={!formData['loc-name']}>Volgende</NavButton></div>
          </div>
        );
      case 'live-practical':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black">Praktische info</h2>
            <div className="grid gap-10">
               <div className="flex flex-col gap-2"><label className="mono text-xs uppercase text-gray-400 font-bold tracking-widest">Datum</label><input type="date" className="border-b border-gray-300 py-4 text-xl focus:border-black outline-none font-light bg-transparent text-black" value={formData['event-date'] || ''} onChange={e => updateFormData('event-date', e.target.value)} /></div>
               <div className="flex flex-col gap-2"><label className="mono text-xs uppercase text-gray-400 font-bold tracking-widest">Toelichting</label><textarea className="border-b border-gray-300 py-4 text-xl focus:border-black outline-none font-light min-h-[150px] resize-none bg-transparent text-black" placeholder="Wat is verder belangrijk om te weten?" value={formData['event-details'] || ''} onChange={e => updateFormData('event-details', e.target.value)} /></div>
            </div>
            <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack}>Terug</NavButton><NavButton onClick={handleNext}>Volgende</NavButton></div>
          </div>
        );
      case 'studio-type':
      case 'nabewerking-type':
      case 'advies-who':
      case 'advies-goal':
      case 'advies-ruimte':
      case 'advies-doel':
      case 'advies-methode':
      case 'advies-gebruik':
      case 'advies-kopen-type':
        let title = "Vertel meer";
        let options: string[] = [];
        let key = "";
        if (currentStep === 'studio-type') { title = "Wat gaan we opnemen?"; options = ['Zang / Vocals', 'Band / Instrumenten', 'Podcast / Stem', 'Voice-over']; key = "studio-type"; }
        else if (currentStep === 'nabewerking-type') { title = "Type nabewerking?"; options = ['Mixing', 'Mastering', 'Podcast Editing', 'Restauratie']; key = "nabewerking-type"; }
        else if (currentStep === 'advies-who') { title = "Wie ben je?"; options = ['Muzikant / Producer', 'Organisator', 'Bedrijf', 'Particulier']; key = "advies-who"; }
        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-4xl font-light tracking-tight text-black">{title}</h2>
              <div className="grid gap-4">{options.map(t => (
                  <OptionCard key={t} label={t} isSelected={formData[key] === t} onClick={() => updateFormData(key, t)} />
              ))}</div>
              <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack}>Terug</NavButton><NavButton onClick={handleNext} disabled={!formData[key]}>Volgende</NavButton></div>
            </div>
        );
      case 'contact':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-4xl font-light tracking-tight text-black">Contactgegevens</h2>
            <div className="grid gap-8">
              <div className="flex flex-col gap-3"><label className="mono text-xs uppercase text-gray-500 font-bold tracking-widest">Naam *</label><input type="text" className="border-b border-gray-300 py-4 text-xl focus:border-black outline-none font-light bg-transparent text-black" value={formData['contact-name'] || ''} onChange={e => updateFormData('contact-name', e.target.value)} /></div>
              <div className="grid md:grid-cols-2 gap-10">
                <div className="flex flex-col gap-3"><label className="mono text-xs uppercase text-gray-500 font-bold tracking-widest">E-mail *</label><input type="email" className="border-b border-gray-300 py-4 text-xl focus:border-black outline-none font-light bg-transparent text-black" value={formData['contact-email'] || ''} onChange={e => updateFormData('contact-email', e.target.value)} /></div>
                <div className="flex flex-col gap-3"><label className="mono text-xs uppercase text-gray-500 font-bold tracking-widest">Telefoon *</label><input type="tel" className="border-b border-gray-300 py-4 text-xl focus:border-black outline-none font-light bg-transparent text-black" value={formData['contact-phone'] || ''} onChange={e => updateFormData('contact-phone', e.target.value)} /></div>
              </div>
              <div className="flex flex-col gap-6 mt-6"><label className="mono text-xs uppercase text-gray-400 font-bold tracking-widest">Contact voorkeur</label>
                <div className="grid grid-cols-3 gap-4">{[{ id: 'email', label: 'E-mail', icon: Mail }, { id: 'telefoon', label: 'Bellen', icon: Phone }, { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare }].map(opt => (
                    <div key={opt.id} onClick={() => updateFormData('contact-pref', opt.id)} className={`relative overflow-hidden flex flex-col items-center justify-center p-6 border cursor-pointer transition-all rounded-sm gap-3 group ${formData['contact-pref'] === opt.id ? 'border-black bg-white shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                      <div className={`absolute inset-0 bg-gradient-to-r from-[#87E8A0]/10 to-[#71E2E4]/10 transition-all duration-500 ease-out ${formData['contact-pref'] === opt.id ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                      <div className="relative z-10 flex flex-col items-center gap-3"><opt.icon size={24} className={formData['contact-pref'] === opt.id ? 'text-black' : 'text-gray-400'} /><span className={`mono text-[10px] uppercase tracking-widest font-bold ${formData['contact-pref'] === opt.id ? 'text-black' : 'text-gray-500'}`}>{opt.label}</span></div>
                    </div>
                  ))}</div>
              </div>
            </div>
            <div className="flex gap-6 pt-6"><NavButton variant="secondary" onClick={handleBack} disabled={isSending}>Terug</NavButton><NavButton onClick={handleNext} disabled={!isContactStepValid} isLoading={isSending}>{isSending ? 'Bezig met versturen...' : 'Aanvraag Versturen'}</NavButton></div>
          </div>
        );
      case 'error':
        return (
          <div className="text-center py-20 space-y-10 animate-in zoom-in duration-700">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-red-50 mb-6 shadow-2xl"><AlertCircle className="text-red-500" size={64} strokeWidth={1} /></div>
            <h2 className="text-5xl font-light tracking-tight text-black">Oeps! Er ging iets mis.</h2>
            <p className="text-gray-500 text-xl font-light max-w-lg mx-auto leading-relaxed">Het versturen is mislukt. Probeer het opnieuw of mail naar <a href="mailto:audio@rikdewit.nl" className="underline font-medium">audio@rikdewit.nl</a>.</p>
            <div className="pt-10"><NavButton onClick={() => setCurrentStep('contact')}>Probeer het opnieuw</NavButton></div>
          </div>
        );
      case 'success':
        return (
          <div className="text-center py-20 space-y-10 animate-in zoom-in duration-700">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-black mb-6 shadow-2xl relative"><div className="absolute inset-0 rounded-full bg-[#87E8A0]/20 animate-ping duration-1000" /><CheckCircle2 className="text-[#87E8A0] relative z-10" size={64} strokeWidth={1} /></div>
            <h2 className="text-5xl font-light tracking-tight text-black">Briefing Ontvangen</h2>
            <p className="text-gray-500 text-xl font-light max-w-lg mx-auto leading-relaxed">Bedankt voor de details. Ik kom binnen 24 uur bij je terug met een concreet voorstel.</p>
            <div className="pt-10"><button onClick={() => { setFormData({'contact-pref': 'email'}); setCurrentStep('main'); setStepHistory(['main']); }} className="text-xs font-bold tracking-[0.4em] uppercase underline underline-offset-[12px] text-black hover:text-gray-400 transition-colors">Nieuwe aanvraag</button></div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <section id="diensten" className="min-h-screen flex items-center py-24 md:py-32 px-6 bg-white overflow-hidden border-y border-gray-50">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-5 gap-16 lg:gap-24 items-center">
          <div className="lg:col-span-2 lg:sticky lg:top-32 flex flex-col justify-center">
            <div className="flex flex-col">
              <h2 className="text-xs uppercase tracking-[0.5em] font-bold text-gray-500 mb-10">Diensten</h2>
              <h3 className="text-5xl md:text-6xl lg:text-7xl font-light tracking-tighter leading-[0.95] mb-12 text-black">Klaar om je geluid naar een <br /><span className="italic">hoger niveau</span> te tillen?</h3>
              <p className="text-gray-500 font-light text-xl mb-16 leading-relaxed max-w-md">Vul dit formulier in voor een vliegende start. Dit helpt mij om direct inzicht te krijgen in de technische eisen van jouw project.</p>
              <div className="flex flex-col gap-10 border-l border-gray-200 pl-10 mt-8 lg:mt-16">
                <div className={`transition-all duration-500 ${currentStep === 'main' ? 'opacity-100 translate-x-4 scale-105' : 'opacity-30'}`}><span className="mono text-[10px] block mb-2 text-gray-500 font-bold">STAP 01</span><span className="text-lg font-medium tracking-wide uppercase text-black">Dienst Selectie</span></div>
                <div className={`transition-all duration-500 ${currentStep !== 'main' && currentStep !== 'contact' && currentStep !== 'success' && currentStep !== 'error' ? 'opacity-100 translate-x-4 scale-105' : 'opacity-30'}`}><span className="mono text-[10px] block mb-2 text-gray-500 font-bold">STAP 02</span><span className="text-lg font-medium tracking-wide uppercase text-black">Technische Details</span></div>
                <div className={`transition-all duration-500 ${currentStep === 'contact' ? 'opacity-100 translate-x-4 scale-105' : 'opacity-30'}`}><span className="mono text-[10px] block mb-2 text-gray-500 font-bold">STAP 03</span><span className="text-lg font-medium tracking-wide uppercase text-black">Contact & Planning</span></div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-3">
            <div className="bg-gray-50 rounded-sm border border-gray-200 shadow-2xl relative overflow-hidden min-h-[780px] flex flex-col transition-all duration-500">
              <div className="h-[4px] w-full bg-gray-200 relative overflow-hidden"><div className={`absolute inset-y-0 left-0 bg-gradient-to-r from-[#87E8A0] via-[#71E2E4] to-[#87E8A0] transition-all duration-1000 ease-out bg-[length:200%_100%] ${isSending ? 'animate-[gradient-shift_1s_linear_infinite]' : 'animate-[gradient-shift_3s_linear_infinite]'}`} style={{ width: `${progress}%` }} /></div>
              <div className={`p-10 md:p-16 lg:p-20 flex-grow transition-all duration-500 ${isAnimating || isSending ? 'opacity-30 blur-sm' : 'opacity-100 blur-0'}`}>{renderStepContent()}</div>
              {isSending && <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-white/40 backdrop-blur-sm animate-in fade-in duration-500"><div className="flex flex-col items-center gap-6"><div className="relative"><Loader2 size={64} className="text-black animate-spin" strokeWidth={1} /></div><div className="text-center"><h4 className="mono text-sm font-bold uppercase tracking-[0.4em] text-black mb-2">Gegevens verwerken</h4><p className="text-gray-500 text-xs font-light">Eén moment geduld...</p></div></div></div>}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes gradient-shift { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }`}</style>
    </section>
  );
};

export default OnboardingForm;
