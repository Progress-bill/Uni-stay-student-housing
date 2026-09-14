import React, { useState, useRef, useEffect } from 'react';
import { Phone, Search, ChevronDown, Check } from 'lucide-react';

export const COUNTRIES = [
  { name: 'India', code: '+91', iso: 'IN', flag: '🇮🇳' },
  { name: 'United States', code: '+1', iso: 'US', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', iso: 'GB', flag: '🇬🇧' },
  { name: 'Canada', code: '+1', iso: 'CA', flag: '🇨🇦' },
  { name: 'Australia', code: '+61', iso: 'AU', flag: '🇦🇺' },
  { name: 'United Arab Emirates', code: '+971', iso: 'AE', flag: '🇦🇪' },
  { name: 'Nepal', code: '+977', iso: 'NP', flag: '🇳🇵' },
  { name: 'Bangladesh', code: '+880', iso: 'BD', flag: '🇧🇩' },
  { name: 'Pakistan', code: '+92', iso: 'PK', flag: '🇵🇰' },
  { name: 'Nigeria', code: '+234', iso: 'NG', flag: '🇳🇬' },
  { name: 'Kenya', code: '+254', iso: 'KE', flag: '🇰🇪' },
  { name: 'South Africa', code: '+27', iso: 'ZA', flag: '🇿🇦' },
  { name: 'Ghana', code: '+233', iso: 'GH', flag: '🇬🇭' },
  { name: 'Singapore', code: '+65', iso: 'SG', flag: '🇸🇬' },
  { name: 'Malaysia', code: '+60', iso: 'MY', flag: '🇲🇾' },
  { name: 'Saudi Arabia', code: '+966', iso: 'SA', flag: '🇸🇦' },
  { name: 'Qatar', code: '+974', iso: 'QA', flag: '🇶🇦' },
  { name: 'Germany', code: '+49', iso: 'DE', flag: '🇩🇪' },
  { name: 'France', code: '+33', iso: 'FR', flag: '🇫🇷' },
  { name: 'Italy', code: '+39', iso: 'IT', flag: '🇮🇹' },
  { name: 'Spain', code: '+34', iso: 'ES', flag: '🇪🇸' },
  { name: 'Netherlands', code: '+31', iso: 'NL', flag: '🇳🇱' },
  { name: 'Ireland', code: '+353', iso: 'IE', flag: '🇮🇪' },
  { name: 'New Zealand', code: '+64', iso: 'NZ', flag: '🇳🇿' },
  { name: 'Philippines', code: '+63', iso: 'PH', flag: '🇵🇭' },
  { name: 'Sri Lanka', code: '+94', iso: 'LK', flag: '🇱🇰' },
  { name: 'Indonesia', code: '+62', iso: 'ID', flag: '🇮🇩' },
  { name: 'Thailand', code: '+66', iso: 'TH', flag: '🇹🇭' },
  { name: 'Vietnam', code: '+84', iso: 'VN', flag: '🇻🇳' },
  { name: 'Brazil', code: '+55', iso: 'BR', flag: '🇧🇷' },
  { name: 'Mexico', code: '+52', iso: 'MX', flag: '🇲🇽' },
  { name: 'Japan', code: '+81', iso: 'JP', flag: '🇯🇵' },
  { name: 'South Korea', code: '+82', iso: 'KR', flag: '🇰🇷' },
  { name: 'China', code: '+86', iso: 'CN', flag: '🇨🇳' },
  { name: 'Turkey', code: '+90', iso: 'TR', flag: '🇹🇷' },
  { name: 'Egypt', code: '+20', iso: 'EG', flag: '🇪🇬' },
  { name: 'Tanzania', code: '+255', iso: 'TZ', flag: '🇹🇿' },
  { name: 'Uganda', code: '+256', iso: 'UG', flag: '🇺🇬' },
  { name: 'Zimbabwe', code: '+263', iso: 'ZW', flag: '🇿🇼' },
  { name: 'Zambia', code: '+260', iso: 'ZM', flag: '🇿🇲' },
  { name: 'Ethiopia', code: '+251', iso: 'ET', flag: '🇪🇹' },
  { name: 'Kuwait', code: '+965', iso: 'KW', flag: '🇰🇼' },
  { name: 'Oman', code: '+968', iso: 'OM', flag: '🇴🇲' },
  { name: 'Bahrain', code: '+973', iso: 'BH', flag: '🇧🇭' },
  { name: 'Mauritius', code: '+230', iso: 'MU', flag: '🇲🇺' },
  { name: 'Russia', code: '+7', iso: 'RU', flag: '🇷🇺' },
  { name: 'Poland', code: '+48', iso: 'PL', flag: '🇵🇱' },
  { name: 'Sweden', code: '+46', iso: 'SE', flag: '🇸🇪' },
  { name: 'Norway', code: '+47', iso: 'NO', flag: '🇳🇴' },
  { name: 'Switzerland', code: '+41', iso: 'CH', flag: '🇨🇭' }
];

export default function CountryPhoneInput({
  value,
  onChange,
  required = true,
  placeholder = "98765 43210",
  id = "phone-input"
}) {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // India (+91)
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter countries by name, code or ISO
  const filteredCountries = COUNTRIES.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.includes(q) ||
      c.iso.toLowerCase().includes(q)
    );
  });

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery('');

    // Automatically fill the country code in the phone number box
    // Strip previous leading country code if any, keep digits
    const cleanDigits = value.replace(/^\+\d+[\s-]*/, '').replace(/[^\d]/g, '');
    if (cleanDigits) {
      onChange(`${country.code} ${cleanDigits}`);
    } else {
      onChange(`${country.code} `);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex gap-2">
        {/* Country Selector Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="shrink-0 inline-flex items-center gap-1.5 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
          title="Click to select country code"
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="font-mono text-slate-900">{selectedCountry.code}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Main Phone Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Phone className="h-4 w-4" />
          </div>
          <input
            id={id}
            type="tel"
            required={required}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Searchable Country Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Search Input Box */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Type country name (e.g. India, UK, USA)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Scrollable Country List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching country found
              </div>
            ) : (
              filteredCountries.map((country) => {
                const isSelected = selectedCountry.iso === country.iso && selectedCountry.code === country.code;
                return (
                  <button
                    key={`${country.iso}-${country.code}`}
                    type="button"
                    onClick={() => handleSelectCountry(country)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/80 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base leading-none shrink-0">{country.flag}</span>
                      <span className="truncate">{country.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="font-mono text-[11px] text-slate-500 font-semibold">{country.code}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </div>
      )}
    </div>
  );
}
