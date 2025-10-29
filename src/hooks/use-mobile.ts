import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Função para verificar se é mobile
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px é o breakpoint comum para tablet/mobile
    };

    // Verificar inicialmente
    checkIsMobile();

    // Adicionar listener para redimensionamento
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
}