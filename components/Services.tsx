import React from 'react';
import { Mic2, Speaker, Settings } from 'lucide-react';
import { SERVICES } from '../constants';


const IconMap: Record<string, React.ReactNode> = {
  Mic2: <Mic2 strokeWidth={1} size={48} />,
  Speaker: <Speaker strokeWidth={1} size={48} />,
  Settings: <Settings strokeWidth={1} size={48} />,
};

const Services: React.FC = () => {
  return (
    <section id="expertises" className="min-h-screen flex items-center py-20 px-6 bg-[#fafafa]">
      <div className="max-w-7xl mx-auto w-full">
        <div className="mb-24 text-center flex flex-col items-center">
          {/* Profile Photo - Updated to use Rik.jpeg as a local static file */}
          <div className="mb-12 relative group">
            <div className="w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-white shadow-2xl transition-all duration-500 ease-out hover:scale-[1.03] hover:rotate-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] cursor-pointer">
              <img 
                src="/Rik.jpeg" 
                alt="Rik de Wit" 
                className="w-full h-full object-cover scale-110"
                onError={(e) => {
                  // Fallback to placeholder if Rik.jpeg is missing
                  (e.target as HTMLImageElement).src = "https://s6.imgcdn.dev/Y0aAnN.md.jpg";
                }}
              />
            </div>
            {/* Subtle decorative ring that expands on hover */}
            <div className="absolute inset-0 rounded-full border border-black/5 -m-2 pointer-events-none group-hover:scale-110 transition-transform duration-700" />
          </div>

          <h2 className="text-sm uppercase tracking-[0.4em] font-bold text-gray-400 mb-6">Mijn Expertise</h2>
          <div className="w-16 h-px bg-black mx-auto" />
        </div>

        <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
          {SERVICES.map((service) => (
            <div 
              key={service.id} 
              className="group flex flex-col items-center text-center p-12 bg-white border border-transparent hover:border-gray-100 hover:shadow-2xl transition-all duration-500 rounded-sm"
            >
              <div className="mb-10 text-black group-hover:scale-110 transition-transform duration-500">
                {IconMap[service.icon]}
              </div>
              <h3 className="text-2xl font-medium mb-6 tracking-wide mono uppercase">{service.title}</h3>
              <p className="text-gray-500 text-lg font-light leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
