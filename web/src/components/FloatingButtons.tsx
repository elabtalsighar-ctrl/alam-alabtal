import { useSettings } from '../context/SettingsContext';
import { whatsappLink } from '../context/SettingsContext';
import { WhatsAppIcon } from './icons';

export default function FloatingButtons() {
  const { settings } = useSettings();
  const number = settings?.whatsapp_number;
  if (!number) return null;

  const href = whatsappLink(number, settings?.whatsapp_message || 'السلام عليكم');

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر واتساب"
      className="fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-card transition-transform hover:scale-105 active:scale-95"
    >
      <WhatsAppIcon size={30} />
    </a>
  );
}
