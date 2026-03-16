import Link from 'next/link';
import { Phone, MessageCircle, Send } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">Агентство Недвижимости</Link>
        <div className="flex items-center gap-4">
          <a href="tel:+79991234567" className="flex items-center gap-1 text-primary">
            <Phone size={20} />
            <span className="hidden sm:inline">+7 (999) 123-45-67</span>
          </a>
          <a href="https://wa.me/79991234567" target="_blank" rel="noopener noreferrer">
            <MessageCircle size={20} className="text-green-600" />
          </a>
          <a href="https://t.me/username" target="_blank" rel="noopener noreferrer">
            <Send size={20} className="text-blue-500" />
          </a>
        </div>
      </div>
    </header>
  );
}