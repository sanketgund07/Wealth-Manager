import React from 'react';

interface LogoProps {
  className?: string;
}

export const IciciLogo: React.FC<LogoProps> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="ICICI Bank Logo"
  >
    <rect width="40" height="40" rx="10" fill="#B02A30" />
    <path
      d="M11 28.5C11 21.8 15.8 14.5 24.5 11.2C21.8 15.1 20.8 19.6 21.5 23.4C24.2 21.1 26.8 17.6 29 13.5C29.4 20.6 25.4 27.2 18.6 29.4C15.8 30.3 13 29.8 11 28.5Z"
      fill="#F37021"
    />
    <circle cx="24.5" cy="11.2" r="2.2" fill="#FFF7ED" />
  </svg>
);

export const HdfcLogo: React.FC<LogoProps> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="HDFC Bank Logo"
  >
    <rect width="40" height="40" rx="10" fill="#004C8F" />
    <rect x="8" y="8" width="24" height="24" rx="2" fill="#ED1C24" />
    <rect x="13" y="13" width="14" height="14" fill="#FFFFFF" />
    <rect x="16.2" y="16.2" width="7.6" height="7.6" fill="#004C8F" />
    <rect x="18.6" y="8" width="2.8" height="24" fill="#FFFFFF" />
    <rect x="8" y="18.6" width="24" height="2.8" fill="#FFFFFF" />
    <rect x="16.5" y="16.5" width="7" height="7" fill="#004C8F" />
  </svg>
);

export const Mt5Logo: React.FC<LogoProps> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="MT5 Trading Capital"
  >
    <rect width="40" height="40" rx="10" fill="#0F766E" />
    <path
      d="M11 27V18M11 18L15.5 22L20 14L24.5 19.5L29 12"
      stroke="#5EEAD4"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="10" y="23" width="3" height="6" rx="1" fill="#FDE68A" />
    <rect x="18.5" y="18" width="3" height="11" rx="1" fill="#99F6E4" />
    <rect x="27" y="15" width="3" height="14" rx="1" fill="#FDE68A" />
  </svg>
);

export const InvestmentLogo: React.FC<LogoProps> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Investments FD & PF"
  >
    <rect width="40" height="40" rx="10" fill="#92400E" />
    <path
      d="M20 9L30 14.5V17H10V14.5L20 9Z"
      fill="#FDE68A"
    />
    <rect x="12" y="19" width="3" height="9" rx="1" fill="#FEF3C7" />
    <rect x="18.5" y="19" width="3" height="9" rx="1" fill="#FEF3C7" />
    <rect x="25" y="19" width="3" height="9" rx="1" fill="#FEF3C7" />
    <rect x="10" y="29" width="20" height="2.5" rx="1" fill="#F59E0B" />
  </svg>
);

export const BankLogoBadge: React.FC<{ bankId: 'icici' | 'hdfc'; className?: string }> = ({
  bankId,
  className = 'w-8 h-8',
}) => {
  return bankId === 'icici' ? (
    <IciciLogo className={className} />
  ) : (
    <HdfcLogo className={className} />
  );
};
